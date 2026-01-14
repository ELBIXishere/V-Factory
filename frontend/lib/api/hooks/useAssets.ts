import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assetApi } from "../client";
import type {
  AssetResponse,
  AssetUploadResponse,
  AssetListParams,
} from "../types";

// 쿼리 키 상수
const QUERY_KEYS = {
  assets: (params?: AssetListParams) => ["assets", params] as const,
  asset: (id: string) => ["assets", id] as const,
};

/**
 * 에셋 목록 조회 훅
 */
export function useAssets(params?: AssetListParams) {
  return useQuery<AssetResponse[]>({
    queryKey: QUERY_KEYS.assets(params),
    queryFn: () => assetApi.getAssets(params),
  });
}

/**
 * 에셋 상세 조회 (메타데이터) 훅
 */
export function useAsset(id: string) {
  return useQuery<AssetResponse>({
    queryKey: QUERY_KEYS.asset(id),
    queryFn: () => assetApi.getAsset(id),
    enabled: !!id,
  });
}

/**
 * 에셋 다운로드 URL 반환 훅
 */
export function useAssetDownloadUrl(id: string) {
  return assetApi.getAssetDownloadUrl(id);
}

/**
 * 에셋 업로드 훅
 */
export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation<
    AssetUploadResponse,
    Error,
    { file: File; name?: string }
  >({
    mutationFn: ({ file, name }) => assetApi.uploadAsset(file, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

/**
 * 에셋 삭제 훅
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => assetApi.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

/**
 * 3D 모델 에셋 목록 조회 훅
 * GLB/GLTF 모델 파일만 필터링
 */
export function useModelAssets() {
  return useAssets({ type: "MODEL" });
}

/**
 * 텍스처 에셋 목록 조회 훅
 */
export function useTextureAssets() {
  return useAssets({ type: "TEXTURE" });
}
