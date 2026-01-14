"use client";

/**
 * WebGPUCanvas 컴포넌트
 * Three.js WebGPU/WebGL 렌더러를 React에서 사용하기 위한 래퍼
 */

import { useEffect, useRef, useCallback } from "react";
import { SceneManager, createSceneManager, getRendererType } from "@/lib/three";
import { useSceneStore } from "@/lib/stores";

// 컴포넌트 Props
export interface WebGPUCanvasProps {
  // 디버그 모드 (그리드, 축 헬퍼 표시)
  debug?: boolean;
  // 배경색
  backgroundColor?: number;
  // 그림자 활성화
  enableShadows?: boolean;
  // 씬 매니저 준비 콜백
  onSceneReady?: (sceneManager: SceneManager) => void;
  // 에러 콜백
  onError?: (error: Error) => void;
  // 추가 CSS 클래스
  className?: string;
}

/**
 * WebGPU/WebGL 기반 3D 캔버스 컴포넌트
 * - WebGPU 지원 시 자동으로 WebGPU 렌더러 사용
 * - 미지원 시 WebGL로 폴백
 * - 리사이즈 자동 처리
 * - 언마운트 시 리소스 자동 정리
 */
export function WebGPUCanvas({
  debug = false,
  backgroundColor = 0x1a1a2e,
  enableShadows = true,
  onSceneReady,
  onError,
  className = "",
}: WebGPUCanvasProps) {
  // 컨테이너 ref
  const containerRef = useRef<HTMLDivElement>(null);
  // SceneManager ref
  const sceneManagerRef = useRef<SceneManager | null>(null);
  // 초기화 상태 ref
  const initializedRef = useRef(false);

  // Zustand 스토어 액션
  const setInitialized = useSceneStore((state) => state.setInitialized);
  const setLoading = useSceneStore((state) => state.setLoading);
  const setRendererInfo = useSceneStore((state) => state.setRendererInfo);
  const setDebugMode = useSceneStore((state) => state.setDebugMode);

  // FPS 계산용 변수
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() });

  // FPS 업데이트 콜백
  const updateFPS = useCallback(() => {
    const now = performance.now();
    fpsRef.current.frames++;

    // 1초마다 FPS 업데이트
    if (now - fpsRef.current.lastTime >= 1000) {
      const fps = Math.round(
        (fpsRef.current.frames * 1000) / (now - fpsRef.current.lastTime)
      );
      setRendererInfo({ fps });
      fpsRef.current.frames = 0;
      fpsRef.current.lastTime = now;
    }
  }, [setRendererInfo]);

  // 씬 초기화
  useEffect(() => {
    // 이미 초기화됨 또는 컨테이너 없음
    if (initializedRef.current || !containerRef.current) {
      return;
    }

    initializedRef.current = true;
    const container = containerRef.current;

    // 비동기 초기화 함수
    const initScene = async () => {
      setLoading(true, "3D 씬 초기화 중...");

      try {
        // SceneManager 생성 및 초기화
        const sceneManager = await createSceneManager({
          container,
          debug,
          backgroundColor,
          enableShadows,
          antialias: true,
        });

        sceneManagerRef.current = sceneManager;

        // 렌더러 타입 저장
        const rendererType = getRendererType();
        setRendererInfo({ type: rendererType });
        setDebugMode(debug);

        // FPS 업데이트 콜백 등록
        sceneManager.addRenderCallback(updateFPS);

        // 애니메이션 시작
        sceneManager.startAnimation();

        // 초기화 완료
        setInitialized(true);
        setLoading(false);

        // 콜백 호출
        onSceneReady?.(sceneManager);

        console.log("[WebGPUCanvas] Scene initialized successfully");
      } catch (error) {
        console.error("[WebGPUCanvas] Failed to initialize scene:", error);
        setLoading(false);
        setInitialized(false);

        const err =
          error instanceof Error ? error : new Error("Scene initialization failed");
        onError?.(err);
      }
    };

    initScene();

    // 클린업
    return () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
        sceneManagerRef.current = null;
      }
      initializedRef.current = false;
      setInitialized(false);
    };
  }, [
    debug,
    backgroundColor,
    enableShadows,
    onSceneReady,
    onError,
    setInitialized,
    setLoading,
    setRendererInfo,
    setDebugMode,
    updateFPS,
  ]);

  // 디버그 모드 변경 감지
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setDebugMode(debug);
      setDebugMode(debug);
    }
  }, [debug, setDebugMode]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ minHeight: "400px" }}
    />
  );
}

/**
 * SceneManager에 접근하기 위한 훅
 * WebGPUCanvas가 마운트된 후 사용
 */
export function useSceneManager(): SceneManager | null {
  // 이 훅은 WebGPUCanvas 내부에서만 사용하도록 설계됨
  // 실제로는 onSceneReady 콜백으로 SceneManager를 받아서 사용하는 것을 권장
  return null;
}

export default WebGPUCanvas;
