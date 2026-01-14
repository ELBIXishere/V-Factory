/**
 * GLTFLoader 래퍼
 * 3D 모델 로딩, 캐싱, 에러 핸들링
 */

import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// 로딩 진행 상태
export interface LoadingProgress {
  loaded: number;
  total: number;
  percent: number;
}

// 로드된 모델 정보
export interface LoadedModel {
  gltf: GLTF;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

// 로더 옵션
export interface ModelLoaderOptions {
  // DRACO 디코더 경로 (압축된 모델용)
  dracoDecoderPath?: string;
  // 캐싱 활성화
  enableCache?: boolean;
}

/**
 * 모델 로더 클래스
 * GLB/GLTF 파일 로딩 및 관리
 */
export class ModelLoader {
  private loader: GLTFLoader;
  private dracoLoader: DRACOLoader | null = null;
  private cache: Map<string, LoadedModel> = new Map();
  private enableCache: boolean;

  constructor(options: ModelLoaderOptions = {}) {
    this.loader = new GLTFLoader();
    this.enableCache = options.enableCache ?? true;

    // DRACO 로더 설정 (압축된 모델 지원)
    if (options.dracoDecoderPath) {
      this.dracoLoader = new DRACOLoader();
      this.dracoLoader.setDecoderPath(options.dracoDecoderPath);
      this.loader.setDRACOLoader(this.dracoLoader);
    }
  }

  /**
   * 모델 로드
   * @param url 모델 파일 URL
   * @param onProgress 진행률 콜백
   */
  async load(
    url: string,
    onProgress?: (progress: LoadingProgress) => void
  ): Promise<LoadedModel> {
    // 캐시 확인
    if (this.enableCache && this.cache.has(url)) {
      console.log(`[ModelLoader] Loading from cache: ${url}`);
      const cached = this.cache.get(url)!;
      // 캐시된 모델의 복제본 반환
      return {
        ...cached,
        scene: cached.scene.clone(),
      };
    }

    console.log(`[ModelLoader] Loading model: ${url}`);

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        // 로드 성공
        (gltf) => {
          const model: LoadedModel = {
            gltf,
            scene: gltf.scene,
            animations: gltf.animations,
          };

          // 그림자 설정
          model.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // 캐시에 저장
          if (this.enableCache) {
            this.cache.set(url, model);
          }

          console.log(`[ModelLoader] Model loaded: ${url}`);
          resolve(model);
        },
        // 로드 진행
        (xhr) => {
          if (onProgress && xhr.total > 0) {
            const progress: LoadingProgress = {
              loaded: xhr.loaded,
              total: xhr.total,
              percent: (xhr.loaded / xhr.total) * 100,
            };
            onProgress(progress);
          }
        },
        // 로드 에러
        (error) => {
          console.error(`[ModelLoader] Failed to load model: ${url}`, error);
          reject(new Error(`Failed to load model: ${url}`));
        }
      );
    });
  }

  /**
   * 여러 모델 동시 로드
   * @param urls 모델 파일 URL 배열
   * @param onTotalProgress 전체 진행률 콜백
   */
  async loadMultiple(
    urls: string[],
    onTotalProgress?: (current: number, total: number) => void
  ): Promise<Map<string, LoadedModel>> {
    const results = new Map<string, LoadedModel>();
    let loaded = 0;

    const promises = urls.map(async (url) => {
      const model = await this.load(url);
      loaded++;
      onTotalProgress?.(loaded, urls.length);
      results.set(url, model);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * 캐시에서 모델 제거
   */
  removeFromCache(url: string): boolean {
    return this.cache.delete(url);
  }

  /**
   * 캐시 전체 비우기
   */
  clearCache(): void {
    this.cache.clear();
    console.log("[ModelLoader] Cache cleared");
  }

  /**
   * 캐시된 모델 URL 목록 반환
   */
  getCachedUrls(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    // 캐시된 모델들의 리소스 해제
    this.cache.forEach((model) => {
      model.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    });

    this.cache.clear();

    // DRACO 로더 정리
    if (this.dracoLoader) {
      this.dracoLoader.dispose();
    }

    console.log("[ModelLoader] Disposed");
  }
}

/**
 * 단일 모델 빠르게 로드하는 헬퍼 함수
 */
export async function loadModel(
  url: string,
  onProgress?: (progress: LoadingProgress) => void
): Promise<LoadedModel> {
  const loader = new ModelLoader();
  return loader.load(url, onProgress);
}

/**
 * 모델에서 특정 이름의 메쉬 찾기
 */
export function findMeshByName(
  model: LoadedModel,
  name: string
): THREE.Mesh | null {
  let result: THREE.Mesh | null = null;

  model.scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name === name) {
      result = child;
    }
  });

  return result;
}

/**
 * 모델의 바운딩 박스 계산
 */
export function getModelBoundingBox(model: LoadedModel): THREE.Box3 {
  const box = new THREE.Box3();
  box.setFromObject(model.scene);
  return box;
}

/**
 * 모델 크기 정규화 (주어진 크기에 맞게 스케일 조정)
 */
export function normalizeModelSize(
  model: LoadedModel,
  targetSize: number
): void {
  const box = getModelBoundingBox(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = targetSize / maxDimension;

  model.scene.scale.setScalar(scale);
}
