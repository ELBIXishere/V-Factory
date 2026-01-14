import { create } from "zustand";

/**
 * 3D 씬 상태 타입 정의
 */

// 카메라 설정
export interface CameraSettings {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
}

// 렌더러 정보
export interface RendererInfo {
  type: "webgpu" | "webgl";
  fps: number;
  drawCalls: number;
}

// 씬 모드
export type SceneMode = "view" | "edit" | "simulation";

/**
 * 3D 씬 상태 스토어 타입
 */
interface SceneState {
  // 씬 초기화 상태
  isInitialized: boolean;

  // 로딩 상태
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;

  // 렌더러 정보
  rendererInfo: RendererInfo;

  // 카메라 설정
  cameraSettings: CameraSettings;

  // 씬 모드
  sceneMode: SceneMode;

  // 디버그 모드
  isDebugMode: boolean;

  // 선택된 오브젝트 ID
  selectedObjectId: string | null;

  // 시뮬레이션 상태
  isSimulationRunning: boolean;
  simulationSpeed: number; // 1.0 = 정상 속도

  // 액션
  setInitialized: (isInitialized: boolean) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  setLoadingProgress: (progress: number) => void;
  setRendererInfo: (info: Partial<RendererInfo>) => void;
  setCameraSettings: (settings: Partial<CameraSettings>) => void;
  setSceneMode: (mode: SceneMode) => void;
  setDebugMode: (isDebugMode: boolean) => void;
  setSelectedObjectId: (id: string | null) => void;
  setSimulationRunning: (isRunning: boolean) => void;
  setSimulationSpeed: (speed: number) => void;
  reset: () => void;
}

// 기본 카메라 설정
const defaultCameraSettings: CameraSettings = {
  position: { x: 15, y: 12, z: 15 },
  target: { x: 0, y: 0, z: 0 },
  fov: 60,
};

// 기본 렌더러 정보
const defaultRendererInfo: RendererInfo = {
  type: "webgl",
  fps: 0,
  drawCalls: 0,
};

// 초기 상태
const initialState = {
  isInitialized: false,
  isLoading: false,
  loadingProgress: 0,
  loadingMessage: "",
  rendererInfo: defaultRendererInfo,
  cameraSettings: defaultCameraSettings,
  sceneMode: "view" as SceneMode,
  isDebugMode: false,
  selectedObjectId: null,
  isSimulationRunning: false,
  simulationSpeed: 1.0,
};

/**
 * 3D 씬 상태 관리 스토어
 * 렌더러, 카메라, 씬 모드 등 3D 관련 상태 관리
 */
export const useSceneStore = create<SceneState>((set) => ({
  ...initialState,

  // 씬 초기화 상태 설정
  setInitialized: (isInitialized) => set({ isInitialized }),

  // 로딩 상태 설정
  setLoading: (isLoading, message = "") =>
    set({
      isLoading,
      loadingMessage: message,
      loadingProgress: isLoading ? 0 : 100,
    }),

  // 로딩 진행률 설정
  setLoadingProgress: (loadingProgress) => set({ loadingProgress }),

  // 렌더러 정보 업데이트
  setRendererInfo: (info) =>
    set((state) => ({
      rendererInfo: { ...state.rendererInfo, ...info },
    })),

  // 카메라 설정 업데이트
  setCameraSettings: (settings) =>
    set((state) => ({
      cameraSettings: { ...state.cameraSettings, ...settings },
    })),

  // 씬 모드 설정
  setSceneMode: (sceneMode) => set({ sceneMode }),

  // 디버그 모드 설정
  setDebugMode: (isDebugMode) => set({ isDebugMode }),

  // 선택된 오브젝트 설정
  setSelectedObjectId: (selectedObjectId) => set({ selectedObjectId }),

  // 시뮬레이션 실행 상태 설정
  setSimulationRunning: (isSimulationRunning) => set({ isSimulationRunning }),

  // 시뮬레이션 속도 설정
  setSimulationSpeed: (simulationSpeed) =>
    set({ simulationSpeed: Math.max(0.1, Math.min(5.0, simulationSpeed)) }),

  // 상태 초기화
  reset: () => set(initialState),
}));
