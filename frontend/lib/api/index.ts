/**
 * API 모듈 인덱스
 * 클라이언트, 타입, 훅 내보내기
 */

// API 클라이언트
export { factoryApi, incidentApi, assetApi, ApiClientError } from "./client";

// API 타입
export type {
  Vector3,
  PaginatedResponse,
  ApiError,
  FactoryResponse,
  CreateFactoryRequest,
  UpdateFactoryLayoutRequest,
  EquipmentType,
  EquipmentStatus,
  EquipmentResponse,
  CCTVConfigResponse,
  CreateCCTVConfigRequest,
  UpdateCCTVConfigRequest,
  IncidentType,
  IncidentResponse,
  CreateIncidentRequest,
  IncidentSSEEvent,
  AssetType,
  AssetResponse,
  AssetUploadResponse,
  IncidentListParams,
  AssetListParams,
} from "./types";

// API 훅
export * from "./hooks";
