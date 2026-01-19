"use client";

/**
 * NPC 이름 레이블 컴포넌트
 * NPC 위에 이름을 표시하는 HTML Overlay
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { SceneManager } from "@/lib/three";

export interface NPCNameLabelProps {
  // NPC 그룹 참조
  npcGroup: THREE.Group | null;
  // NPC 이름
  name: string;
  // 씬 매니저
  sceneManager: SceneManager | null;
  // 레이블 오프셋 (NPC 머리 위)
  offsetY?: number;
  // 컨테이너 요소 (Portal 타겟, 없으면 body 사용)
  container?: HTMLElement | null;
}

/**
 * NPC 이름 레이블 컴포넌트
 */
export function NPCNameLabel({
  npcGroup,
  name,
  sceneManager,
  offsetY = 2.0,
  container,
}: NPCNameLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const updateRef = useRef<number | null>(null);

  useEffect(() => {
    if (!npcGroup || !sceneManager || !labelRef.current) {
      return;
    }

    const label = labelRef.current;
    const camera = sceneManager.camera;
    const renderer = sceneManager.renderer;

    // 위치 업데이트 함수
    const updatePosition = () => {
      if (!npcGroup || !label) return;

      // NPC 머리 위 위치 계산
      const npcPosition = new THREE.Vector3();
      npcGroup.getWorldPosition(npcPosition);
      npcPosition.y += offsetY;

      // 3D 좌표를 2D 화면 좌표로 변환
      const vector = npcPosition.project(camera);

      // 화면 좌표 계산 (렌더러 DOM 요소의 실제 크기 사용)
      const rect = renderer.domElement.getBoundingClientRect();
      const widthHalf = rect.width / 2;
      const heightHalf = rect.height / 2;

      const x = vector.x * widthHalf + widthHalf + rect.left;
      const y = -(vector.y * heightHalf) + heightHalf + rect.top;

      // 카메라 뒤에 있으면 숨김
      if (vector.z > 1) {
        label.style.display = "none";
        return;
      }

      // 레이블 표시 및 위치 설정
      label.style.display = "block";
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
      label.style.transform = "translate(-50%, -100%)";
    };

    // 렌더링 루프에 업데이트 함수 등록
    const updateCallback = () => {
      updatePosition();
    };

    sceneManager.addRenderCallback(updateCallback);

    // 초기 위치 설정 (약간의 지연 후)
    const timeoutId = setTimeout(() => {
      updatePosition();
    }, 100);

    // 애니메이션 프레임으로도 업데이트 (더 정확한 위치 추적)
    const animate = () => {
      updatePosition();
      updateRef.current = requestAnimationFrame(animate);
    };
    updateRef.current = requestAnimationFrame(animate);

    // 클린업
    return () => {
      clearTimeout(timeoutId);
      sceneManager.removeRenderCallback(updateCallback);
      if (updateRef.current !== null) {
        cancelAnimationFrame(updateRef.current);
        updateRef.current = null;
      }
    };
  }, [npcGroup, sceneManager, offsetY]);

  if (!npcGroup || typeof window === "undefined") {
    return null;
  }

  // Portal 타겟 결정: container가 있으면 사용, 없으면 body 사용
  const portalTarget = container || (typeof document !== "undefined" ? document.body : null);
  
  if (!portalTarget) {
    return null;
  }

  // Portal을 사용해서 컨테이너 또는 body에 렌더링 (Canvas 밖에서 표시)
  const labelElement = (
    <div
      ref={labelRef}
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full"
      style={{
        display: "none",
      }}
    >
      <div className="rounded bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm whitespace-nowrap">
        {name}
      </div>
    </div>
  );

  return createPortal(labelElement, portalTarget);
}
