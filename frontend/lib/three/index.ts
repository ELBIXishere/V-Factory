/**
 * Three.js 유틸리티 모듈 진입점
 */

// WebGPU 유틸리티
export {
  checkWebGPUSupport,
  getRendererType,
  resetWebGPUCache,
  logWebGPUStatus,
  type RendererType,
} from "./webgpu-utils";

// 씬 관리자
export {
  SceneManager,
  createSceneManager,
  type SceneManagerOptions,
} from "./scene-manager";

// 모델 로더
export {
  ModelLoader,
  loadModel,
  findMeshByName,
  getModelBoundingBox,
  normalizeModelSize,
  type LoadingProgress,
  type LoadedModel,
  type ModelLoaderOptions,
} from "./model-loader";

// CCTV 카메라
export {
  CCTVCamera,
  createDefaultCCTVCameras,
  type CCTVCameraConfig,
} from "./cctv-camera";

// 멀티뷰 렌더러
export {
  MultiViewRenderer,
  createMultiViewRenderer,
  type CCTVViewData,
  type MultiViewRendererOptions,
} from "./multi-view-renderer";

// 후처리 이펙트
export {
  AlertEffectPass,
  OutlineEffectPass,
  type AlertEffectOptions,
  type OutlineEffectOptions,
} from "./effects";