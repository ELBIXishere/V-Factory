/**
 * 멀티뷰 렌더러
 * 여러 CCTV 카메라의 뷰를 Off-screen 렌더링하여 텍스처로 출력
 */

import * as THREE from "three";
import { CCTVCamera, CCTVCameraConfig } from "./cctv-camera";
import { SceneManager } from "./scene-manager";

/**
 * 렌더 타겟 정보
 */
interface RenderTargetInfo {
  // CCTV ID
  cctvId: string;
  // WebGL 렌더 타겟
  renderTarget: THREE.WebGLRenderTarget;
  // 출력용 캔버스
  canvas: HTMLCanvasElement;
  // 캔버스 2D 컨텍스트
  context: CanvasRenderingContext2D;
  // 픽셀 버퍼 (텍스처 읽기용)
  pixelBuffer: Uint8Array;
}

/**
 * CCTV 뷰 데이터
 */
export interface CCTVViewData {
  // CCTV ID
  id: string;
  // CCTV 이름
  name: string;
  // 렌더링된 이미지 캔버스
  canvas: HTMLCanvasElement;
  // 활성화 상태
  isActive: boolean;
  // 사고 상태
  isAccident: boolean;
  // 타임스탬프
  timestamp: number;
}

/**
 * 멀티뷰 렌더러 설정
 */
export interface MultiViewRendererOptions {
  // SceneManager 인스턴스
  sceneManager: SceneManager;
  // 기본 렌더 타겟 해상도
  defaultResolution?: number;
  // 프레임당 최대 렌더링 카메라 수
  maxCamerasPerFrame?: number;
}

/**
 * 멀티뷰 렌더러 클래스
 * 여러 CCTV 카메라의 뷰를 관리하고 렌더링
 */
export class MultiViewRenderer {
  // SceneManager 참조
  private sceneManager: SceneManager;

  // CCTV 카메라 맵
  private cameras: Map<string, CCTVCamera> = new Map();

  // 렌더 타겟 맵
  private renderTargets: Map<string, RenderTargetInfo> = new Map();

  // 설정
  private defaultResolution: number;
  private maxCamerasPerFrame: number;

  // 렌더링 순서 인덱스 (라운드 로빈)
  private renderIndex: number = 0;

  // 렌더링 활성화 상태
  private isRendering: boolean = false;

  // 뷰 데이터 콜백
  private onViewUpdate?: (views: CCTVViewData[]) => void;

  constructor(options: MultiViewRendererOptions) {
    this.sceneManager = options.sceneManager;
    this.defaultResolution = options.defaultResolution ?? 512;
    this.maxCamerasPerFrame = options.maxCamerasPerFrame ?? 4;
  }

  /**
   * CCTV 카메라 추가
   */
  addCamera(config: CCTVCameraConfig): CCTVCamera {
    // 이미 존재하면 제거 후 재생성
    if (this.cameras.has(config.id)) {
      this.removeCamera(config.id);
    }

    // 카메라 생성
    const camera = new CCTVCamera(config);
    this.cameras.set(config.id, camera);

    // 씬에 헬퍼 추가
    this.sceneManager.addObject(camera.getHelper());

    // 렌더 타겟 생성
    this.createRenderTarget(config.id, config.resolution ?? this.defaultResolution);

    console.log(`[MultiViewRenderer] Camera added: ${config.id} (${config.name})`);

    return camera;
  }

  /**
   * CCTV 카메라 제거
   */
  removeCamera(id: string): void {
    const camera = this.cameras.get(id);
    if (!camera) return;

    // 씬에서 헬퍼 제거
    this.sceneManager.removeObject(camera.getHelper());

    // 카메라 리소스 정리
    camera.dispose();
    this.cameras.delete(id);

    // 렌더 타겟 정리
    const targetInfo = this.renderTargets.get(id);
    if (targetInfo) {
      targetInfo.renderTarget.dispose();
      this.renderTargets.delete(id);
    }

    console.log(`[MultiViewRenderer] Camera removed: ${id}`);
  }

  /**
   * 렌더 타겟 생성
   */
  private createRenderTarget(cctvId: string, resolution: number): void {
    // WebGL 렌더 타겟 생성
    const renderTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    // 출력용 캔버스 생성
    const canvas = document.createElement("canvas");
    canvas.width = resolution;
    canvas.height = resolution;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to create 2D context for CCTV canvas");
    }

    // 픽셀 버퍼 생성
    const pixelBuffer = new Uint8Array(resolution * resolution * 4);

    this.renderTargets.set(cctvId, {
      cctvId,
      renderTarget,
      canvas,
      context,
      pixelBuffer,
    });
  }

  /**
   * 카메라 가져오기
   */
  getCamera(id: string): CCTVCamera | undefined {
    return this.cameras.get(id);
  }

  /**
   * 모든 카메라 가져오기
   */
  getAllCameras(): CCTVCamera[] {
    return Array.from(this.cameras.values());
  }

  /**
   * 모든 카메라 ID 가져오기
   */
  getCameraIds(): string[] {
    return Array.from(this.cameras.keys());
  }

  /**
   * 카메라 설정 업데이트
   */
  updateCamera(id: string, updates: Partial<CCTVCameraConfig>): void {
    const camera = this.cameras.get(id);
    if (!camera) return;

    if (updates.position) {
      camera.setPosition(updates.position.x, updates.position.y, updates.position.z);
    }
    if (updates.target) {
      camera.setTarget(updates.target.x, updates.target.y, updates.target.z);
    }
    if (updates.fov !== undefined) {
      camera.setFOV(updates.fov);
    }
    if (updates.isActive !== undefined) {
      camera.setActive(updates.isActive);
    }
    if (updates.isAccident !== undefined) {
      camera.setAccident(updates.isAccident);
    }
  }

  /**
   * 모든 뷰 렌더링
   */
  renderAllViews(): CCTVViewData[] {
    const views: CCTVViewData[] = [];
    const renderer = this.sceneManager.renderer;
    const scene = this.sceneManager.scene;

    // 현재 렌더러 크기 저장
    const originalSize = renderer.getSize(new THREE.Vector2());

    // 활성화된 카메라만 렌더링
    const activeCameras = Array.from(this.cameras.values()).filter(
      (cam) => cam.isActive
    );

    // 렌더링할 카메라 선택 (maxCamerasPerFrame 제한)
    const camerasToRender = activeCameras.slice(
      0,
      Math.min(activeCameras.length, this.maxCamerasPerFrame)
    );

    for (const camera of camerasToRender) {
      const targetInfo = this.renderTargets.get(camera.id);
      if (!targetInfo) continue;

      const resolution = targetInfo.renderTarget.width;

      // 카메라 헬퍼 숨기기 (자기 자신 안 보이게)
      const helper = camera.getHelper();
      const wasVisible = helper.visible;
      helper.visible = false;

      // 렌더러 크기 조정
      renderer.setSize(resolution, resolution, false);
      
      // 메인 캔버스에 직접 렌더링 (renderTarget 사용 안 함)
      renderer.setRenderTarget(null);
      renderer.render(scene, camera.getCamera());

      // 헬퍼 복원
      helper.visible = wasVisible;

      // renderer.domElement를 CCTV 캔버스로 복사
      try {
        // 렌더러가 실제로 렌더링했는지 확인
        if (!renderer.domElement || renderer.domElement.width === 0 || renderer.domElement.height === 0) {
          console.warn(`[MultiViewRenderer] ${camera.id}: renderer.domElement가 유효하지 않음`);
          continue;
        }

        targetInfo.context.drawImage(
          renderer.domElement,
          0,
          0,
          resolution,
          resolution,
          0,
          0,
          targetInfo.canvas.width,
          targetInfo.canvas.height
        );

        // 디버깅: 첫 렌더링 시 확인
        if (this.renderFrameCount === 0) {
          const imageData = targetInfo.context.getImageData(0, 0, Math.min(10, targetInfo.canvas.width), Math.min(10, targetInfo.canvas.height));
          const hasPixels = imageData.data.some((v, i) => i % 4 !== 3 && v !== 0);
          console.log(`[MultiViewRenderer] ${camera.id}: drawImage 완료, hasPixels: ${hasPixels}`);
        }
      } catch (error) {
        console.error(`[MultiViewRenderer] drawImage error for ${camera.id}:`, error);
        continue; // 에러 발생 시 이 카메라는 스킵
      }

      // 뷰 데이터 생성
      const viewData = {
        id: camera.id,
        name: camera.name,
        canvas: targetInfo.canvas,
        isActive: camera.isActive,
        isAccident: camera.isAccident,
        timestamp: Date.now(),
      };
      
      views.push(viewData);
    }

    // 렌더러 크기 복원
    renderer.setSize(originalSize.x, originalSize.y, false);

    return views;
  }

  /**
   * 텍스처를 캔버스로 복사
   * @param targetInfo 렌더 타겟 정보
   * @param renderer Three.js 렌더러 (현재 활성화된 RenderTarget이 있어야 함)
   * @returns 성공 여부 (true: 성공, false: 빈 데이터 또는 실패)
   */
  private copyTextureToCanvas(targetInfo: RenderTargetInfo, renderer: THREE.WebGLRenderer): boolean {
    const { renderTarget, canvas, context, pixelBuffer, cctvId } = targetInfo;

    try {
      // 렌더러 타입 확인 (readRenderTargetPixels는 WebGL 렌더러에서만 작동)
      if (!(renderer instanceof THREE.WebGLRenderer)) {
        if (!this.pixelWarningLogged.has(cctvId)) {
          console.warn(`[MultiViewRenderer] ${cctvId}: WebGL 렌더러가 아닙니다. readRenderTargetPixels를 사용할 수 없습니다. 렌더러 타입: ${renderer.constructor.name}`);
          this.pixelWarningLogged.add(cctvId);
        }
        return false;
      }

      // 렌더 타겟 재설정 (안전성 강화)
      renderer.setRenderTarget(renderTarget);
      
      // 렌더 타겟에서 픽셀 읽기
      renderer.readRenderTargetPixels(
        renderTarget,
        0,
        0,
        renderTarget.width,
        renderTarget.height,
        pixelBuffer
      );

      // 픽셀 데이터 검증 (빈 데이터 처리)
      const nonZeroCount = pixelBuffer.filter(v => v !== 0).length;
      if (nonZeroCount === 0) {
        // 첫 번째 경고만 로그 (반복 로그 방지)
        if (!this.pixelWarningLogged.has(cctvId)) {
          console.warn(`[MultiViewRenderer] ${cctvId}: 픽셀 데이터가 비어있습니다. 렌더링이 완료되지 않았을 수 있습니다. 이전 프레임 캔버스를 유지합니다.`);
          this.pixelWarningLogged.add(cctvId);
        }
        // 빈 데이터일 때도 false 반환 (이전 캔버스 유지)
        return false;
      }

      // 성공한 경우 경고 플래그 제거 (재시도 시 로그 가능하도록)
      if (this.pixelWarningLogged.has(cctvId)) {
        console.log(`[MultiViewRenderer] ${cctvId}: 픽셀 데이터 복구됨`);
        this.pixelWarningLogged.delete(cctvId);
      }

      // 디버그: 첫 번째 성공 시 픽셀 데이터 확인
      if (!this.pixelSuccessLogged.has(cctvId)) {
        console.log(`[MultiViewRenderer] ${cctvId}: 픽셀 데이터 읽기 성공, total=${pixelBuffer.length}, nonZero=${nonZeroCount}`);
        this.pixelSuccessLogged.add(cctvId);
      }

      // ImageData 생성
      const imageData = new ImageData(
        new Uint8ClampedArray(pixelBuffer),
        renderTarget.width,
        renderTarget.height
      );

      // 캔버스에 그리기 (Y축 뒤집기)
      context.save();
      context.scale(1, -1);
      context.putImageData(imageData, 0, -renderTarget.height);
      context.restore();
      
      // 성공 시 true 반환
      return true;
    } catch (error) {
      console.error(`[MultiViewRenderer] ${cctvId}: copyTextureToCanvas 에러:`, error);
      return false; // 에러 시 false 반환
    }
  }
  
  // 카메라별 로그 플래그 관리
  private pixelWarningLogged = new Set<string>(); // 빈 데이터 경고 로그
  private pixelSuccessLogged = new Set<string>(); // 성공 로그

  /**
   * 특정 카메라의 뷰만 렌더링
   * renderAllViews()와 동일한 방식으로 메인 캔버스에 직접 렌더링
   */
  renderSingleView(id: string): CCTVViewData | null {
    const camera = this.cameras.get(id);
    const targetInfo = this.renderTargets.get(id);

    if (!camera || !targetInfo || !camera.isActive) {
      return null;
    }

    const renderer = this.sceneManager.renderer;
    const scene = this.sceneManager.scene;

    // 현재 렌더러 크기 저장
    const originalSize = renderer.getSize(new THREE.Vector2());
    const resolution = targetInfo.renderTarget.width;

    // 카메라 헬퍼 숨기기 (자기 자신 안 보이게)
    const helper = camera.getHelper();
    const wasVisible = helper.visible;
    helper.visible = false;

    // 렌더러 크기 조정
    renderer.setSize(resolution, resolution, false);
    
    // 메인 캔버스에 직접 렌더링 (renderAllViews와 동일한 방식)
    renderer.setRenderTarget(null);
    renderer.render(scene, camera.getCamera());

    // 헬퍼 복원
    helper.visible = wasVisible;

    // renderer.domElement를 CCTV 캔버스로 복사 (renderAllViews와 동일한 방식)
    targetInfo.context.drawImage(
      renderer.domElement,
      0,
      0,
      resolution,
      resolution,
      0,
      0,
      targetInfo.canvas.width,
      targetInfo.canvas.height
    );

    // 렌더러 크기 복원
    renderer.setSize(originalSize.x, originalSize.y, false);

    const viewData = {
      id: camera.id,
      name: camera.name,
      canvas: targetInfo.canvas,
      isActive: camera.isActive,
      isAccident: camera.isAccident,
      timestamp: Date.now(),
    };

    return viewData;
  }

  /**
   * 렌더 콜백 시작 (SceneManager의 애니메이션 루프에 연결)
   */
  startRendering(onViewUpdate: (views: CCTVViewData[]) => void): void {
    if (this.isRendering) {
      console.warn("[MultiViewRenderer] Already rendering");
      return;
    }

    this.isRendering = true;
    this.onViewUpdate = onViewUpdate;

    // 렌더 콜백 등록
    this.sceneManager.addRenderCallback(this.renderCallback);

    console.log("[MultiViewRenderer] Rendering started");
  }

  /**
   * 렌더 콜백 중지
   */
  stopRendering(): void {
    if (!this.isRendering) return;

    this.isRendering = false;
    this.sceneManager.removeRenderCallback(this.renderCallback);
    this.onViewUpdate = undefined;

    console.log("[MultiViewRenderer] Rendering stopped");
  }

  /**
   * 렌더 콜백 함수
   */
  private renderCallback = (): void => {
    if (!this.isRendering || !this.onViewUpdate) {
      return;
    }

    try {
      const views = this.renderAllViews();
      this.renderFrameCount++;
      
      // 디버깅: 첫 렌더링 또는 주기적으로 로그
      if (this.renderFrameCount === 1 || this.renderFrameCount % 60 === 0) {
        console.log(`[MultiViewRenderer] renderCallback: 프레임 ${this.renderFrameCount}, 뷰 수: ${views.length}`);
        if (views.length > 0) {
          console.log(`[MultiViewRenderer] 첫 번째 뷰:`, {
            id: views[0].id,
            hasCanvas: !!views[0].canvas,
            canvasSize: views[0].canvas ? `${views[0].canvas.width}x${views[0].canvas.height}` : 'none',
          });
        }
      }
      
      this.onViewUpdate(views);
    } catch (error) {
      console.error("[MultiViewRenderer] renderCallback 에러:", error);
    }
  };
  
  private renderFrameCount: number = 0;
  
  private hasLoggedFirstRender = false;

  /**
   * 카메라 헬퍼 전체 가시성 설정
   */
  setAllHelpersVisible(visible: boolean): void {
    for (const camera of this.cameras.values()) {
      camera.setHelperVisible(visible);
    }
  }

  /**
   * 특정 카메라의 캔버스 가져오기
   */
  getCanvas(id: string): HTMLCanvasElement | null {
    return this.renderTargets.get(id)?.canvas ?? null;
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.stopRendering();

    // 모든 카메라 제거
    for (const id of this.cameras.keys()) {
      this.removeCamera(id);
    }

    this.cameras.clear();
    this.renderTargets.clear();

    console.log("[MultiViewRenderer] Disposed");
  }
}

/**
 * 멀티뷰 렌더러 인스턴스 생성 헬퍼
 */
export function createMultiViewRenderer(
  options: MultiViewRendererOptions
): MultiViewRenderer {
  return new MultiViewRenderer(options);
}

export default MultiViewRenderer;
