"use client";

/**
 * GlobalSceneProvider 컴포넌트
 * 전역 3D 씬을 관리하여 페이지 간 씬 상태를 공유
 * 대시보드, CCTV 모니터링 등 모든 페이지에서 동일한 3D 씬을 사용
 */

import { useEffect, useRef, useCallback } from "react";
import { SceneManager } from "@/lib/three";
import { useSceneStore } from "@/lib/stores";
import { FactoryScene, FactorySceneRef } from "./FactoryScene";
import type { NPCRef } from "./FactoryScene";
import type { Vector3 } from "@/lib/api/types";

export function GlobalSceneProvider() {
  // 전역 씬 매니저 설정
  const setSceneManager = useSceneStore((state) => state.setSceneManager);
  const setFactorySceneRef = useSceneStore((state) => state.setFactorySceneRef);
  const setNPCRefs = useSceneStore((state) => state.setNPCRefs);
  
  // NPC 참조 관리
  const npcRefsRef = useRef<Map<string, NPCRef>>(new Map());
  const findNearestNPCRef = useRef<((position: Vector3) => string | null) | null>(null);
  
  // FactoryScene ref
  const factorySceneRef = useRef<FactorySceneRef>(null);
  
  // 초기화 상태 추적
  const initializedRef = useRef(false);
  
  // FactoryScene ref를 전역 스토어에 저장
  useEffect(() => {
    if (factorySceneRef.current) {
      setFactorySceneRef(factorySceneRef.current);
    }
  }, [setFactorySceneRef]);

  // 씬 준비 완료 핸들러
  const handleSceneReady = useCallback(
    (manager: SceneManager) => {
      if (!initializedRef.current) {
        console.log("[GlobalSceneProvider] 전역 씬 초기화 완료");
        
        // 애니메이션 시작 (CCTV 렌더링을 위해 필수)
        if (!manager.isAnimationRunning()) {
          console.log("[GlobalSceneProvider] 전역 씬 애니메이션 시작");
          manager.startAnimation();
        } else {
          console.log("[GlobalSceneProvider] 전역 씬 애니메이션 이미 실행 중");
        }
        
        setSceneManager(manager);
        initializedRef.current = true;
      }
    },
    [setSceneManager]
  );

  // NPC 참조 준비 핸들러
  const handleNPCRefsReady = useCallback(
    (npcRefs: Map<string, NPCRef>, findNearestNPC: (position: Vector3) => string | null) => {
      npcRefsRef.current = npcRefs;
      findNearestNPCRef.current = findNearestNPC;
      // 전역 스토어에 NPC 참조 저장 (더블클릭 이벤트 처리용)
      setNPCRefs(npcRefs);
      console.log("[GlobalSceneProvider] NPC 참조 준비 완료:", npcRefs.size);
    },
    [setNPCRefs]
  );

  return (
    <div
      style={{
        position: "fixed",
        top: "-9999px",
        left: "-9999px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        pointerEvents: "none",
        visibility: "hidden",
      }}
      aria-hidden="true"
    >
      <div style={{ width: "800px", height: "600px" }}>
        <FactoryScene
          ref={factorySceneRef}
          debug={false}
          useGlobalScene={false}
          onSceneReady={handleSceneReady}
          onNPCRefsReady={handleNPCRefsReady}
          showNPCLabels={false}
        />
      </div>
    </div>
  );
}
