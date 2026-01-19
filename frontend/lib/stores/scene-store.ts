import { create } from "zustand";
import type { SceneManager } from "@/lib/three/scene-manager";
import type { FactorySceneRef, NPCRef } from "@/components/three/FactoryScene";
import type { ConveyorBeltConfig } from "@/components/three/ConveyorBelt";
import type { WorkerNPCConfig } from "@/components/three/WorkerNPC";

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
export interface SceneState {
  // 씬 초기화 상태
  isInitialized: boolean;

  // 전역 SceneManager 인스턴스
  sceneManager: SceneManager | null;

  // 전역 FactoryScene ref (NPC 추가 등 제어용)
  factorySceneRef: FactorySceneRef | null;

  // 전역 NPC 참조 맵 (더블클릭 등 이벤트 처리용)
  npcRefs: Map<string, NPCRef>;
  
  // 전역 컨베이어 벨트 및 작업자 설정 (더블클릭 이벤트 처리용)
  conveyorBelts: ConveyorBeltConfig[];
  workers: WorkerNPCConfig[];

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
  setSceneManager: (manager: SceneManager | null) => void;
  getSceneManager: () => SceneManager | null;
  setFactorySceneRef: (ref: FactorySceneRef | null) => void;
  setNPCRefs: (refs: Map<string, NPCRef>) => void;
  setConveyorBelts: (belts: ConveyorBeltConfig[]) => void;
  setWorkers: (workers: WorkerNPCConfig[]) => void;
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
  sceneManager: null,
  factorySceneRef: null,
  npcRefs: new Map<string, NPCRef>(),
  conveyorBelts: [],
  workers: [],
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

  // 전역 SceneManager 설정
  setSceneManager: (sceneManager) => set({ sceneManager }),

  // 전역 SceneManager 가져오기
  getSceneManager: () => {
    const state = useSceneStore.getState();
    return state.sceneManager;
  },

  // 전역 FactoryScene ref 설정
  setFactorySceneRef: (factorySceneRef) => set({ factorySceneRef }),

  // 전역 NPC 참조 설정
  setNPCRefs: (npcRefs) => set({ npcRefs }),

  // 전역 컨베이어 벨트 설정
  setConveyorBelts: (conveyorBelts) => set({ conveyorBelts }),

  // 전역 작업자 설정
  setWorkers: (workers) => set({ workers }),

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

  // 상태 초기화 (씬 매니저는 유지)
  reset: () => {
    const currentSceneManager = useSceneStore.getState().sceneManager;
    set({ ...initialState, sceneManager: currentSceneManager });
  },
}));
