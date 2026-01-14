import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { incidentApi } from "../client";
import { useIncidentStore } from "@/lib/stores/incident-store";
import { useCCTVStore } from "@/lib/stores/cctv-store";
import type {
  IncidentResponse,
  CreateIncidentRequest,
  IncidentListParams,
  IncidentSSEEvent,
  IncidentType,
} from "../types";

// 사고 유형 라벨 매핑
const INCIDENT_TYPE_LABELS: Record<IncidentType, { label: string; icon: string }> = {
  ENTANGLEMENT: { label: "끼임 사고", icon: "⚙️" },
  FALL: { label: "전도 사고", icon: "🚶" },
  COLLISION: { label: "충돌 사고", icon: "💥" },
  FIRE: { label: "화재 발생", icon: "🔥" },
  ELECTRIC_SHOCK: { label: "감전 사고", icon: "⚡" },
  OTHER: { label: "기타 사고", icon: "⚠️" },
};

// 심각도별 스타일 매핑
const SEVERITY_STYLES: Record<number, { label: string; duration: number }> = {
  1: { label: "경미", duration: 3000 },
  2: { label: "주의", duration: 4000 },
  3: { label: "경고", duration: 5000 },
  4: { label: "위험", duration: 6000 },
  5: { label: "심각", duration: 8000 },
};

// 쿼리 키 상수
const QUERY_KEYS = {
  incidents: (params?: IncidentListParams) => ["incidents", params] as const,
  incident: (id: string) => ["incidents", id] as const,
};

/**
 * 사고 목록 조회 훅
 */
export function useIncidents(params?: IncidentListParams) {
  return useQuery<IncidentResponse[]>({
    queryKey: QUERY_KEYS.incidents(params),
    queryFn: () => {
      console.log("[useIncidents] 사고 목록 조회 시작", params);
      return incidentApi.getIncidents(params);
    },
    // React Query v5에서는 onError, onSuccess가 제거되었습니다. 에러는 컴포넌트에서 처리합니다.
  });
}

/**
 * 사고 상세 조회 훅
 */
export function useIncident(id: string) {
  return useQuery<IncidentResponse>({
    queryKey: QUERY_KEYS.incident(id),
    queryFn: () => incidentApi.getIncident(id),
    enabled: !!id,
  });
}

/**
 * 사고 발생 트리거 훅 (기본)
 */
export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation<IncidentResponse, Error, CreateIncidentRequest>({
    mutationFn: (data) => incidentApi.createIncident(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

/**
 * 사고 발생 트리거 훅 (CCTV 플래그 연동)
 * 사고 생성 후 자동으로 관련 CCTV에 사고 플래그 설정
 */
export function useCreateIncidentWithCCTV() {
  const queryClient = useQueryClient();
  const { addIncident, addAlert } = useIncidentStore();
  const { setAccidentFlag } = useCCTVStore();

  return useMutation<IncidentResponse, Error, CreateIncidentRequest>({
    mutationFn: (data) => incidentApi.createIncident(data),
    onSuccess: (response) => {
      // 스토어에 사고 추가
      const incident = convertToStoreIncident(response);
      addIncident(incident);
      addAlert(incident);

      // 관련 CCTV 사고 플래그 설정
      if (response.detected_cctv_ids && response.detected_cctv_ids.length > 0) {
        response.detected_cctv_ids.forEach((cctvId) => {
          setAccidentFlag(cctvId, true);
        });
        console.log(
          `[Incident] 사고 감지 CCTV: ${response.detected_cctv_ids.join(", ")}`
        );
      } else {
        console.log("[Incident] 사고 위치 근처 CCTV 없음");
      }

      // 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

/**
 * 사고 해결 처리 훅
 * CCTV 이펙트 자동 해제 포함
 */
export function useResolveIncident() {
  const queryClient = useQueryClient();
  const { setAccidentFlag } = useCCTVStore();

  return useMutation<IncidentResponse, Error, string>({
    mutationFn: (id) => incidentApi.resolveIncident(id),
    onSuccess: (response, id) => {
      // 관련 CCTV 사고 플래그 해제
      if (response.detected_cctv_ids && response.detected_cctv_ids.length > 0) {
        response.detected_cctv_ids.forEach((cctvId) => {
          setAccidentFlag(cctvId, false);
        });
        console.log(
          `[Incident] 사고 해결 - CCTV 이펙트 해제: ${response.detected_cctv_ids.join(", ")}`
        );
      }

      // 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incident(id) });
    },
  });
}

/**
 * API 응답을 스토어 형식으로 변환
 */
function convertToStoreIncident(response: IncidentResponse) {
  return {
    id: response.id,
    factoryId: response.factory_id,
    type: response.type,
    severity: response.severity,
    // Backend 응답의 position_x, position_y, position_z를 Vector3 객체로 변환
    position: {
      x: response.position_x,
      y: response.position_y,
      z: response.position_z,
    },
    description: response.description,
    isResolved: response.is_resolved,
    detectedCCTVIds: response.detected_cctv_ids || [],
    timestamp: response.timestamp,
    resolvedAt: response.resolved_at,
  };
}

/**
 * 실시간 사고 이벤트 SSE 훅
 * Redis Pub/Sub을 통해 전송되는 실시간 이벤트 수신
 */
export function useIncidentStream() {
  const queryClient = useQueryClient();
  const { addIncident, updateIncident, addAlert } = useIncidentStore();
  const { setAccidentFlag, clearAllAccidents } = useCCTVStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // SSE 연결 함수
  const connect = useCallback(() => {
    // 기존 연결이 있으면 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const streamUrl = incidentApi.getStreamUrl();
    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    // 연결 성공
    eventSource.onopen = () => {
      console.log("[SSE] 사고 이벤트 스트림 연결됨");
      // 재연결 타이머가 있으면 정리
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    // 메시지 수신
    eventSource.onmessage = (event) => {
      try {
        const data: IncidentSSEEvent = JSON.parse(event.data);
        const incident = convertToStoreIncident(data.data);

        switch (data.event) {
          case "incident_created": {
            // 새 사고 추가
            addIncident(incident);
            addAlert(incident);
            // 관련 CCTV 사고 플래그 설정
            incident.detectedCCTVIds.forEach((cctvId) => {
              setAccidentFlag(cctvId, true);
            });
            // 쿼리 무효화
            queryClient.invalidateQueries({ queryKey: ["incidents"] });

            // 토스트 알림 표시
            const typeInfo = INCIDENT_TYPE_LABELS[incident.type as IncidentType] || { label: "사고", icon: "⚠️" };
            const severityInfo = SEVERITY_STYLES[incident.severity] || { label: `Level ${incident.severity}`, duration: 5000 };
            const position = incident.position;

            toast.error(`${typeInfo.icon} ${typeInfo.label} 발생!`, {
              description: `심각도: ${severityInfo.label} | 위치: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`,
              duration: severityInfo.duration,
              action: incident.detectedCCTVIds.length > 0
                ? {
                    label: "CCTV 보기",
                    onClick: () => {
                      // CCTV 모니터링 페이지로 이동
                      window.location.href = `/monitoring?cctv=${incident.detectedCCTVIds[0]}`;
                    },
                  }
                : undefined,
            });
            break;
          }

          case "incident_updated": {
            // 사고 정보 업데이트
            updateIncident(incident.id, incident);
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.incident(incident.id),
            });

            // 업데이트 토스트 알림
            toast.info("사고 정보가 업데이트되었습니다", {
              description: `ID: ${incident.id.slice(0, 8)}...`,
              duration: 3000,
            });
            break;
          }

          case "incident_resolved": {
            // 사고 해결 처리
            updateIncident(incident.id, { ...incident, isResolved: true });
            // 관련 CCTV 사고 플래그 해제
            incident.detectedCCTVIds.forEach((cctvId) => {
              setAccidentFlag(cctvId, false);
            });
            queryClient.invalidateQueries({ queryKey: ["incidents"] });

            // 해결 토스트 알림
            const typeInfo = INCIDENT_TYPE_LABELS[incident.type as IncidentType] || { label: "사고", icon: "✅" };
            toast.success(`${typeInfo.label} 해결됨`, {
              description: `ID: ${incident.id.slice(0, 8)}... 사고가 해결 처리되었습니다.`,
              duration: 4000,
            });
            break;
          }
        }
      } catch (error) {
        console.error("[SSE] 메시지 파싱 오류:", error);
      }
    };

    // 에러 처리 및 재연결
    eventSource.onerror = (error) => {
      console.error("[SSE] 연결 오류:", error);
      eventSource.close();

      // 5초 후 재연결 시도
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("[SSE] 재연결 시도...");
        connect();
      }, 5000);
    };
  }, [
    queryClient,
    addIncident,
    updateIncident,
    addAlert,
    setAccidentFlag,
  ]);

  // 연결 해제 함수
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    // 모든 사고 플래그 초기화
    clearAllAccidents();
  }, [clearAllAccidents]);

  // 컴포넌트 마운트/언마운트 시 연결 관리
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connect, disconnect };
}
