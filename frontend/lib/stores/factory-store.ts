import { create } from "zustand";

/**
 * 3D 위치 타입
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * 공장 정보 타입
 */
export interface Factory {
  id: string;
  name: string;
  description?: string;
  layoutJson?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * 설비 정보 타입
 */
export interface Equipment {
  id: string;
  factoryId: string;
  name: string;
  type: "CONVEYOR" | "MACHINE" | "STORAGE" | "WORKSTATION" | "OTHER";
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "ERROR";
  metadata?: Record<string, unknown>;
}

/**
 * 공장 상태 스토어 타입
 */
interface FactoryState {
  // 현재 선택된 공장
  currentFactory: Factory | null;

  // 공장 목록
  factories: Factory[];

  // 설비 목록
  equipment: Equipment[];

  // 로딩 상태
  isLoading: boolean;

  // 에러 상태
  error: string | null;

  // 액션
  setCurrentFactory: (factory: Factory | null) => void;
  setFactories: (factories: Factory[]) => void;
  addFactory: (factory: Factory) => void;
  updateFactory: (id: string, updates: Partial<Factory>) => void;
  removeFactory: (id: string) => void;
  setEquipment: (equipment: Equipment[]) => void;
  addEquipment: (equipment: Equipment) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  removeEquipment: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// 초기 상태
const initialState = {
  currentFactory: null,
  factories: [],
  equipment: [],
  isLoading: false,
  error: null,
};

/**
 * 공장 상태 관리 스토어
 * 공장 정보, 설비 데이터 관리
 */
export const useFactoryStore = create<FactoryState>((set) => ({
  ...initialState,

  // 현재 공장 설정
  setCurrentFactory: (currentFactory) => set({ currentFactory }),

  // 공장 목록 설정
  setFactories: (factories) => set({ factories }),

  // 공장 추가
  addFactory: (factory) =>
    set((state) => ({ factories: [...state.factories, factory] })),

  // 공장 업데이트
  updateFactory: (id, updates) =>
    set((state) => ({
      factories: state.factories.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
      currentFactory:
        state.currentFactory?.id === id
          ? { ...state.currentFactory, ...updates }
          : state.currentFactory,
    })),

  // 공장 삭제
  removeFactory: (id) =>
    set((state) => ({
      factories: state.factories.filter((f) => f.id !== id),
      currentFactory:
        state.currentFactory?.id === id ? null : state.currentFactory,
    })),

  // 설비 목록 설정
  setEquipment: (equipment) => set({ equipment }),

  // 설비 추가
  addEquipment: (equipment) =>
    set((state) => ({ equipment: [...state.equipment, equipment] })),

  // 설비 업데이트
  updateEquipment: (id, updates) =>
    set((state) => ({
      equipment: state.equipment.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  // 설비 삭제
  removeEquipment: (id) =>
    set((state) => ({
      equipment: state.equipment.filter((e) => e.id !== id),
    })),

  // 로딩 상태 설정
  setLoading: (isLoading) => set({ isLoading }),

  // 에러 상태 설정
  setError: (error) => set({ error }),

  // 상태 초기화
  reset: () => set(initialState),
}));
