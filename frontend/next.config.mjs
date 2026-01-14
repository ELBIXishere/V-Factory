/** @type {import('next').NextConfig} */
const nextConfig = {
  // Three.js 등 명령형 라이브러리와의 호환성을 위해 Strict Mode 비활성화
  // (Strict Mode는 개발 모드에서 컴포넌트를 두 번 마운트하여 side effect 테스트)
  reactStrictMode: false,
  
  // 웹팩 설정 (WGSL 셰이더 파일 로딩)
  webpack: (config) => {
    config.module.rules.push({
      test: /\.wgsl$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
