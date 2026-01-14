/**
 * Backend API 타입 정의
 * FastAPI 백엔드와 통신하기 위한 타입들
 */

// ============================================
// 공통 타입
// ============================================

/**
 * 3D 좌표 타입
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * 페이지네이션 응답 타입
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * API 에러 응답 타입
 */
export interface ApiError {
  detail: string;
  code?: string;
}

// ============================================
// Factory Core Service 타입
// ============================================

/**
 * 공장 정보 타입
 */
export interface FactoryResponse {
  id: string;
  name: string;
  description?: string;
  layout_json?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * 공장 생성 요청 타입
 */
export interface CreateFactoryRequest {
  name: string;
  description?: string;
  layout_json?: Record<string, unknown>;
}

/**
 * 공장 레이아웃 업데이트 요청 타입
 */
export interface UpdateFactoryLayoutRequest {
  layout_json: Record<string, unknown>;
}

/**
 * 설비 유형
 */
export type EquipmentType =
  | "CONVEYOR"
  | "MACHINE"
  | "STORAGE"
  | "WORKSTATION"
  | "OTHER";

/**
 * 설비 상태
 */
export type EquipmentStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "ERROR";

/**
 * 설비 정보 타입
 */
export interface EquipmentResponse {
  id: string;
  factory_id: string;
  name: string;
  type: EquipmentType;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  status: EquipmentStatus;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * CCTV 설정 타입
 */
export interface CCTVConfigResponse {
  id: string;
  factory_id: string;
  name: string;
  position: Vector3;
  rotation: Vector3;
  fov: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * CCTV 설정 생성 요청 타입
 */
export interface CreateCCTVConfigRequest {
  factory_id: string;
  name: string;
  position: Vector3;
  rotation?: Vector3;
  fov?: number;
}

/**
 * CCTV 설정 업데이트 요청 타입
 */
export interface UpdateCCTVConfigRequest {
  name?: string;
  position?: Vector3;
  rotation?: Vector3;
  fov?: number;
  is_active?: boolean;
}

// ============================================
// Incident Event Service 타입
// ============================================

/**
 * 사고 유형
 */
export type IncidentType =
  | "ENTANGLEMENT"
  | "FALL"
  | "COLLISION"
  | "FIRE"
  | "ELECTRIC_SHOCK"
  | "OTHER";

/**
 * 사고 정보 타입 (Backend API 응답)
 */
export interface IncidentResponse {
  id: string;
  factory_id: string;
  type: IncidentType;
  severity: number;
  // Backend에서 position_x, position_y, position_z로 분리되어 옴
  position_x: number;
  position_y: number;
  position_z: number;
  description?: string;
  is_resolved: boolean;
  detected_cctv_ids?: string[];
  npc_id?: string; // NPC ID (선택적)
  timestamp: string;
  resolved_at?: string;
}

/**
 * 사고 생성 요청 타입
 */
export interface CreateIncidentRequest {
  factory_id: string;
  type: IncidentType;
  severity: number;
  // Backend에서 position_x, position_y, position_z로 받음
  position_x: number;
  position_y: number;
  position_z: number;
  description?: string;
  npc_id?: string; // NPC ID (선택적)
}

/**
 * SSE 사고 이벤트 타입
 */
export interface IncidentSSEEvent {
  event: "incident_created" | "incident_updated" | "incident_resolved";
  data: IncidentResponse;
}

/**
 * SSE 공장 이벤트 유형
 */
export type FactoryEventType =
  | "factory_created"
  | "factory_updated"
  | "factory_deleted"
  | "layout_updated";

/**
 * SSE 공장 이벤트 타입
 */
export interface FactorySSEEvent {
  event: FactoryEventType;
  data: FactoryResponse;
}

/**
 * SSE CCTV 이벤트 유형
 */
export type CCTVEventType =
  | "cctv_created"
  | "cctv_updated"
  | "cctv_deleted";

/**
 * SSE CCTV 이벤트 데이터 타입
 */
export interface CCTVSSEEventData {
  id: string;
  factory_id: string;
  name: string;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_x: number;
  rotation_y: number;
  rotation_z: number;
  fov: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * SSE CCTV 이벤트 타입
 */
export interface CCTVSSEEvent {
  event: CCTVEventType;
  data: CCTVSSEEventData;
}

// ============================================
// Asset Management Service 타입
// ============================================

/**
 * 에셋 유형
 */
export type AssetType = "MODEL" | "TEXTURE" | "MATERIAL" | "OTHER";

/**
 * 에셋 정보 타입
 */
export interface AssetResponse {
  id: string;
  name: string;
  type: AssetType;
  file_path: string;
  file_size: number;
  mime_type: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * 에셋 업로드 응답 타입
 */
export interface AssetUploadResponse {
  id: string;
  name: string;
  file_path: string;
  message: string;
}

// ============================================
// 쿼리 파라미터 타입
// ============================================

/**
 * 사고 목록 쿼리 파라미터
 */
export interface IncidentListParams {
  factory_id?: string;
  type?: IncidentType;
  is_resolved?: boolean;
  min_severity?: number;
  page?: number;
  page_size?: number;
}

/**
 * 에셋 목록 쿼리 파라미터
 */
export interface AssetListParams {
  type?: AssetType;
  page?: number;
  page_size?: number;
}
