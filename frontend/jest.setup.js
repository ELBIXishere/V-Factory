// Jest 테스트 환경 설정
import '@testing-library/jest-dom'

// WebGPU 모킹 (테스트 환경에서는 WebGPU가 없을 수 있음)
global.navigator = {
  ...global.navigator,
  gpu: undefined,
}

// ResizeObserver 모킹
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// IntersectionObserver 모킹
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}
