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

      // 뷰 데이터 생성
      views.push({
        id: camera.id,
        name: camera.name,
        canvas: targetInfo.canvas,
        isActive: camera.isActive,
        isAccident: camera.isAccident,
        timestamp: Date.now(),
      });
    }

    // 렌더러 크기 복원
    renderer.setSize(originalSize.x, originalSize.y, false);

    return views;
  }

  /**
   * 텍스처를 캔버스로 복사
   */
  private copyTextureToCanvas(targetInfo: RenderTargetInfo): void {
    const { renderTarget, canvas, context, pixelBuffer, cctvId } = targetInfo;
    const renderer = this.sceneManager.renderer;

    // 렌더 타겟에서 픽셀 읽기
    renderer.readRenderTargetPixels(
      renderTarget,
      0,
      0,
      renderTarget.width,
      renderTarget.height,
      pixelBuffer
    );

    // 디버그: 첫 번째 복사 시 픽셀 데이터 확인
    if (!this.hasLoggedPixels) {
      const nonZeroCount = pixelBuffer.filter(v => v !== 0).length;
      console.log(`[MultiViewRenderer] Pixel data for ${cctvId}: total=${pixelBuffer.length}, nonZero=${nonZeroCount}`);
      if (nonZeroCount > 0) {
        this.hasLoggedPixels = true;
      }
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
  }
  
  private hasLoggedPixels = false;

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

    return {
      id: camera.id,
      name: camera.name,
      canvas: targetInfo.canvas,
      isActive: camera.isActive,
      isAccident: camera.isAccident,
      timestamp: Date.now(),
    };
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
    if (!this.isRendering || !this.onViewUpdate) return;

    const views = this.renderAllViews();
    
    // 디버그: 첫 번째 렌더링 시 로그 출력
    if (views.length > 0 && !this.hasLoggedFirstRender) {
      console.log(`[MultiViewRenderer] First render: ${views.length} views`, views.map(v => v.id));
      this.hasLoggedFirstRender = true;
    }
    
    this.onViewUpdate(views);
  };
  
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
