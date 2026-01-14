import { create } from "zustand";
import type { Vector3 } from "./factory-store";

/**
 * CCTV 설정 타입
 */
export interface CCTVConfig {
  id: string;
  factoryId: string;
  name: string;
  position: Vector3;
  rotation: Vector3;
  fov: number;
  isActive: boolean;
  isAccident: boolean; // 사고 감지 플래그
}

/**
 * CCTV 상태 스토어 타입
 */
interface CCTVState {
  // CCTV 목록
  cctvList: CCTVConfig[];

  // 현재 선택된 CCTV
  selectedCCTV: CCTVConfig | null;

  // 전체 화면 CCTV ID
  fullscreenCCTVId: string | null;

  // 로딩 상태
  isLoading: boolean;

  // 에러 상태
  error: string | null;

  // 액션
  setCCTVList: (list: CCTVConfig[]) => void;
  addCCTV: (cctv: CCTVConfig) => void;
  updateCCTV: (id: string, updates: Partial<CCTVConfig>) => void;
  removeCCTV: (id: string) => void;
  selectCCTV: (cctv: CCTVConfig | null) => void;
  setFullscreenCCTV: (id: string | null) => void;
  setAccidentFlag: (id: string, isAccident: boolean) => void;
  clearAllAccidents: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// 초기 상태
const initialState = {
  cctvList: [],
  selectedCCTV: null,
  fullscreenCCTVId: null,
  isLoading: false,
  error: null,
};

/**
 * CCTV 상태 관리 스토어
 * CCTV 설정, 선택 상태, 사고 플래그 관리
 */
export const useCCTVStore = create<CCTVState>((set) => ({
  ...initialState,

  // CCTV 목록 설정
  setCCTVList: (cctvList) => set({ cctvList }),

  // CCTV 추가
  addCCTV: (cctv) =>
    set((state) => ({ cctvList: [...state.cctvList, cctv] })),

  // CCTV 업데이트
  updateCCTV: (id, updates) =>
    set((state) => ({
      cctvList: state.cctvList.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
      selectedCCTV:
        state.selectedCCTV?.id === id
          ? { ...state.selectedCCTV, ...updates }
          : state.selectedCCTV,
    })),

  // CCTV 삭제
  removeCCTV: (id) =>
    set((state) => ({
      cctvList: state.cctvList.filter((c) => c.id !== id),
      selectedCCTV: state.selectedCCTV?.id === id ? null : state.selectedCCTV,
      fullscreenCCTVId:
        state.fullscreenCCTVId === id ? null : state.fullscreenCCTVId,
    })),

  // CCTV 선택
  selectCCTV: (selectedCCTV) => set({ selectedCCTV }),

  // 전체 화면 설정
  setFullscreenCCTV: (fullscreenCCTVId) => set({ fullscreenCCTVId }),

  // 사고 플래그 설정 (실시간 이벤트용)
  setAccidentFlag: (id, isAccident) =>
    set((state) => ({
      cctvList: state.cctvList.map((c) =>
        c.id === id ? { ...c, isAccident } : c
      ),
    })),

  // 모든 사고 플래그 초기화
  clearAllAccidents: () =>
    set((state) => ({
      cctvList: state.cctvList.map((c) => ({ ...c, isAccident: false })),
    })),

  // 로딩 상태 설정
  setLoading: (isLoading) => set({ isLoading }),

  // 에러 상태 설정
  setError: (error) => set({ error }),

  // 상태 초기화
  reset: () => set(initialState),
}));
