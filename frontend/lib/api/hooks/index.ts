/**
 * API 훅 모음
 * TanStack Query 기반 API 요청 훅 내보내기
 */

// Factory Core API 훅
export {
  useFactories,
  useFactory,
  useCreateFactory,
  useUpdateFactoryLayout,
  useEquipment,
  useCCTVConfigs,
  useCreateCCTVConfig,
  useUpdateCCTVConfig,
  useDeleteCCTVConfig,
  useFactoryStream,
  useCCTVStream,
} from "./useFactories";

// Incident Event API 훅
export {
  useIncidents,
  useIncident,
  useCreateIncident,
  useCreateIncidentWithCCTV,
  useResolveIncident,
  useIncidentStream,
} from "./useIncidents";

// Asset Management API 훅
export {
  useAssets,
  useAsset,
  useAssetDownloadUrl,
  useUploadAsset,
  useDeleteAsset,
  useModelAssets,
  useTextureAssets,
} from "./useAssets";
