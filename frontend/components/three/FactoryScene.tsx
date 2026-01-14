"use client";

/**
 * FactoryScene 컴포넌트
 * 공장 3D 씬 통합 - 컨베이어 벨트, Worker NPC, 설비 등
 */

import { useCallback, useState, useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { SceneManager } from "@/lib/three";
import { WebGPUCanvas } from "./WebGPUCanvas";
import { ConveyorBelt, ConveyorBeltConfig } from "./ConveyorBelt";
import { WorkerNPC, WorkerNPCConfig, NPCState } from "./WorkerNPC";
import type { Vector3 } from "@/lib/api/types";

// 기본 컨베이어 벨트 설정
const DEFAULT_CONVEYOR_BELTS: ConveyorBeltConfig[] = [
  {
    id: "conveyor-a",
    position: { x: -4, y: 0, z: 0 },
    rotation: 0,
    length: 8,
    width: 1.2,
    speed: 1.2,
    isActive: true,
    beltColor: 0x555555, // 더 밝은 회색
    frameColor: 0x888888, // 더 밝은 프레임
  },
  {
    id: "conveyor-b",
    position: { x: 4, y: 0, z: 0 },
    rotation: 0,
    length: 8,
    width: 1.2,
    speed: 0.8,
    isActive: true,
    beltColor: 0x555555, // 더 밝은 회색
    frameColor: 0x888888, // 더 밝은 프레임
  },
];

// 공장 경계 정의 (공장 크기)
const FACTORY_BOUNDS = {
  minX: -10,
  maxX: 10,
  minZ: -10,
  maxZ: 10,
};

// 기본 Worker NPC 설정 (화면 경계 내로 제한: -10 ~ 10)
const DEFAULT_WORKERS: WorkerNPCConfig[] = [
  {
    id: "worker-1",
    name: "김작업",
    startPosition: { x: -4, y: 0, z: 3 },
    waypoints: [
      { x: -4, y: 0, z: 3, waitTime: 2 },
      { x: -7, y: 0, z: 3, waitTime: 1 }, // -8 -> -7
      { x: -7, y: 0, z: -3, waitTime: 2 }, // -8 -> -7
      { x: -4, y: 0, z: -3, waitTime: 1 },
    ],
    speed: 1.5,
    initialState: "idle",
  },
  {
    id: "worker-2",
    name: "이안전",
    startPosition: { x: 4, y: 0, z: 3 },
    waypoints: [
      { x: 4, y: 0, z: 3, waitTime: 3 },
      { x: 7, y: 0, z: 3, waitTime: 1 }, // 8 -> 7
      { x: 7, y: 0, z: -3, waitTime: 3 }, // 8 -> 7
      { x: 4, y: 0, z: -3, waitTime: 1 },
    ],
    speed: 1.2,
    initialState: "idle",
  },
  {
    id: "worker-3",
    name: "박관리",
    startPosition: { x: 0, y: 0, z: 5 },
    waypoints: [
      { x: 0, y: 0, z: 5, waitTime: 2 }, // 6 -> 5
      { x: -5, y: 0, z: 5, waitTime: 1 }, // -6 -> -5
      { x: -5, y: 0, z: -5, waitTime: 2 }, // -6 -> -5
      { x: 5, y: 0, z: -5, waitTime: 1 }, // 6 -> 5
      { x: 5, y: 0, z: 5, waitTime: 2 }, // 6 -> 5
    ],
    speed: 2.0,
    initialState: "walking",
  },
];

// NPC 참조 타입
export interface NPCRef {
  getPosition: () => Vector3;
  setState: (state: NPCState) => void;
}

// 컴포넌트 Props
export interface FactorySceneProps {
  // 디버그 모드
  debug?: boolean;
  // 컨베이어 벨트 설정 (커스텀)
  conveyorBelts?: ConveyorBeltConfig[];
  // Worker NPC 설정 (커스텀)
  workers?: WorkerNPCConfig[];
  // 씬 준비 완료 콜백
  onSceneReady?: (sceneManager: SceneManager) => void;
  // NPC 상태 변경 콜백
  onWorkerStateChange?: (workerId: string, state: NPCState) => void;
  // 상자가 벨트 끝에 도달했을 때 콜백
  onBoxCompleted?: (beltId: string, boxId: string) => void;
  // NPC 참조 등록 콜백 (외부에서 NPC 제어용)
  onNPCRefsReady?: (npcRefs: Map<string, NPCRef>, findNearestNPC: (position: Vector3) => string | null) => void;
  // 추가 CSS 클래스
  className?: string;
}

/**
 * 공장 씬 통합 컴포넌트
 */
export function FactoryScene({
  debug = false,
  conveyorBelts = DEFAULT_CONVEYOR_BELTS,
  workers = DEFAULT_WORKERS,
  onSceneReady,
  onWorkerStateChange,
  onBoxCompleted,
  onNPCRefsReady,
  className = "",
}: FactorySceneProps) {
  // SceneManager 상태
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);
  
  // NPC 참조 맵
  const npcRefs = useRef<Map<string, NPCRef>>(new Map());

  // 씬 준비 완료 핸들러
  const handleSceneReady = useCallback(
    (manager: SceneManager) => {
      setSceneManager(manager);
      onSceneReady?.(manager);
    },
    [onSceneReady]
  );

  // 에러 핸들러
  const handleError = useCallback((error: Error) => {
    console.error("[FactoryScene] Error:", error);
  }, []);

  // NPC 상태 변경 핸들러
  const handleWorkerStateChange = useCallback(
    (workerId: string, state: NPCState) => {
      onWorkerStateChange?.(workerId, state);
    },
    [onWorkerStateChange]
  );

  // 상자 완료 핸들러
  const handleBoxReachedEnd = useCallback(
    (beltId: string) => (boxId: string) => {
      onBoxCompleted?.(beltId, boxId);
    },
    [onBoxCompleted]
  );

  // onNPCRefsReady 콜백을 useRef로 안정화
  const onNPCRefsReadyRef = useRef(onNPCRefsReady);
  useEffect(() => {
    onNPCRefsReadyRef.current = onNPCRefsReady;
  }, [onNPCRefsReady]);

  // NPC 참조 등록 핸들러 (useRef로 안정화)
  const handleNPCRegister = useCallback(
    (npcId: string, getPosition: () => Vector3, setState: (state: NPCState) => void) => {
      npcRefs.current.set(npcId, { getPosition, setState });
      
      // NPC 참조가 준비되면 콜백 호출 (useRef를 통해 안정적인 참조 사용)
      if (onNPCRefsReadyRef.current) {
        onNPCRefsReadyRef.current(npcRefs.current, findNearestNPCRef.current);
      }
    },
    [] // 의존성 배열 비움 - useRef를 사용하므로 안정적
  );

  // 컨베이어 벨트 설정을 간단한 형태로 변환 (useMemo로 메모이제이션)
  // 시각적 모델과 일치하도록 width에서 0.1을 빼서 충돌 판정 범위 계산
  const simplifiedBelts = useMemo(
    () =>
      conveyorBelts.map((belt) => ({
        x: belt.position.x,
        z: belt.position.z,
        length: belt.length || 6,
        width: (belt.width || 1) - 0.1, // 시각적 모델과 일치 (ConveyorBelt.tsx:96 참고)
      })),
    [conveyorBelts]
  );

  // 가장 가까운 NPC 찾기 함수 (useRef로 안정화)
  const findNearestNPCRef = useRef<(position: Vector3) => string | null>((position: Vector3) => {
    let nearestId: string | null = null;
    let minDistance = Infinity;

    npcRefs.current.forEach((ref, npcId) => {
      const npcPos = ref.getPosition();
      const distance = Math.sqrt(
        Math.pow(npcPos.x - position.x, 2) +
        Math.pow(npcPos.y - position.y, 2) +
        Math.pow(npcPos.z - position.z, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestId = npcId;
      }
    });

    return nearestId;
  });

  // findNearestNPC 함수를 최신 로직으로 업데이트
  findNearestNPCRef.current = (position: Vector3) => {
    let nearestId: string | null = null;
    let minDistance = Infinity;

    npcRefs.current.forEach((ref, npcId) => {
      const npcPos = ref.getPosition();
      const distance = Math.sqrt(
        Math.pow(npcPos.x - position.x, 2) +
        Math.pow(npcPos.y - position.y, 2) +
        Math.pow(npcPos.z - position.z, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestId = npcId;
      }
    });

    return nearestId;
  };

  const findNearestNPC = useCallback((position: Vector3) => findNearestNPCRef.current(position), []);

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* WebGPU 캔버스 */}
      <WebGPUCanvas
        debug={debug}
        backgroundColor={0x1a1a2e}
        enableShadows={true}
        onSceneReady={handleSceneReady}
        onError={handleError}
      />

      {/* SceneManager가 준비되면 3D 오브젝트 렌더링 */}
      {sceneManager && (
        <>
          {/* 컨베이어 벨트들 */}
          {conveyorBelts.map((belt) => (
            <ConveyorBelt
              key={belt.id}
              config={belt}
              sceneManager={sceneManager}
              boxSpawnInterval={3}
              boxSize={0.35}
              onBoxReachedEnd={handleBoxReachedEnd(belt.id)}
            />
          ))}

          {/* Worker NPC들 */}
          {workers.map((worker) => (
            <WorkerNPC
              key={worker.id}
              config={worker}
              sceneManager={sceneManager}
              onStateChange={handleWorkerStateChange}
              conveyorBelts={simplifiedBelts}
              onRegister={handleNPCRegister}
              factoryBounds={FACTORY_BOUNDS}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default FactoryScene;
