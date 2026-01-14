import { getApiUrl } from "@/lib/utils";
import type { ApiError } from "./types";

/**
 * API 서비스 타입
 */
type ApiService = "factory" | "incident" | "asset";

/**
 * API 요청 옵션
 */
interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * API 에러 클래스
 */
export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

/**
 * URL에 쿼리 파라미터 추가
 */
function appendQueryParams(
  url: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) return url;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * API 클라이언트
 * 각 마이크로서비스에 대한 HTTP 요청을 처리
 */
async function apiRequest<T>(
  service: ApiService,
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const baseUrl = getApiUrl(service);
  const { body, params, headers, ...restOptions } = options;

  const url = appendQueryParams(`${baseUrl}${endpoint}`, params);

  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (fetchError) {
    // 네트워크 에러 처리 (CORS, 연결 실패 등)
    const errorMessage = fetchError instanceof Error 
      ? fetchError.message 
      : "Failed to fetch";
    console.error(`[API] Fetch error for ${service}${endpoint}:`, errorMessage);
    throw new ApiClientError(
      `네트워크 오류: ${errorMessage}. 백엔드 서버가 실행 중인지 확인하세요.`,
      0,
      "NETWORK_ERROR"
    );
  }

  // 에러 응답 처리
  if (!response.ok) {
    let errorMessage = `HTTP Error: ${response.status}`;
    let errorCode: string | undefined;

    try {
      const errorData: ApiError = await response.json();
      errorMessage = errorData.detail || errorMessage;
      errorCode = errorData.code;
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }

    throw new ApiClientError(errorMessage, response.status, errorCode);
  }

  // 204 No Content 응답 처리
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// ============================================
// Factory Core API
// ============================================

export const factoryApi = {
  /**
   * 공장 목록 조회
   */
  getFactories: () =>
    apiRequest<import("./types").FactoryResponse[]>("factory", "/factories"),

  /**
   * 공장 상세 조회
   */
  getFactory: (id: string) =>
    apiRequest<import("./types").FactoryResponse>("factory", `/factories/${id}`),

  /**
   * 공장 생성
   */
  createFactory: (data: import("./types").CreateFactoryRequest) =>
    apiRequest<import("./types").FactoryResponse>("factory", "/factories", {
      method: "POST",
      body: data,
    }),

  /**
   * 공장 레이아웃 업데이트
   */
  updateFactoryLayout: (
    id: string,
    data: import("./types").UpdateFactoryLayoutRequest
  ) =>
    apiRequest<import("./types").FactoryResponse>(
      "factory",
      `/factories/${id}/layout`,
      {
        method: "PUT",
        body: data,
      }
    ),

  /**
   * 공장 설비 목록 조회
   */
  getEquipment: (factoryId: string) =>
    apiRequest<import("./types").EquipmentResponse[]>(
      "factory",
      `/factories/${factoryId}/equipment`
    ),

  /**
   * CCTV 설정 목록 조회
   */
  getCCTVConfigs: (factoryId: string) =>
    apiRequest<import("./types").CCTVConfigResponse[]>(
      "factory",
      `/factories/${factoryId}/cctv-configs`
    ),

  /**
   * CCTV 설정 생성
   */
  createCCTVConfig: (data: import("./types").CreateCCTVConfigRequest) =>
    apiRequest<import("./types").CCTVConfigResponse>(
      "factory",
      "/cctv-configs",
      {
        method: "POST",
        body: data,
      }
    ),

  /**
   * CCTV 설정 업데이트
   */
  updateCCTVConfig: (
    id: string,
    data: import("./types").UpdateCCTVConfigRequest
  ) =>
    apiRequest<import("./types").CCTVConfigResponse>(
      "factory",
      `/cctv-configs/${id}`,
      {
        method: "PUT",
        body: data,
      }
    ),

  /**
   * CCTV 설정 삭제
   */
  deleteCCTVConfig: (id: string) =>
    apiRequest<void>("factory", `/cctv-configs/${id}`, {
      method: "DELETE",
    }),

  /**
   * Factory 이벤트 SSE 스트림 URL 반환
   */
  getFactoryStreamUrl: () => `${getApiUrl("factory")}/stream/factory`,

  /**
   * CCTV 이벤트 SSE 스트림 URL 반환
   */
  getCCTVStreamUrl: () => `${getApiUrl("factory")}/stream/cctv`,

  /**
   * 전체 이벤트 SSE 스트림 URL 반환
   */
  getAllStreamUrl: () => `${getApiUrl("factory")}/stream/all`,
};

// ============================================
// Incident Event API
// ============================================

export const incidentApi = {
  /**
   * 사고 목록 조회
   */
  getIncidents: (params?: import("./types").IncidentListParams) =>
    apiRequest<import("./types").IncidentResponse[]>(
      "incident",
      "/incidents",
      { params: params as Record<string, string | number | boolean | undefined> }
    ),

  /**
   * 사고 상세 조회
   */
  getIncident: (id: string) =>
    apiRequest<import("./types").IncidentResponse>("incident", `/incidents/${id}`),

  /**
   * 사고 발생 트리거
   */
  createIncident: (data: import("./types").CreateIncidentRequest) =>
    apiRequest<import("./types").IncidentResponse>("incident", "/incidents", {
      method: "POST",
      body: data,
    }),

  /**
   * 사고 해결 처리
   */
  resolveIncident: (id: string) =>
    apiRequest<import("./types").IncidentResponse>(
      "incident",
      `/incidents/${id}`,
      {
        method: "PUT",
        body: { is_resolved: true },
      }
    ),

  /**
   * SSE 스트림 URL 반환
   */
  getStreamUrl: () => `${getApiUrl("incident")}/incidents/stream`,
};

// ============================================
// Asset Management API
// ============================================

export const assetApi = {
  /**
   * 에셋 목록 조회
   */
  getAssets: (params?: import("./types").AssetListParams) =>
    apiRequest<import("./types").AssetResponse[]>("asset", "/assets", {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  /**
   * 에셋 상세 조회 (메타데이터)
   */
  getAsset: (id: string) =>
    apiRequest<import("./types").AssetResponse>("asset", `/assets/${id}/metadata`),

  /**
   * 에셋 다운로드 URL 반환
   */
  getAssetDownloadUrl: (id: string) => `${getApiUrl("asset")}/assets/${id}`,

  /**
   * 에셋 업로드
   * FormData를 사용하므로 별도 처리
   */
  uploadAsset: async (file: File, name?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (name) {
      formData.append("name", name);
    }

    const response = await fetch(`${getApiUrl("asset")}/assets`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorData: ApiError = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // JSON 파싱 실패 시 기본 메시지 사용
      }
      throw new ApiClientError(errorMessage, response.status);
    }

    return response.json() as Promise<import("./types").AssetUploadResponse>;
  },

  /**
   * 에셋 삭제
   */
  deleteAsset: (id: string) =>
    apiRequest<void>("asset", `/assets/${id}`, {
      method: "DELETE",
    }),
};
