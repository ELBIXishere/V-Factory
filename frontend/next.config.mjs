/** @type {import('next').NextConfig} */
// 테스트 모드 확인 (환경 변수 또는 .test-mode.json 파일에서)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isTestMode = false;
const testModeEnv = process.env.NEXT_PUBLIC_TEST_MODE || process.env.VFACTORY_TEST_MODE_FRONTEND;

// 환경 변수에서 테스트 모드 확인
if (testModeEnv === 'true') {
  isTestMode = true;
} else {
  // .test-mode.json 파일에서 확인
  try {
    const testModeFile = path.join(__dirname, '..', '.test-mode.json');
    if (fs.existsSync(testModeFile)) {
      const testModeConfig = JSON.parse(fs.readFileSync(testModeFile, 'utf8'));
      isTestMode = testModeConfig.frontend === true;
    }
  } catch (error) {
    // 파일 읽기 실패 시 무시
  }
}

const nextConfig = {
  // Three.js 등 명령형 라이브러리와의 호환성을 위해 Strict Mode 비활성화
  // (Strict Mode는 개발 모드에서 컴포넌트를 두 번 마운트하여 side effect 테스트)
  reactStrictMode: false,
  
  // 테스트 모드 환경 변수 주입
  env: {
    NEXT_PUBLIC_TEST_MODE: isTestMode ? 'true' : 'false',
  },
  
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
