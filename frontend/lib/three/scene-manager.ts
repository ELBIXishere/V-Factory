/**
 * Three.js 씬 관리자
 * Scene, Camera, Renderer, Controls 등 핵심 요소 관리
 * 후처리 이펙트 (AlertEffect, OutlineEffect) 파이프라인 포함
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { checkWebGPUSupport, getRendererType } from "./webgpu-utils";
import { AlertEffectPass, AlertEffectOptions } from "./effects/AlertEffectPass";
import { OutlineEffectPass, OutlineEffectOptions } from "./effects/OutlineEffectPass";

// 씬 매니저 설정 옵션
export interface SceneManagerOptions {
  // 컨테이너 요소
  container: HTMLElement;
  // 개발 모드 (헬퍼 표시)
  debug?: boolean;
  // 배경색
  backgroundColor?: number;
  // 그림자 활성화
  enableShadows?: boolean;
  // 안티앨리어싱
  antialias?: boolean;
  // 후처리 이펙트 활성화
  enablePostProcessing?: boolean;
  // Alert Effect 옵션
  alertEffectOptions?: AlertEffectOptions;
  // Outline Effect 옵션
  outlineEffectOptions?: OutlineEffectOptions;
}

// 씬 매니저 클래스
export class SceneManager {
  // Three.js 핵심 요소
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;

  // 설정
  private container: HTMLElement;
  private debug: boolean;
  private animationId: number | null = null;
  private isInitialized: boolean = false;
  private renderCallbacks: Set<(deltaTime: number) => void> = new Set();
  private clock: THREE.Clock;

  // 씬 요소
  private floor: THREE.Mesh | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private axesHelper: THREE.AxesHelper | null = null;

  // 후처리 이펙트
  private enablePostProcessing: boolean = false;
  private composer: EffectComposer | null = null;
  private alertEffectPass: AlertEffectPass | null = null;
  private outlineEffectPass: OutlineEffectPass | null = null;

  constructor(options: SceneManagerOptions) {
    this.container = options.container;
    this.debug = options.debug ?? false;
    this.clock = new THREE.Clock();

    // Scene 생성
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(
      options.backgroundColor ?? 0x1a1a2e
    );

    // Camera 생성 (임시로 초기화, 나중에 resize에서 업데이트)
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(15, 12, 15);
    this.camera.lookAt(0, 0, 0);

    // Renderer 임시 생성 (비동기 초기화 필요)
    this.renderer = new THREE.WebGLRenderer({
      antialias: options.antialias ?? true,
      preserveDrawingBuffer: true, // CCTV 렌더링을 위해 필요
    });

    // Controls 생성
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // 바닥 아래로 가지 않도록
  }

  /**
   * 씬 매니저 비동기 초기화
   * WebGPU 지원 체크 후 적절한 렌더러 생성
   */
  async initialize(options: SceneManagerOptions): Promise<void> {
    if (this.isInitialized) {
      console.warn("[SceneManager] Already initialized");
      return;
    }

    // WebGPU 지원 체크 (현재는 정보 로깅용으로만 사용)
    const webgpuSupported = await checkWebGPUSupport();
    const rendererType = getRendererType();

    console.log(`[SceneManager] WebGPU supported: ${webgpuSupported}`);
    console.log(`[SceneManager] Using ${rendererType} renderer`);

    // 렌더러 생성 (현재는 WebGL만 사용, WebGPU는 Three.js 정식 지원 시 추가)
    // Three.js WebGPU 렌더러는 아직 실험적이고 빌드 호환성 문제가 있음
    this.renderer = new THREE.WebGLRenderer({
      antialias: options.antialias ?? true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true, // 렌더 타겟에서 픽셀 읽기를 위해 필요
    });

    // 그림자 설정
    if (options.enableShadows !== false) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // 톤 매핑 설정 (더 나은 색상 표현)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // 컨테이너에 캔버스 추가
    this.container.appendChild(this.renderer.domElement);

    // Controls 업데이트
    this.controls.dispose();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1;

    // 초기 크기 설정
    this.handleResize();

    // 리사이즈 이벤트 리스너
    window.addEventListener("resize", this.handleResize);

    // 기본 씬 요소 설정
    this.setupLighting();
    this.setupFloor();

    if (this.debug) {
      this.setupHelpers();
    }

    // 후처리 이펙트 설정
    this.enablePostProcessing = options.enablePostProcessing ?? false;
    if (this.enablePostProcessing) {
      this.setupPostProcessing(options);
    }

    this.isInitialized = true;
  }

  /**
   * 후처리 파이프라인 설정
   */
  private setupPostProcessing(options: SceneManagerOptions): void {
    // EffectComposer 생성
    this.composer = new EffectComposer(this.renderer);

    // 기본 렌더 패스
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Alert Effect Pass (비활성화 상태로 추가)
    this.alertEffectPass = new AlertEffectPass(options.alertEffectOptions);
    this.alertEffectPass.setEnabled(false);
    this.composer.addPass(this.alertEffectPass);

    // Outline Effect Pass (비활성화 상태로 추가)
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.outlineEffectPass = new OutlineEffectPass(
      new THREE.Vector2(width, height),
      options.outlineEffectOptions
    );
    this.outlineEffectPass.setEnabled(false);
    this.composer.addPass(this.outlineEffectPass);

    console.log("[SceneManager] Post-processing pipeline initialized");
  }

  /**
   * 조명 설정
   */
  private setupLighting(): void {
    // Ambient Light - 전체적인 부드러운 조명 (강도 증가)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional Light - 태양광 역할 (그림자 생성, 강도 증가)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;

    // 그림자 맵 설정
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;

    this.scene.add(directionalLight);

    // Hemisphere Light - 하늘과 땅 반사광 (강도 증가)
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x666666, 0.5);
    this.scene.add(hemisphereLight);
  }

  /**
   * 바닥(Floor) 설정
   */
  private setupFloor(): void {
    // 바닥 지오메트리 (30x30 크기)
    const floorGeometry = new THREE.PlaneGeometry(30, 30);

    // 바닥 머티리얼 - 공장 바닥 느낌
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a4a,
      roughness: 0.8,
      metalness: 0.2,
    });

    // 바닥 메쉬 생성
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2; // 수평으로 회전
    this.floor.position.y = 0;
    this.floor.receiveShadow = true;

    this.scene.add(this.floor);
  }

  /**
   * 개발용 헬퍼 설정
   */
  private setupHelpers(): void {
    // Grid Helper
    this.gridHelper = new THREE.GridHelper(30, 30, 0x444444, 0x333333);
    this.gridHelper.position.y = 0.01; // 바닥 위에 약간 띄움
    this.scene.add(this.gridHelper);

    // Axes Helper (RGB = XYZ)
    this.axesHelper = new THREE.AxesHelper(5);
    this.scene.add(this.axesHelper);
  }

  /**
   * 리사이즈 핸들러
   */
  handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 후처리 컴포저 크기 업데이트
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.outlineEffectPass) {
      this.outlineEffectPass.setSize(width, height);
    }
  };

  /**
   * 렌더 콜백 등록
   * 매 프레임마다 호출됨
   */
  addRenderCallback(callback: (deltaTime: number) => void): void {
    this.renderCallbacks.add(callback);
  }

  /**
   * 렌더 콜백 제거
   */
  removeRenderCallback(callback: (deltaTime: number) => void): void {
    this.renderCallbacks.delete(callback);
  }

  /**
   * 애니메이션 루프 시작
   */
  startAnimation(): void {
    if (this.animationId !== null) {
      console.warn("[SceneManager] Animation already running");
      return;
    }

    const animate = (): void => {
      this.animationId = requestAnimationFrame(animate);

      const deltaTime = this.clock.getDelta();

      // 등록된 콜백들 실행
      this.renderCallbacks.forEach((callback) => callback(deltaTime));

      // Controls 업데이트
      this.controls.update();

      // 렌더링 (후처리 또는 기본)
      if (this.enablePostProcessing && this.composer) {
        this.composer.render(deltaTime);
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  /**
   * 애니메이션 루프 중지
   */
  stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * 디버그 모드 토글
   */
  setDebugMode(enabled: boolean): void {
    this.debug = enabled;

    if (enabled) {
      if (!this.gridHelper) {
        this.setupHelpers();
      }
    } else {
      if (this.gridHelper) {
        this.scene.remove(this.gridHelper);
        this.gridHelper.dispose();
        this.gridHelper = null;
      }
      if (this.axesHelper) {
        this.scene.remove(this.axesHelper);
        this.axesHelper.dispose();
        this.axesHelper = null;
      }
    }
  }

  /**
   * 카메라 위치 설정
   */
  setCameraPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }

  /**
   * 카메라 타겟 설정
   */
  setCameraTarget(x: number, y: number, z: number): void {
    this.controls.target.set(x, y, z);
  }

  /**
   * 씬에 오브젝트 추가
   */
  addObject(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * 씬에서 오브젝트 제거
   */
  removeObject(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * 리소스 정리 및 해제
   */
  dispose(): void {
    // 애니메이션 중지
    this.stopAnimation();

    // 이벤트 리스너 제거
    window.removeEventListener("resize", this.handleResize);

    // 렌더 콜백 정리
    this.renderCallbacks.clear();

    // Controls 정리
    this.controls.dispose();

    // 씬 요소 정리
    if (this.floor) {
      this.floor.geometry.dispose();
      (this.floor.material as THREE.Material).dispose();
      this.scene.remove(this.floor);
    }

    if (this.gridHelper) {
      this.gridHelper.dispose();
      this.scene.remove(this.gridHelper);
    }

    if (this.axesHelper) {
      this.axesHelper.dispose();
      this.scene.remove(this.axesHelper);
    }

    // 후처리 이펙트 정리
    if (this.alertEffectPass) {
      this.alertEffectPass.dispose();
      this.alertEffectPass = null;
    }

    if (this.outlineEffectPass) {
      this.outlineEffectPass.dispose();
      this.outlineEffectPass = null;
    }

    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }

    // 렌더러 정리
    this.renderer.dispose();

    // DOM에서 캔버스 제거
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(
        this.renderer.domElement
      );
    }

    this.isInitialized = false;
  }

  // ============================================
  // 후처리 이펙트 제어 API
  // ============================================

  /**
   * 후처리 이펙트 활성화/비활성화
   */
  setPostProcessingEnabled(enabled: boolean): void {
    this.enablePostProcessing = enabled;
    console.log(`[SceneManager] Post-processing ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Alert Effect 활성화/비활성화
   */
  setAlertEffectEnabled(enabled: boolean): void {
    if (this.alertEffectPass) {
      this.alertEffectPass.setEnabled(enabled);
      console.log(`[SceneManager] Alert effect ${enabled ? "enabled" : "disabled"}`);
    }
  }

  /**
   * Alert Effect 강도 설정
   */
  setAlertEffectIntensity(intensity: number): void {
    if (this.alertEffectPass) {
      this.alertEffectPass.setIntensity(intensity);
    }
  }

  /**
   * Alert Effect 옵션 업데이트
   */
  updateAlertEffectOptions(options: Partial<AlertEffectOptions>): void {
    if (this.alertEffectPass) {
      this.alertEffectPass.updateOptions(options);
    }
  }

  /**
   * Outline Effect 활성화/비활성화
   */
  setOutlineEffectEnabled(enabled: boolean): void {
    if (this.outlineEffectPass) {
      this.outlineEffectPass.setEnabled(enabled);
      console.log(`[SceneManager] Outline effect ${enabled ? "enabled" : "disabled"}`);
    }
  }

  /**
   * Outline Effect 색상 설정
   */
  setOutlineColor(color: THREE.Color | number): void {
    if (this.outlineEffectPass) {
      this.outlineEffectPass.setOutlineColor(color);
    }
  }

  /**
   * Outline Effect 옵션 업데이트
   */
  updateOutlineEffectOptions(options: Partial<OutlineEffectOptions>): void {
    if (this.outlineEffectPass) {
      this.outlineEffectPass.updateOptions(options);
    }
  }

  /**
   * 사고 모드 설정 (Alert + Outline 동시 활성화)
   */
  setAccidentMode(enabled: boolean, intensity: number = 1.0): void {
    this.setPostProcessingEnabled(enabled);
    this.setAlertEffectEnabled(enabled);
    this.setOutlineEffectEnabled(enabled);

    if (enabled) {
      this.setAlertEffectIntensity(intensity);
    }

    console.log(`[SceneManager] Accident mode ${enabled ? "ON" : "OFF"}`);
  }

  /**
   * Alert Effect Pass 인스턴스 가져오기
   */
  getAlertEffectPass(): AlertEffectPass | null {
    return this.alertEffectPass;
  }

  /**
   * Outline Effect Pass 인스턴스 가져오기
   */
  getOutlineEffectPass(): OutlineEffectPass | null {
    return this.outlineEffectPass;
  }
}

/**
 * SceneManager 인스턴스 생성 헬퍼 함수
 */
export async function createSceneManager(
  options: SceneManagerOptions
): Promise<SceneManager> {
  const manager = new SceneManager(options);
  await manager.initialize(options);
  return manager;
}
