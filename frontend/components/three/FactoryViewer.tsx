"use client";

/**
 * FactoryViewer 컴포넌트
 * 대시보드에서 사용하는 3D 공장 뷰어 래퍼
 * 로딩 상태, 에러 처리, 컨트롤 UI 포함
 */

import { useState, useCallback } from "react";
import { useSceneStore } from "@/lib/stores";
import { FactoryScene } from "./FactoryScene";
import { NPCState } from "./WorkerNPC";
import { SceneManager } from "@/lib/three";

// 컴포넌트 Props
export interface FactoryViewerProps {
  // 디버그 모드
  debug?: boolean;
  // 추가 CSS 클래스
  className?: string;
}

/**
 * 공장 3D 뷰어 컴포넌트
 * 로딩 상태, 렌더러 정보, 컨트롤 UI 포함
 */
export function FactoryViewer({ debug = false, className = "" }: FactoryViewerProps) {
  // 로컬 상태
  const [completedBoxes, setCompletedBoxes] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);

  // 씬 스토어
  const isLoading = useSceneStore((state) => state.isLoading);
  const loadingMessage = useSceneStore((state) => state.loadingMessage);
  const rendererInfo = useSceneStore((state) => state.rendererInfo);

  // 씬 준비 완료 핸들러
  const handleSceneReady = useCallback((manager: SceneManager) => {
    setSceneReady(true);
    console.log("[FactoryViewer] Scene ready");
  }, []);

  // Worker 상태 변경 핸들러
  const handleWorkerStateChange = useCallback((workerId: string, state: NPCState) => {
    // 필요시 상태 추적
  }, []);

  // 상자 완료 핸들러
  const handleBoxCompleted = useCallback((beltId: string, boxId: string) => {
    setCompletedBoxes((prev) => prev + 1);
  }, []);

  return (
    <div className={`relative h-full w-full overflow-hidden rounded-lg ${className}`}>
      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-control-primary/90">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">{loadingMessage || "로딩 중..."}</p>
        </div>
      )}

      {/* 3D 씬 */}
      <FactoryScene
        debug={debug}
        onSceneReady={handleSceneReady}
        onWorkerStateChange={handleWorkerStateChange}
        onBoxCompleted={handleBoxCompleted}
      />

      {/* 상단 정보 바 */}
      {sceneReady && (
        <div className="absolute left-3 top-3 z-10 flex gap-2">
          {/* 렌더러 타입 배지 */}
          <div className="rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {rendererInfo.type.toUpperCase()}
          </div>
          {/* FPS 표시 */}
          <div className="rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {rendererInfo.fps} FPS
          </div>
          {/* 완료된 상자 수 */}
          <div className="rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            📦 {completedBoxes}
          </div>
        </div>
      )}

      {/* 컨트롤 안내 */}
      {sceneReady && (
        <div className="absolute bottom-3 left-3 z-10 rounded bg-black/60 px-3 py-2 text-xs text-white/80 backdrop-blur-sm">
          <p>🖱️ 드래그: 회전 | 스크롤: 확대/축소 | 우클릭+드래그: 이동</p>
        </div>
      )}

      {/* 디버그 모드 표시 */}
      {debug && (
        <div className="absolute right-3 top-3 z-10 rounded bg-status-warning/80 px-2 py-1 text-xs font-medium text-black">
          DEBUG MODE
        </div>
      )}
    </div>
  );
}

export default FactoryViewer;
