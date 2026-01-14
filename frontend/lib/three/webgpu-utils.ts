/**
 * WebGPU 지원 체크 및 폴백 유틸리티
 * WebGPU 미지원 브라우저는 WebGL로 자동 폴백
 */

// 렌더러 타입 정의
export type RendererType = "webgpu" | "webgl";

// WebGPU 지원 체크 결과 캐싱
let cachedSupport: boolean | null = null;

/**
 * WebGPU 지원 여부를 비동기로 체크
 * GPU adapter를 실제로 요청하여 확인
 */
export async function checkWebGPUSupport(): Promise<boolean> {
  // 캐시된 결과가 있으면 반환
  if (cachedSupport !== null) {
    return cachedSupport;
  }

  // 브라우저 환경이 아니면 지원하지 않음 (SSR 대응)
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    cachedSupport = false;
    return false;
  }

  // navigator.gpu가 없으면 WebGPU 미지원
  if (!navigator.gpu) {
    console.warn("[WebGPU] navigator.gpu not available, falling back to WebGL");
    cachedSupport = false;
    return false;
  }

  try {
    // GPU adapter 요청
    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) {
      console.warn("[WebGPU] No GPU adapter available, falling back to WebGL");
      cachedSupport = false;
      return false;
    }

    // GPU device 요청으로 실제 사용 가능 여부 확인
    const device = await adapter.requestDevice();

    if (!device) {
      console.warn("[WebGPU] No GPU device available, falling back to WebGL");
      cachedSupport = false;
      return false;
    }

    // 성공적으로 device를 얻었으면 지원
    console.log("[WebGPU] WebGPU is supported");
    cachedSupport = true;
    return true;
  } catch (error) {
    console.warn("[WebGPU] Error checking WebGPU support:", error);
    cachedSupport = false;
    return false;
  }
}

/**
 * 현재 사용 가능한 렌더러 타입 반환
 * 동기 함수 - 캐시된 결과 사용 (checkWebGPUSupport 먼저 호출 필요)
 */
export function getRendererType(): RendererType {
  // 캐시된 결과가 없으면 기본값으로 WebGL
  if (cachedSupport === null) {
    console.warn(
      "[WebGPU] Support not checked yet, defaulting to WebGL. Call checkWebGPUSupport() first."
    );
    return "webgl";
  }

  return cachedSupport ? "webgpu" : "webgl";
}

/**
 * WebGPU 지원 체크 결과 리셋 (테스트용)
 */
export function resetWebGPUCache(): void {
  cachedSupport = null;
}

/**
 * 브라우저 정보와 함께 WebGPU 상태 로깅
 */
export async function logWebGPUStatus(): Promise<void> {
  const isSupported = await checkWebGPUSupport();

  console.log("=== WebGPU Status ===");
  console.log(`Browser: ${navigator.userAgent}`);
  console.log(`WebGPU Supported: ${isSupported}`);
  console.log(`Renderer Type: ${getRendererType()}`);

  if (isSupported && navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        // requestAdapterInfo는 일부 브라우저에서만 지원
        // @ts-expect-error - requestAdapterInfo는 실험적 API
        if (typeof adapter.requestAdapterInfo === "function") {
          // @ts-expect-error - requestAdapterInfo는 실험적 API
          const info = await adapter.requestAdapterInfo();
          console.log(`GPU Vendor: ${info.vendor}`);
          console.log(`GPU Architecture: ${info.architecture}`);
          console.log(`GPU Device: ${info.device}`);
          console.log(`GPU Description: ${info.description}`);
        } else {
          console.log("Adapter info not available");
        }
      }
    } catch (error) {
      console.log("Could not get adapter info:", error);
    }
  }
  console.log("====================");
}
