/**
 * 성능 모니터링 유틸리티
 * WebGPU 렌더링 성능 추적 및 최적화
 */

/**
 * 성능 메트릭 인터페이스
 */
export interface PerformanceMetrics {
  // FPS (Frames Per Second)
  fps: number;
  // 프레임 시간 (밀리초)
  frameTime: number;
  // Draw Call 수
  drawCalls: number;
  // 삼각형 수
  triangles: number;
  // 텍스처 메모리 사용량 (MB)
  textureMemory: number;
  // GPU 메모리 사용량 (MB, 추정)
  gpuMemory: number;
}

/**
 * 성능 모니터 클래스
 */
export class PerformanceMonitor {
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private fpsHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private readonly historySize: number = 60; // 1초간의 데이터 (60fps 기준)

  /**
   * 프레임 업데이트
   */
  update(): PerformanceMetrics {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // FPS 계산
    const fps = deltaTime > 0 ? 1000 / deltaTime : 0;
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.historySize) {
      this.fpsHistory.shift();
    }

    // 평균 FPS 계산
    const avgFps =
      this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    // 프레임 시간 기록
    this.frameTimeHistory.push(deltaTime);
    if (this.frameTimeHistory.length > this.historySize) {
      this.frameTimeHistory.shift();
    }

    // 평균 프레임 시간 계산
    const avgFrameTime =
      this.frameTimeHistory.reduce((a, b) => a + b, 0) /
      this.frameTimeHistory.length;

    this.frameCount++;

    return {
      fps: Math.round(avgFps),
      frameTime: Math.round(avgFrameTime * 100) / 100,
      drawCalls: 0, // Three.js에서 직접 가져와야 함
      triangles: 0, // Three.js에서 직접 가져와야 함
      textureMemory: 0, // 계산 필요
      gpuMemory: 0, // 추정치
    };
  }

  /**
   * 성능 경고 체크
   * FPS가 낮거나 프레임 시간이 높으면 경고
   */
  checkPerformanceWarnings(metrics: PerformanceMetrics): string[] {
    const warnings: string[] = [];

    if (metrics.fps < 30) {
      warnings.push(`낮은 FPS 감지: ${metrics.fps} FPS`);
    }

    if (metrics.frameTime > 33.33) {
      warnings.push(
        `높은 프레임 시간: ${metrics.frameTime.toFixed(2)}ms`
      );
    }

    return warnings;
  }

  /**
   * 리셋
   */
  reset(): void {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fpsHistory = [];
    this.frameTimeHistory = [];
  }

  /**
   * 현재 프레임 카운트 반환
   */
  getFrameCount(): number {
    return this.frameCount;
  }
}

/**
 * 텍스처 메모리 관리 유틸리티
 */
export class TextureMemoryManager {
  private textureCache: Map<string, { texture: any; size: number }> =
    new Map();
  private maxMemoryMB: number = 512; // 최대 메모리 512MB

  /**
   * 텍스처 크기 계산 (MB)
   */
  calculateTextureSize(width: number, height: number, format: string): number {
    // RGBA = 4 bytes per pixel
    const bytesPerPixel = 4;
    const sizeBytes = width * height * bytesPerPixel;
    return sizeBytes / (1024 * 1024); // MB로 변환
  }

  /**
   * 텍스처 캐시에 추가
   */
  addTexture(key: string, texture: any, width: number, height: number): void {
    const size = this.calculateTextureSize(width, height, "RGBA");
    this.textureCache.set(key, { texture, size });

    // 메모리 제한 체크
    this.checkMemoryLimit();
  }

  /**
   * 텍스처 캐시에서 제거
   */
  removeTexture(key: string): void {
    this.textureCache.delete(key);
  }

  /**
   * 메모리 제한 체크 및 정리
   */
  private checkMemoryLimit(): void {
    let totalMemory = 0;
    for (const [, { size }] of this.textureCache) {
      totalMemory += size;
    }

    // 메모리 제한 초과 시 오래된 텍스처 제거
    if (totalMemory > this.maxMemoryMB) {
      const entries = Array.from(this.textureCache.entries());
      // LRU 방식으로 정리 (간단히 첫 번째 항목 제거)
      if (entries.length > 0) {
        const [oldestKey] = entries[0];
        this.removeTexture(oldestKey);
      }
    }
  }

  /**
   * 총 메모리 사용량 반환 (MB)
   */
  getTotalMemory(): number {
    let total = 0;
    for (const [, { size }] of this.textureCache) {
      total += size;
    }
    return total;
  }

  /**
   * 캐시 클리어
   */
  clear(): void {
    this.textureCache.clear();
  }
}
