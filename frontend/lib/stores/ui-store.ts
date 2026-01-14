import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * UI 상태 스토어 타입 정의
 */
interface UIState {
  // 사이드바 상태
  isSidebarOpen: boolean;

  // 테마 설정
  theme: "dark" | "light";

  // CCTV 그리드 레이아웃
  cctvGridLayout: "2x2" | "3x3" | "4x4";

  // 알림 설정
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  minAlertSeverity: number;

  // 액션
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  setTheme: (theme: "dark" | "light") => void;
  setCctvGridLayout: (layout: "2x2" | "3x3" | "4x4") => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setMinAlertSeverity: (severity: number) => void;
}

/**
 * UI 상태 관리 스토어
 * 사이드바, 테마, 알림 설정 등 UI 관련 전역 상태 관리
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // 초기 상태
      isSidebarOpen: false,
      theme: "dark",
      cctvGridLayout: "2x2",
      notificationsEnabled: true,
      soundEnabled: true,
      minAlertSeverity: 1,

      // 사이드바 액션
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      openSidebar: () => set({ isSidebarOpen: true }),
      closeSidebar: () => set({ isSidebarOpen: false }),

      // 테마 액션
      setTheme: (theme) => set({ theme }),

      // CCTV 그리드 액션
      setCctvGridLayout: (cctvGridLayout) => set({ cctvGridLayout }),

      // 알림 설정 액션
      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setMinAlertSeverity: (minAlertSeverity) => set({ minAlertSeverity }),
    }),
    {
      name: "v-factory-ui-settings",
      // 사이드바 상태는 세션 간에 유지하지 않음
      partialize: (state) => ({
        theme: state.theme,
        cctvGridLayout: state.cctvGridLayout,
        notificationsEnabled: state.notificationsEnabled,
        soundEnabled: state.soundEnabled,
        minAlertSeverity: state.minAlertSeverity,
      }),
    }
  )
);
