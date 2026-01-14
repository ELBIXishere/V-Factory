import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { factoryApi } from "../client";
import { useFactoryStore } from "@/lib/stores/factory-store";
import { useCCTVStore } from "@/lib/stores/cctv-store";
import type {
  FactoryResponse,
  CreateFactoryRequest,
  UpdateFactoryLayoutRequest,
  EquipmentResponse,
  CCTVConfigResponse,
  CreateCCTVConfigRequest,
  UpdateCCTVConfigRequest,
  FactorySSEEvent,
  CCTVSSEEvent,
} from "../types";

// 쿼리 키 상수
const QUERY_KEYS = {
  factories: ["factories"] as const,
  factory: (id: string) => ["factories", id] as const,
  equipment: (factoryId: string) => ["factories", factoryId, "equipment"] as const,
  cctvConfigs: (factoryId: string) => ["factories", factoryId, "cctv-configs"] as const,
};

/**
 * 공장 목록 조회 훅
 */
export function useFactories() {
  return useQuery<FactoryResponse[]>({
    queryKey: QUERY_KEYS.factories,
    queryFn: () => factoryApi.getFactories(),
  });
}

/**
 * 공장 상세 조회 훅
 */
export function useFactory(id: string) {
  return useQuery<FactoryResponse>({
    queryKey: QUERY_KEYS.factory(id),
    queryFn: () => factoryApi.getFactory(id),
    enabled: !!id,
  });
}

/**
 * 공장 생성 훅
 */
export function useCreateFactory() {
  const queryClient = useQueryClient();

  return useMutation<FactoryResponse, Error, CreateFactoryRequest>({
    mutationFn: (data) => factoryApi.createFactory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.factories });
    },
  });
}

/**
 * 공장 레이아웃 업데이트 훅
 */
export function useUpdateFactoryLayout(factoryId: string) {
  const queryClient = useQueryClient();

  return useMutation<FactoryResponse, Error, UpdateFactoryLayoutRequest>({
    mutationFn: (data) => factoryApi.updateFactoryLayout(factoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.factory(factoryId) });
    },
  });
}

/**
 * 공장 설비 목록 조회 훅
 */
export function useEquipment(factoryId: string) {
  return useQuery<EquipmentResponse[]>({
    queryKey: QUERY_KEYS.equipment(factoryId),
    queryFn: () => factoryApi.getEquipment(factoryId),
    enabled: !!factoryId,
  });
}

/**
 * CCTV 설정 목록 조회 훅
 */
export function useCCTVConfigs(factoryId: string) {
  return useQuery<CCTVConfigResponse[]>({
    queryKey: QUERY_KEYS.cctvConfigs(factoryId),
    queryFn: () => factoryApi.getCCTVConfigs(factoryId),
    enabled: !!factoryId,
    retry: 1, // 1번만 재시도
    retryOnMount: false, // 마운트 시 재시도 안 함
    // React Query v5에서는 onError가 제거되었습니다. 에러는 컴포넌트에서 처리합니다.
  });
}

/**
 * CCTV 설정 생성 훅
 */
export function useCreateCCTVConfig() {
  const queryClient = useQueryClient();

  return useMutation<CCTVConfigResponse, Error, CreateCCTVConfigRequest>({
    mutationFn: (data) => factoryApi.createCCTVConfig(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.cctvConfigs(variables.factory_id),
      });
    },
  });
}

/**
 * CCTV 설정 업데이트 훅
 */
export function useUpdateCCTVConfig(factoryId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    CCTVConfigResponse,
    Error,
    { id: string; data: UpdateCCTVConfigRequest }
  >({
    mutationFn: ({ id, data }) => factoryApi.updateCCTVConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.cctvConfigs(factoryId),
      });
    },
  });
}

/**
 * CCTV 설정 삭제 훅
 */
export function useDeleteCCTVConfig(factoryId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => factoryApi.deleteCCTVConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.cctvConfigs(factoryId),
      });
    },
  });
}

/**
 * 실시간 Factory 이벤트 SSE 훅
 * Redis Pub/Sub을 통해 전송되는 실시간 공장 이벤트 수신
 */
export function useFactoryStream() {
  const queryClient = useQueryClient();
  const { updateFactory, removeFactory } = useFactoryStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // SSE 연결 함수
  const connect = useCallback(() => {
    // 기존 연결이 있으면 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const streamUrl = factoryApi.getFactoryStreamUrl();
    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    // 연결 성공
    eventSource.onopen = () => {
      console.log("[SSE] 공장 이벤트 스트림 연결됨");
      reconnectAttempts.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    // 메시지 수신
    eventSource.onmessage = (event) => {
      try {
        const data: FactorySSEEvent = JSON.parse(event.data);

        switch (data.event) {
          case "factory_created":
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.factories });
            toast.info("새 공장이 추가되었습니다", {
              description: `공장명: ${data.data.name}`,
              duration: 3000,
            });
            break;

          case "factory_updated":
            updateFactory(data.data.id, data.data);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.factory(data.data.id) });
            break;

          case "layout_updated":
            updateFactory(data.data.id, data.data);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.factory(data.data.id) });
            toast.info("공장 레이아웃이 변경되었습니다", {
              description: `공장명: ${data.data.name}`,
              duration: 3000,
            });
            break;

          case "factory_deleted":
            removeFactory(data.data.id);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.factories });
            toast.warning("공장이 삭제되었습니다", {
              description: `공장명: ${data.data.name}`,
              duration: 3000,
            });
            break;
        }
      } catch (error) {
        console.error("[SSE] Factory 메시지 파싱 오류:", error);
      }
    };

    // 에러 처리 및 재연결 (지수 백오프)
    eventSource.onerror = (error) => {
      console.error("[SSE] Factory 연결 오류:", error);
      eventSource.close();

      // 지수 백오프 재연결 (최대 30초)
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`[SSE] Factory 재연결 시도... (${reconnectAttempts.current}회)`);
        connect();
      }, delay);
    };
  }, [queryClient, updateFactory, removeFactory]);

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
  }, []);

  // 컴포넌트 마운트/언마운트 시 연결 관리
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connect, disconnect };
}

/**
 * 실시간 CCTV 이벤트 SSE 훅
 * Redis Pub/Sub을 통해 전송되는 실시간 CCTV 이벤트 수신
 */
export function useCCTVStream(factoryId?: string) {
  const queryClient = useQueryClient();
  const { addCCTV, updateCCTV, removeCCTV } = useCCTVStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  // SSE 연결 함수
  const connect = useCallback(() => {
    // 기존 연결이 있으면 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const streamUrl = factoryApi.getCCTVStreamUrl();
    const eventSource = new EventSource(streamUrl);
    eventSourceRef.current = eventSource;

    // 연결 성공
    eventSource.onopen = () => {
      console.log("[SSE] CCTV 이벤트 스트림 연결됨");
      reconnectAttempts.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    // 메시지 수신
    eventSource.onmessage = (event) => {
      try {
        const data: CCTVSSEEvent = JSON.parse(event.data);

        // factoryId 필터링 (지정된 경우)
        if (factoryId && data.data.factory_id !== factoryId) {
          return;
        }

        // CCTV 데이터 변환
        const cctvConfig = {
          id: data.data.id,
          factoryId: data.data.factory_id,
          name: data.data.name,
          position: {
            x: data.data.position_x,
            y: data.data.position_y,
            z: data.data.position_z,
          },
          rotation: {
            x: data.data.rotation_x,
            y: data.data.rotation_y,
            z: data.data.rotation_z,
          },
          fov: data.data.fov,
          isActive: data.data.is_active,
          isAccident: false,
        };

        switch (data.event) {
          case "cctv_created":
            addCCTV(cctvConfig);
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.cctvConfigs(data.data.factory_id),
            });
            toast.info("새 CCTV가 추가되었습니다", {
              description: `CCTV명: ${data.data.name}`,
              duration: 3000,
            });
            break;

          case "cctv_updated":
            updateCCTV(data.data.id, cctvConfig);
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.cctvConfigs(data.data.factory_id),
            });
            break;

          case "cctv_deleted":
            removeCCTV(data.data.id);
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.cctvConfigs(data.data.factory_id),
            });
            toast.warning("CCTV가 삭제되었습니다", {
              description: `CCTV명: ${data.data.name}`,
              duration: 3000,
            });
            break;
        }
      } catch (error) {
        console.error("[SSE] CCTV 메시지 파싱 오류:", error);
      }
    };

    // 에러 처리 및 재연결 (지수 백오프)
    eventSource.onerror = (error) => {
      console.error("[SSE] CCTV 연결 오류:", error);
      eventSource.close();

      // 지수 백오프 재연결 (최대 30초)
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`[SSE] CCTV 재연결 시도... (${reconnectAttempts.current}회)`);
        connect();
      }, delay);
    };
  }, [queryClient, addCCTV, updateCCTV, removeCCTV, factoryId]);

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
  }, []);

  // 컴포넌트 마운트/언마운트 시 연결 관리
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connect, disconnect };
}
