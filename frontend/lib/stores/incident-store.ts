import { create } from "zustand";
import type { Vector3 } from "./factory-store";

/**
 * 사고 유형 enum
 */
export type IncidentType =
  | "ENTANGLEMENT" // 끼임
  | "FALL" // 전도/넘어짐
  | "COLLISION" // 충돌
  | "FIRE" // 화재
  | "ELECTRIC_SHOCK" // 감전
  | "OTHER"; // 기타

/**
 * 사고 정보 타입
 */
export interface Incident {
  id: string;
  factoryId: string;
  type: IncidentType;
  severity: number; // 1-5
  position: Vector3;
  description?: string;
  isResolved: boolean;
  detectedCCTVIds: string[];
  timestamp: string;
  resolvedAt?: string;
}

/**
 * 실시간 알림 타입
 */
export interface IncidentAlert {
  id: string;
  incident: Incident;
  isRead: boolean;
  createdAt: string;
}

/**
 * 사고 상태 스토어 타입
 */
interface IncidentState {
  // 사고 목록
  incidents: Incident[];

  // 현재 발생 중인 사고 (미해결)
  activeIncidents: Incident[];

  // 실시간 알림 목록
  alerts: IncidentAlert[];

  // 읽지 않은 알림 수
  unreadCount: number;

  // 현재 선택된 사고
  selectedIncident: Incident | null;

  // 로딩 상태
  isLoading: boolean;

  // 에러 상태
  error: string | null;

  // 액션
  setIncidents: (incidents: Incident[]) => void;
  addIncident: (incident: Incident) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  resolveIncident: (id: string) => void;
  selectIncident: (incident: Incident | null) => void;
  addAlert: (incident: Incident) => void;
  markAlertAsRead: (alertId: string) => void;
  markAllAlertsAsRead: () => void;
  clearAlerts: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// 초기 상태
const initialState = {
  incidents: [],
  activeIncidents: [],
  alerts: [],
  unreadCount: 0,
  selectedIncident: null,
  isLoading: false,
  error: null,
};

/**
 * 사고 상태 관리 스토어
 * 사고 목록, 실시간 알림 관리
 */
export const useIncidentStore = create<IncidentState>((set, get) => ({
  ...initialState,

  // 사고 목록 설정
  setIncidents: (incidents) =>
    set({
      incidents,
      activeIncidents: incidents.filter((i) => !i.isResolved),
    }),

  // 사고 추가 (실시간 이벤트용)
  addIncident: (incident) =>
    set((state) => {
      const newIncidents = [incident, ...state.incidents];
      return {
        incidents: newIncidents,
        activeIncidents: incident.isResolved
          ? state.activeIncidents
          : [incident, ...state.activeIncidents],
      };
    }),

  // 사고 업데이트
  updateIncident: (id, updates) =>
    set((state) => {
      const updatedIncidents = state.incidents.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      );
      return {
        incidents: updatedIncidents,
        activeIncidents: updatedIncidents.filter((i) => !i.isResolved),
        selectedIncident:
          state.selectedIncident?.id === id
            ? { ...state.selectedIncident, ...updates }
            : state.selectedIncident,
      };
    }),

  // 사고 해결 처리
  resolveIncident: (id) => {
    const { updateIncident } = get();
    updateIncident(id, {
      isResolved: true,
      resolvedAt: new Date().toISOString(),
    });
  },

  // 사고 선택
  selectIncident: (selectedIncident) => set({ selectedIncident }),

  // 알림 추가
  addAlert: (incident) =>
    set((state) => {
      const newAlert: IncidentAlert = {
        id: `alert-${incident.id}-${Date.now()}`,
        incident,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      return {
        alerts: [newAlert, ...state.alerts].slice(0, 100), // 최대 100개 유지
        unreadCount: state.unreadCount + 1,
      };
    }),

  // 알림 읽음 처리
  markAlertAsRead: (alertId) =>
    set((state) => {
      const alert = state.alerts.find((a) => a.id === alertId);
      if (!alert || alert.isRead) return state;

      return {
        alerts: state.alerts.map((a) =>
          a.id === alertId ? { ...a, isRead: true } : a
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),

  // 모든 알림 읽음 처리
  markAllAlertsAsRead: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, isRead: true })),
      unreadCount: 0,
    })),

  // 알림 초기화
  clearAlerts: () => set({ alerts: [], unreadCount: 0 }),

  // 로딩 상태 설정
  setLoading: (isLoading) => set({ isLoading }),

  // 에러 상태 설정
  setError: (error) => set({ error }),

  // 상태 초기화
  reset: () => set(initialState),
}));
