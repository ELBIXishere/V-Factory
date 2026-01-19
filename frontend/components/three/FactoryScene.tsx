"use client";

/**
 * FactoryScene 컴포넌트
 * 공장 3D 씬 통합 - 컨베이어 벨트, Worker NPC, 설비 등
 */

import { useCallback, useState, useRef, useMemo, useEffect, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { SceneManager } from "@/lib/three";
import { useSceneStore } from "@/lib/stores";
import { WebGPUCanvas } from "./WebGPUCanvas";
import { ConveyorBelt, ConveyorBeltConfig } from "./ConveyorBelt";
import { WorkerNPC, WorkerNPCConfig, NPCState } from "./WorkerNPC";
import type { Vector3 } from "@/lib/api/types";
import { toast } from "sonner";

// 이름 자동 생성 함수
const generateNPCName = (id: string, index: number): string => {
  const names = ["김작업", "이검수", "박포장", "최관리", "정안전", "강정비", "윤수리", "장점검", "임감독", "한순찰"];
  return names[index % names.length] || `작업자-${index + 1}`;
};

const generateBeltName = (id: string, index: number): string => {
  const names = ["입고-조립", "조립-검수", "검수-포장", "포장-출고", "재공급-입고"];
  return `컨베이어 #${index + 1} (${names[index % names.length] || `벨트-${index + 1}`})`;
};

// 기본 컨베이어 벨트 설정 (순환형 공장 레이아웃)
const DEFAULT_CONVEYOR_BELTS: ConveyorBeltConfig[] = [
  // 입고-조립 구간
  {
    id: "conveyor-1",
    name: "컨베이어 #1 (입고-조립)",
    position: { x: -4, y: 0, z: -6 },
    rotation: 0,
    length: 4,
    width: 1.2,
    speed: 1.0,
    isActive: true,
    beltColor: 0x555555,
    frameColor: 0x888888,
  },
  // 조립-검수 구간
  {
    id: "conveyor-2",
    name: "컨베이어 #2 (조립-검수)",
    position: { x: 0, y: 0, z: -6 },
    rotation: 0,
    length: 4,
    width: 1.2,
    speed: 0.8,
    isActive: true,
    beltColor: 0x555555,
    frameColor: 0x888888,
  },
  // 검수-포장 구간 (90도 회전)
  {
    id: "conveyor-3",
    name: "컨베이어 #3 (검수-포장)",
    position: { x: 2, y: 0, z: -2 },
    rotation: Math.PI / 2,
    length: 4,
    width: 1.2,
    speed: 1.2,
    isActive: true,
    beltColor: 0x555555,
    frameColor: 0x888888,
  },
  // 포장-출고 구간
  {
    id: "conveyor-4",
    name: "컨베이어 #4 (포장-출고)",
    position: { x: 6, y: 0, z: 4 },
    rotation: 0,
    length: 4,
    width: 1.2,
    speed: 1.0,
    isActive: true,
    beltColor: 0x555555,
    frameColor: 0x888888,
  },
  // 재공급-입고 구간 (180도 회전)
  {
    id: "conveyor-5",
    name: "컨베이어 #5 (재공급-입고)",
    position: { x: 0, y: 0, z: 6 },
    rotation: Math.PI,
    length: 12,
    width: 1.2,
    speed: 1.5,
    isActive: true,
    beltColor: 0x555555,
    frameColor: 0x888888,
  },
];

// 공장 경계 정의 (공장 크기)
const FACTORY_BOUNDS = {
  minX: -10,
  maxX: 10,
  minZ: -10,
  maxZ: 10,
};

// 기본 Worker NPC 설정 (고정 작업대 3명 + 순찰 경로 3명)
const DEFAULT_WORKERS: WorkerNPCConfig[] = [
  // 고정 작업대 NPC들 (컨베이어 벨트 옆 또는 앞쪽에 배치)
  {
    id: "worker-1",
    name: "김작업",
    startPosition: { x: -4.5, y: 0, z: -5 }, // 조립 구역 - 컨베이어 벨트 앞쪽, 왼쪽으로 1.5 더 이동
    waypoints: [
      { x: -4.5, y: 0, z: -5, waitTime: 10 },
    ],
    speed: 0,
    initialState: "working",
  },
  {
    id: "worker-2",
    name: "이검수",
    startPosition: { x: 0.5, y: 0, z: -5 }, // 검수 구역 - 컨베이어 벨트 앞쪽, 왼쪽으로 1 더 이동
    waypoints: [
      { x: 0.5, y: 0, z: -5, waitTime: 10 },
    ],
    speed: 0,
    initialState: "working",
  },
  {
    id: "worker-3",
    name: "박포장",
    startPosition: { x: 7, y: 0, z: 3 }, // 포장 구역 - 컨베이어 벨트 앞쪽으로 이동 (z=4 → z=3)
    waypoints: [
      { x: 7, y: 0, z: 3, waitTime: 10 },
    ],
    speed: 0,
    initialState: "working",
  },
  // 순찰 경로 NPC들
  {
    id: "worker-4",
    name: "최관리",
    startPosition: { x: -6, y: 0, z: -6 },
    waypoints: [
      { x: -6, y: 0, z: -6, waitTime: 2 }, // 입고 구역
      { x: 0, y: 0, z: -6, waitTime: 2 }, // 조립 구역
      { x: 2, y: 0, z: -6, waitTime: 2 }, // 검수 구역
      { x: 6, y: 0, z: 2, waitTime: 2 }, // 포장 구역
      { x: 6, y: 0, z: 6, waitTime: 2 }, // 출고 구역
      { x: -6, y: 0, z: 6, waitTime: 2 }, // 재공급 구역
    ],
    speed: 2.0,
    initialState: "walking",
  },
  {
    id: "worker-5",
    name: "정안전",
    startPosition: { x: -8, y: 0, z: -8 },
    waypoints: [
      { x: -8, y: 0, z: -8, waitTime: 3 }, // 남서쪽 모서리
      { x: 8, y: 0, z: -8, waitTime: 3 }, // 남동쪽 모서리
      { x: 8, y: 0, z: 8, waitTime: 3 }, // 북동쪽 모서리
      { x: -8, y: 0, z: 8, waitTime: 3 }, // 북서쪽 모서리
    ],
    speed: 1.8,
    initialState: "walking",
  },
  {
    id: "worker-6",
    name: "강정비",
    startPosition: { x: -4, y: 0, z: -4 },
    waypoints: [
      { x: -4, y: 0, z: -4, waitTime: 2 }, // 컨베이어 1 근처
      { x: 0, y: 0, z: -7, waitTime: 2 }, // 컨베이어 2 근처 (z=-6에서 z=-7로 조정하여 겹침 방지)
      { x: 2, y: 0, z: -2, waitTime: 2 }, // 컨베이어 3 근처
      { x: 8, y: 0, z: 4, waitTime: 2 }, // 컨베이어 4 근처 (x=6에서 x=8로 조정하여 worker-3과 겹침 방지)
      { x: 0, y: 0, z: 6, waitTime: 2 }, // 컨베이어 5 근처
    ],
    speed: 1.5,
    initialState: "walking",
  },
];

// NPC 참조 타입
export interface NPCRef {
  getPosition: () => Vector3;
  setState: (state: NPCState) => void;
  getState: () => NPCState;
}

// 작업자가 특정 컨베이어 벨트 범위 내에 있는지 확인하는 함수
function isWorkerOnBelt(worker: WorkerNPCConfig, belt: ConveyorBeltConfig): boolean {
  // 고정 작업자만 확인 (speed가 0이고 waypoint가 1개)
  if (worker.speed !== 0 || worker.waypoints.length !== 1) {
    return false;
  }

  const workerPos = worker.startPosition;
  const beltPos = belt.position;
  const beltLength = belt.length || 6;
  const beltRotation = belt.rotation || 0;
  const halfLength = beltLength / 2;

  // 벨트의 방향 벡터 계산
  const cos = Math.cos(beltRotation);
  const sin = Math.sin(beltRotation);
  
  // 벨트의 시작점과 끝점 계산 (벨트 중심 기준)
  const beltStartX = beltPos.x - halfLength * cos;
  const beltStartZ = beltPos.z - halfLength * sin;
  const beltEndX = beltPos.x + halfLength * cos;
  const beltEndZ = beltPos.z + halfLength * sin;

  // 작업자 위치를 벨트 좌표계로 변환
  // 벨트 방향으로의 투영 거리 계산
  const dx = workerPos.x - beltPos.x;
  const dz = workerPos.z - beltPos.z;
  
  // 벨트 방향으로의 투영
  const projection = dx * cos + dz * sin;
  
  // 벨트 길이 범위 내에 있는지 확인 (약간의 여유 공간 포함)
  const tolerance = 1.5; // 작업자가 벨트 앞쪽에 서있을 수 있으므로 여유 공간
  if (Math.abs(projection) > halfLength + tolerance) {
    return false;
  }

  // 벨트에 수직인 방향으로의 거리 계산 (작업자가 벨트 앞쪽에 서있는지 확인)
  const perpendicular = -dx * sin + dz * cos;
  
  // 작업자가 벨트 앞쪽에 서있는지 확인 (perpendicular가 음수면 앞쪽)
  // 벨트 앞쪽 0.5 ~ 2.0 범위 내에 있으면 해당 벨트의 작업자로 간주
  if (perpendicular > 0.5 || perpendicular < -2.0) {
    return false;
  }

  return true;
}

// 컨베이어 벨트의 시작점과 끝점, 그리고 앞쪽 방향을 계산하는 함수
function calculateBeltRange(belt: ConveyorBeltConfig): {
  start: { x: number; z: number };
  end: { x: number; z: number };
  frontDirection: { x: number; z: number };
  length: number;
} {
  const beltPos = belt.position;
  const beltLength = belt.length || 6;
  const beltRotation = belt.rotation || 0;
  const halfLength = beltLength / 2;

  // 벨트의 방향 벡터 (벨트가 향하는 방향)
  const cos = Math.cos(beltRotation);
  const sin = Math.sin(beltRotation);

  // 벨트의 시작점과 끝점 (벨트 중심 기준)
  const startX = beltPos.x - halfLength * cos;
  const startZ = beltPos.z - halfLength * sin;
  const endX = beltPos.x + halfLength * cos;
  const endZ = beltPos.z + halfLength * sin;

  // 벨트 앞쪽 방향 (작업자가 서는 방향) - 벨트 방향에 수직인 방향
  // rotation이 0이면 z축 음수 방향, rotation이 PI/2이면 x축 음수 방향
  const frontX = -sin;
  const frontZ = -cos;

  return {
    start: { x: startX, z: startZ },
    end: { x: endX, z: endZ },
    frontDirection: { x: frontX, z: frontZ },
    length: beltLength,
  };
}

// FactoryScene 외부 제어 인터페이스
export interface FactorySceneRef {
  // 작업자 추가
  addWorker: (name: string, beltId: string) => void;
  // 감독 추가
  addSupervisor: (name: string) => void;
  // 컨베이어 벨트 목록 가져오기
  getConveyorBelts: () => ConveyorBeltConfig[];
  // 씬 매니저 가져오기 (CCTV 헬퍼 추가용)
  getSceneManager: () => SceneManager | null;
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
  // 전역 씬 사용 여부 (GlobalSceneProvider의 씬 사용)
  useGlobalScene?: boolean;
  // 외부 SceneManager 사용 (전역 씬 우선)
  externalSceneManager?: SceneManager;
  // 추가 CSS 클래스
  className?: string;
}

/**
 * 공장 씬 통합 컴포넌트
 */
export const FactoryScene = forwardRef<FactorySceneRef, FactorySceneProps>(({
  debug = false,
  conveyorBelts: initialConveyorBelts = DEFAULT_CONVEYOR_BELTS,
  workers: initialWorkers = DEFAULT_WORKERS,
  onSceneReady,
  onWorkerStateChange,
  onBoxCompleted,
  onNPCRefsReady,
  useGlobalScene = false,
  externalSceneManager,
  className = "",
  showNPCLabels = true,
}, ref) => {
  // 컴포넌트 마운트 확인
  useEffect(() => {
    console.log("[FactoryScene] 컴포넌트 마운트됨, useGlobalScene:", useGlobalScene);
  }, [useGlobalScene]);
  
  // 전역 스토어에서 workers와 conveyorBelts 가져오기 (전역 씬 사용 시)
  const globalWorkersFromStore = useSceneStore((state) => state.workers);
  const globalConveyorBeltsFromStore = useSceneStore((state) => state.conveyorBelts);
  
  // 동적 컨베이어 벨트 및 작업자 관리
  // 전역 씬 사용 시 전역 스토어의 데이터를 우선 사용, 아니면 초기값 사용
  const [conveyorBelts, setConveyorBelts] = useState<ConveyorBeltConfig[]>(() => {
    // 전역 씬 사용 시: 전역 스토어에 데이터가 있으면 사용, 없으면 초기값 사용
    if (useGlobalScene) {
      if (globalConveyorBeltsFromStore.length > 0) {
        return globalConveyorBeltsFromStore;
      }
      // 전역 스토어가 비어있으면 초기값 사용
      return initialConveyorBelts.map((belt, index) => ({
        ...belt,
        name: belt.name || generateBeltName(belt.id, index),
      }));
    }
    // 로컬 씬 사용 시: 초기값 사용
    return initialConveyorBelts.map((belt, index) => ({
      ...belt,
      name: belt.name || generateBeltName(belt.id, index),
    }));
  });
  const [workers, setWorkers] = useState<WorkerNPCConfig[]>(() => {
    // 전역 씬 사용 시: 전역 스토어에 데이터가 있으면 사용, 없으면 초기값 사용
    if (useGlobalScene) {
      if (globalWorkersFromStore.length > 0) {
        return globalWorkersFromStore;
      }
      // 전역 스토어가 비어있으면 초기값 사용
      return initialWorkers.map((worker, index) => ({
        ...worker,
        name: worker.name || generateNPCName(worker.id, index),
      }));
    }
    // 로컬 씬 사용 시: 초기값 사용
    return initialWorkers.map((worker, index) => ({
      ...worker,
      name: worker.name || generateNPCName(worker.id, index),
    }));
  });
  
  // 전역 스토어 setter 함수 가져오기
  const setGlobalWorkers = useSceneStore((state) => state.setWorkers);
  const setGlobalConveyorBelts = useSceneStore((state) => state.setConveyorBelts);
  
  // 전역 씬 사용 시 초기값을 전역 스토어에 설정 (한 번만 실행)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (useGlobalScene && !initializedRef.current) {
      // 전역 스토어가 비어있고 로컬 상태에 초기값이 있으면 전역 스토어에 설정
      if (globalWorkersFromStore.length === 0 && workers.length > 0) {
        console.log("[FactoryScene] 전역 스토어에 초기 workers 설정:", workers.length);
        setGlobalWorkers(workers);
        initializedRef.current = true;
      }
      if (globalConveyorBeltsFromStore.length === 0 && conveyorBelts.length > 0) {
        console.log("[FactoryScene] 전역 스토어에 초기 conveyorBelts 설정:", conveyorBelts.length);
        setGlobalConveyorBelts(conveyorBelts);
      }
    }
  }, [useGlobalScene, workers.length, conveyorBelts.length, globalWorkersFromStore.length, globalConveyorBeltsFromStore.length, setGlobalWorkers, setGlobalConveyorBelts]);
  
  // 전역 스토어의 workers가 변경되면 로컬 상태도 업데이트 (전역 씬 사용 시)
  // useRef로 이전 값을 추적하여 실제 변경 시에만 업데이트 (무한 루프 방지)
  const prevGlobalWorkersRef = useRef<string>("");
  const prevGlobalBeltsRef = useRef<string>("");
  
  useEffect(() => {
    if (useGlobalScene && globalWorkersFromStore.length > 0) {
      // JSON.stringify로 비교하여 실제 변경 여부 확인
      const globalWorkersStr = JSON.stringify(globalWorkersFromStore);
      if (prevGlobalWorkersRef.current !== globalWorkersStr) {
        prevGlobalWorkersRef.current = globalWorkersStr;
        setWorkers(globalWorkersFromStore);
      }
    }
  }, [useGlobalScene, globalWorkersFromStore]);
  
  useEffect(() => {
    if (useGlobalScene && globalConveyorBeltsFromStore.length > 0) {
      // JSON.stringify로 비교하여 실제 변경 여부 확인
      const globalBeltsStr = JSON.stringify(globalConveyorBeltsFromStore);
      if (prevGlobalBeltsRef.current !== globalBeltsStr) {
        prevGlobalBeltsRef.current = globalBeltsStr;
        setConveyorBelts(globalConveyorBeltsFromStore);
      }
    }
  }, [useGlobalScene, globalConveyorBeltsFromStore]);
  const workerIdCounter = useRef(initialWorkers.length);
  // 컨테이너 ref (전역 씬 사용 시 렌더러 이동용)
  const containerRef = useRef<HTMLDivElement>(null);
  // Raycaster (더블클릭 감지용)
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  
  // 전역 씬 매니저 및 NPC 참조 가져오기
  const globalSceneManager = useSceneStore((state) => state.sceneManager);
  const globalNPCRefs = useSceneStore((state) => state.npcRefs);
  const globalWorkers = useSceneStore((state) => state.workers);
  const globalConveyorBelts = useSceneStore((state) => state.conveyorBelts);
  
  // SceneManager 결정: external > global > local
  const resolvedSceneManager = externalSceneManager || (useGlobalScene ? globalSceneManager : null);
  
  // 로컬 SceneManager 상태 (전역 씬 미사용 시에만 사용)
  const [localSceneManager, setLocalSceneManager] = useState<SceneManager | null>(null);
  
  // 최종 SceneManager (전역 씬 또는 로컬 씬)
  const sceneManager = resolvedSceneManager || localSceneManager;
  
  // 전역 씬 사용 시 디버깅 로그
  useEffect(() => {
    if (useGlobalScene) {
      console.log("[FactoryScene] 전역 씬 상태:", {
        globalSceneManager: !!globalSceneManager,
        resolvedSceneManager: !!resolvedSceneManager,
        sceneManager: !!sceneManager,
        workers: workers.length,
        conveyorBelts: conveyorBelts.length,
        containerRef: !!containerRef.current,
      });
    }
  }, [useGlobalScene, globalSceneManager, resolvedSceneManager, sceneManager, workers.length, conveyorBelts.length]);
  
  // NPC 참조 맵
  const npcRefs = useRef<Map<string, NPCRef>>(new Map());
  
  // ResizeObserver ref (전역 씬 렌더러 크기 조정용)
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // 씬 준비 완료 핸들러 (로컬 씬용)
  const handleSceneReady = useCallback(
    (manager: SceneManager) => {
      console.log("[FactoryScene] handleSceneReady 호출됨, manager:", !!manager);
      setLocalSceneManager(manager);
      if (onSceneReady) {
        console.log("[FactoryScene] onSceneReady 콜백 호출");
        onSceneReady(manager);
      } else {
        console.warn("[FactoryScene] onSceneReady 콜백이 없음");
      }
    },
    [onSceneReady]
  );
  
  // 전역 씬 매니저가 준비되면 콜백 호출 및 렌더러 이동
  useEffect(() => {
    if (useGlobalScene) {
      console.log("[FactoryScene] 전역 씬 사용 중, resolvedSceneManager:", !!resolvedSceneManager, "containerRef:", !!containerRef.current);
      if (resolvedSceneManager && containerRef.current) {
        // 전역 씬이 준비되면 콜백 호출
        console.log("[FactoryScene] 전역 씬 매니저 준비됨, 렌더러 이동 시작");
        onSceneReady?.(resolvedSceneManager);
        
        // 렌더러의 DOM 요소를 현재 컨테이너로 이동
        const rendererDomElement = resolvedSceneManager.renderer.domElement;
        const currentContainer = containerRef.current;
        
        // 기존 컨테이너에서 제거 (다른 페이지에서 사용 중일 수 있음)
        if (rendererDomElement.parentElement) {
          rendererDomElement.parentElement.removeChild(rendererDomElement);
        }
        
        // 현재 컨테이너에 추가
        currentContainer.appendChild(rendererDomElement);
        
        // 렌더러 크기 조정
        rendererDomElement.style.width = "100%";
        rendererDomElement.style.height = "100%";
        
        // 컨테이너 업데이트 (SceneManager의 컨테이너를 새 컨테이너로 설정)
        resolvedSceneManager.updateContainer(currentContainer);
        
        // ResizeObserver로 컨테이너 크기 변화 감지
        resizeObserverRef.current = new ResizeObserver(() => {
          if (containerRef.current && resolvedSceneManager) {
            // handleResize는 현재 컨테이너의 크기를 자동으로 감지하여 조정
            resolvedSceneManager.handleResize(containerRef.current);
          }
        });
        resizeObserverRef.current.observe(currentContainer);
        
        console.log("[FactoryScene] 전역 씬 렌더러를 현재 컨테이너로 이동");
        
        // 클린업: 렌더러 DOM 요소 제거 (컨테이너는 유지)
        return () => {
          if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
            resizeObserverRef.current = null;
          }
          
          // 렌더러 DOM 요소 제거 (null 체크 추가)
          if (containerRef.current && rendererDomElement.parentElement === containerRef.current) {
            try {
              containerRef.current.removeChild(rendererDomElement);
            } catch (e) {
              // 이미 제거되었을 수 있음
              console.log("[FactoryScene] 렌더러 DOM 요소 제거 완료 또는 이미 제거됨");
            }
          }
        };
      }
    }
  }, [useGlobalScene, resolvedSceneManager, onSceneReady]);

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
    (npcId: string, getPosition: () => Vector3, setState: (state: NPCState) => void, getState: () => NPCState) => {
      console.log(`[FactoryScene] NPC 참조 등록: ${npcId}, getState 존재: ${!!getState}, getState 타입: ${typeof getState}`);
      if (getState) {
        const testState = getState();
        console.log(`[FactoryScene] NPC ${npcId} 초기 상태: ${testState}`);
      }
      npcRefs.current.set(npcId, { getPosition, setState, getState });
      
      // 전역 씬 사용 시 전역 스토어의 npcRefs도 업데이트
      if (useGlobalScene) {
        const currentGlobalNPCRefs = new Map(globalNPCRefs);
        currentGlobalNPCRefs.set(npcId, { getPosition, setState, getState });
        useSceneStore.getState().setNPCRefs(currentGlobalNPCRefs);
      }
      
      // NPC 참조가 준비되면 콜백 호출 (useRef를 통해 안정적인 참조 사용)
      if (onNPCRefsReadyRef.current) {
        onNPCRefsReadyRef.current(npcRefs.current, findNearestNPCRef.current);
      }
    },
    [useGlobalScene, globalNPCRefs] // 전역 씬 사용 시 의존성 추가
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

  // 작업자 추가 함수
  const addWorker = useCallback((name: string, beltId: string) => {
    const belt = conveyorBelts.find((b) => b.id === beltId);
    if (!belt) {
      console.error(`[FactoryScene] 컨베이어 벨트를 찾을 수 없습니다: ${beltId}`);
      return;
    }

    setWorkers((prev) => {
      // 같은 컨베이어 벨트에 있는 기존 작업자들 찾기
      const workersOnBelt = prev.filter((worker) => isWorkerOnBelt(worker, belt));
      
      // 컨베이어 벨트의 범위 계산
      const beltRange = calculateBeltRange(belt);
      
      // 새 작업자를 포함한 총 작업자 수
      const totalWorkers = workersOnBelt.length + 1;
      
      // 컨베이어 벨트 길이를 작업자 수로 나누어 각 위치 계산
      // 시작점부터 끝점까지 균등하게 분할
      const spacing = beltRange.length / totalWorkers;
      
      // 벨트 방향 벡터 (시작점에서 끝점으로)
      const directionX = beltRange.end.x - beltRange.start.x;
      const directionZ = beltRange.end.z - beltRange.start.z;
      const directionLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
      const normalizedDirX = directionLength > 0 ? directionX / directionLength : 0;
      const normalizedDirZ = directionLength > 0 ? directionZ / directionLength : 0;
      
      // 작업자 위치 재배치
      const updatedWorkers = prev.map((worker) => {
        // 같은 컨베이어에 있는 작업자만 재배치
        if (!isWorkerOnBelt(worker, belt)) {
          return worker;
        }
        
        // 작업자의 인덱스 찾기 (기존 작업자들 중에서)
        const workerIndex = workersOnBelt.findIndex((w) => w.id === worker.id);
        if (workerIndex === -1) {
          return worker;
        }
        
        // 새 작업자가 마지막에 추가되므로, 기존 작업자들은 0부터 workersOnBelt.length-1까지의 인덱스
        // 위치 계산: 시작점 + (인덱스 + 0.5) * spacing * 방향
        const positionOffset = (workerIndex + 0.5) * spacing;
        const newX = beltRange.start.x + positionOffset * normalizedDirX;
        const newZ = beltRange.start.z + positionOffset * normalizedDirZ;
        
        // 벨트 앞쪽으로 오프셋 (작업자가 서는 위치)
        const frontOffset = 1.0; // 벨트 앞쪽 1.0 단위
        const finalX = newX + beltRange.frontDirection.x * frontOffset;
        const finalZ = newZ + beltRange.frontDirection.z * frontOffset;
        
        return {
          ...worker,
          startPosition: { x: finalX, y: 0, z: finalZ },
          waypoints: [
            { x: finalX, y: 0, z: finalZ, waitTime: 10 },
          ],
        };
      });
      
      // 새 작업자 추가 (마지막 위치)
      const newWorkerIndex = workersOnBelt.length;
      const positionOffset = (newWorkerIndex + 0.5) * spacing;
      const newX = beltRange.start.x + positionOffset * normalizedDirX;
      const newZ = beltRange.start.z + positionOffset * normalizedDirZ;
      
      // 벨트 앞쪽으로 오프셋
      const frontOffset = 1.0;
      const finalX = newX + beltRange.frontDirection.x * frontOffset;
      const finalZ = newZ + beltRange.frontDirection.z * frontOffset;
      
      const newWorker: WorkerNPCConfig = {
        id: `worker-${++workerIdCounter.current}`,
        name,
        startPosition: { x: finalX, y: 0, z: finalZ },
        waypoints: [
          { x: finalX, y: 0, z: finalZ, waitTime: 10 },
        ],
        speed: 0,
        initialState: "working",
      };
      
      const updated = [...updatedWorkers, newWorker];
      
      // 전역 스토어도 항상 업데이트 (대시보드 인원 수 표시용)
      setGlobalWorkers(updated);
      console.log(`[FactoryScene] 작업자 추가: ${name} (${belt.name || beltId}), 같은 벨트 작업자 수: ${totalWorkers}, 로컬 workers 수: ${updated.length}`);
      
      return updated;
    });
  }, [conveyorBelts, setGlobalWorkers]);

  // 감독 추가 함수
  const addSupervisor = useCallback((name: string) => {
    // 기존 NPC들의 위치 수집 (시작 위치와 waypoint 위치 모두)
    const occupiedPositions = new Set<string>();
    workers.forEach((worker) => {
      // 시작 위치
      const startKey = `${worker.startPosition.x.toFixed(1)},${worker.startPosition.z.toFixed(1)}`;
      occupiedPositions.add(startKey);
      // Waypoint 위치들
      worker.waypoints.forEach((wp) => {
        const wpKey = `${wp.x.toFixed(1)},${wp.z.toFixed(1)}`;
        occupiedPositions.add(wpKey);
      });
    });

    // 사용 가능한 순찰 경로 후보들 (공장 외곽)
    const candidateRoutes = [
      // 북쪽 경로
      [
        { x: -8, y: 0, z: 8, waitTime: 2 },
        { x: 0, y: 0, z: 8, waitTime: 2 },
        { x: 8, y: 0, z: 8, waitTime: 2 },
        { x: 8, y: 0, z: 0, waitTime: 2 },
        { x: -8, y: 0, z: 0, waitTime: 2 },
      ],
      // 남쪽 경로
      [
        { x: -8, y: 0, z: -8, waitTime: 2 },
        { x: 0, y: 0, z: -8, waitTime: 2 },
        { x: 8, y: 0, z: -8, waitTime: 2 },
        { x: 8, y: 0, z: 0, waitTime: 2 },
        { x: -8, y: 0, z: 0, waitTime: 2 },
      ],
      // 동쪽 경로
      [
        { x: 8, y: 0, z: -8, waitTime: 2 },
        { x: 8, y: 0, z: 0, waitTime: 2 },
        { x: 8, y: 0, z: 8, waitTime: 2 },
        { x: 0, y: 0, z: 8, waitTime: 2 },
        { x: 0, y: 0, z: -8, waitTime: 2 },
      ],
      // 서쪽 경로
      [
        { x: -8, y: 0, z: -8, waitTime: 2 },
        { x: -8, y: 0, z: 0, waitTime: 2 },
        { x: -8, y: 0, z: 8, waitTime: 2 },
        { x: 0, y: 0, z: 8, waitTime: 2 },
        { x: 0, y: 0, z: -8, waitTime: 2 },
      ],
      // 대각선 경로 1
      [
        { x: -9, y: 0, z: -9, waitTime: 2 },
        { x: 0, y: 0, z: -9, waitTime: 2 },
        { x: 9, y: 0, z: 0, waitTime: 2 },
        { x: 0, y: 0, z: 9, waitTime: 2 },
        { x: -9, y: 0, z: 0, waitTime: 2 },
      ],
      // 대각선 경로 2
      [
        { x: 9, y: 0, z: -9, waitTime: 2 },
        { x: 9, y: 0, z: 0, waitTime: 2 },
        { x: 0, y: 0, z: 9, waitTime: 2 },
        { x: -9, y: 0, z: 0, waitTime: 2 },
        { x: -9, y: 0, z: -9, waitTime: 2 },
      ],
    ];

    // 충돌하지 않는 경로 찾기
    let selectedRoute = candidateRoutes[0]; // 기본값
    for (const route of candidateRoutes) {
      const hasCollision = route.some((wp) => {
        const wpKey = `${wp.x.toFixed(1)},${wp.z.toFixed(1)}`;
        return occupiedPositions.has(wpKey);
      });
      if (!hasCollision) {
        selectedRoute = route;
        break;
      }
    }

    const newSupervisor: WorkerNPCConfig = {
      id: `worker-${++workerIdCounter.current}`,
      name,
      startPosition: selectedRoute[0],
      waypoints: selectedRoute,
      speed: 2.0,
      initialState: "walking",
    };

    setWorkers((prev) => {
      const updated = [...prev, newSupervisor];
      // 전역 스토어도 항상 업데이트 (대시보드 인원 수 표시용)
      setGlobalWorkers(updated);
      console.log(`[FactoryScene] 감독 추가: ${name}, 로컬 workers 수: ${updated.length}, 시작 위치: (${selectedRoute[0].x}, ${selectedRoute[0].z})`);
      return updated;
    });
  }, [workers, setGlobalWorkers]);

  // 더블클릭 이벤트 처리
  useEffect(() => {
    const sceneManager = resolvedSceneManager || localSceneManager;
    if (!sceneManager || !containerRef.current) return;

    // Raycaster 초기화
    raycasterRef.current = new THREE.Raycaster();

    const handleDoubleClick = (event: MouseEvent) => {
      if (!raycasterRef.current || !sceneManager) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      // 마우스 좌표를 정규화된 디바이스 좌표로 변환
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycaster 설정
      raycasterRef.current.setFromCamera(mouse, sceneManager.camera);

      // 씬의 모든 객체와 교차 검사
      const intersects = raycasterRef.current.intersectObjects(sceneManager.scene.children, true);

      if (intersects.length > 0) {
        const intersected = intersects[0].object;
        
        // NPC 확인 (worker-npc-로 시작하는 그룹)
        let current: THREE.Object3D | null = intersected;
        while (current) {
          if (current.name.startsWith("worker-npc-")) {
            const npcId = current.name.replace("worker-npc-", "");
            // 전역 씬 사용 시 전역 스토어의 workers 사용, 아니면 로컬 workers 사용
            const workersToSearch = useGlobalScene ? globalWorkers : workers;
            const npc = workersToSearch.find((w) => w.id === npcId);
            if (npc) {
              // 전역 씬 사용 시 전역 스토어에서 NPC 참조 가져오기, 아니면 로컬 npcRefs 사용
              const npcRef = (useGlobalScene ? globalNPCRefs : npcRefs.current).get(npcId);
              if (!npcRef) {
                console.warn(`[FactoryScene] NPC 참조를 찾을 수 없습니다: ${npcId}, 전역 씬: ${useGlobalScene}, 전역 참조 수: ${globalNPCRefs?.size || 0}, 로컬 참조 수: ${npcRefs.current.size}`);
                toast.info(`👤 ${npc.name || "이름 없음"}`, {
                  description: `ID: ${npcId}\n위치: 알 수 없음\n상태: 알 수 없음 (참조 없음)`,
                  duration: 3000,
                });
                return;
              }
              const position = npcRef.getPosition() || { x: 0, y: 0, z: 0 };
              console.log(`[FactoryScene] NPC 더블클릭: ${npcId}, getState 존재: ${!!npcRef.getState}, 타입: ${typeof npcRef.getState}`);
              const state = npcRef.getState ? npcRef.getState() : "알 수 없음";
              console.log(`[FactoryScene] NPC 상태 조회 결과: ${state}`);
              const stateLabels: Record<string, string> = {
                idle: "대기",
                walking: "이동 중",
                working: "작업 중",
                injured: "부상",
                waiting: "대기 중",
              };
              toast.info(`👤 ${npc.name || "이름 없음"}`, {
                description: `ID: ${npcId}\n위치: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})\n상태: ${stateLabels[state] || state}`,
                duration: 3000,
              });
              return;
            }
          }
          
          // 컨베이어 벨트 확인 (conveyor-belt-로 시작하는 그룹)
          if (current.name.startsWith("conveyor-belt-")) {
            const beltId = current.name.replace("conveyor-belt-", "");
            // 전역 씬 사용 시 전역 스토어의 conveyorBelts 사용, 아니면 로컬 conveyorBelts 사용
            const beltsToSearch = useGlobalScene ? globalConveyorBelts : conveyorBelts;
            const belt = beltsToSearch.find((b) => b.id === beltId);
            if (belt) {
              toast.info(`📦 ${belt.name || "이름 없음"}`, {
                description: `ID: ${beltId}\n위치: (${belt.position.x.toFixed(1)}, ${belt.position.y.toFixed(1)}, ${belt.position.z.toFixed(1)})\n속도: ${belt.speed || 1.0}x\n상태: ${belt.isActive ? "활성" : "비활성"}`,
                duration: 3000,
              });
              return;
            }
          }
          
          current = current.parent;
        }
      }
    };

    const container = containerRef.current;
    container.addEventListener("dblclick", handleDoubleClick);

    return () => {
      container.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [resolvedSceneManager, localSceneManager, workers, conveyorBelts, npcRefs, useGlobalScene, globalNPCRefs, globalWorkers, globalConveyorBelts]);

  // 외부 제어 인터페이스 노출
  useImperativeHandle(ref, () => ({
    addWorker,
    addSupervisor,
    getConveyorBelts: () => conveyorBelts,
    getSceneManager: () => resolvedSceneManager || localSceneManager,
  }), [addWorker, addSupervisor, conveyorBelts, resolvedSceneManager, localSceneManager]);

  // 렌더링 로직 디버깅
  useEffect(() => {
    console.log("[FactoryScene] 렌더링 상태:", {
      useGlobalScene,
      resolvedSceneManager: !!resolvedSceneManager,
      localSceneManager: !!localSceneManager,
      sceneManager: !!sceneManager,
      externalSceneManager: !!externalSceneManager,
      shouldRenderLocal: !externalSceneManager && (!useGlobalScene || !resolvedSceneManager),
      workers: workers.length,
      conveyorBelts: conveyorBelts.length,
    });
  }, [useGlobalScene, resolvedSceneManager, localSceneManager, sceneManager, externalSceneManager, workers.length, conveyorBelts.length]);

  return (
    <div ref={containerRef} className={`relative h-full w-full ${className}`}>
      {/* WebGPU 캔버스 (전역 씬 미사용 시 또는 전역 씬이 아직 준비되지 않았을 때 표시) */}
      {/* 전역 씬이 준비되지 않았을 때는 로컬 씬을 사용하여 폴백 */}
      {!externalSceneManager && (!useGlobalScene || !resolvedSceneManager) && (
        <WebGPUCanvas
          debug={debug}
          backgroundColor={0x1a1a2e}
          enableShadows={true}
          onSceneReady={handleSceneReady}
          onError={handleError}
        />
      )}
      
      {/* 전역 씬 사용 시 렌더러가 준비되지 않았을 때 로딩 표시 */}
      {useGlobalScene && !resolvedSceneManager && (
        <div className="absolute inset-0 flex items-center justify-center bg-control-primary">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">전역 씬 초기화 중...</p>
          </div>
        </div>
      )}

      {/* SceneManager가 준비되면 3D 오브젝트 렌더링 */}
      {/* NPC와 컨베이어 벨트 렌더링 (전역 씬 사용 시에도 렌더링) */}
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
          {workers.map((worker) => {
            console.log(`[FactoryScene] WorkerNPC 렌더링: ${worker.id} - ${worker.name}`);
            return (
              <WorkerNPC
                key={worker.id}
                config={worker}
                sceneManager={sceneManager}
                onStateChange={handleWorkerStateChange}
                conveyorBelts={simplifiedBelts}
                onRegister={handleNPCRegister}
                factoryBounds={FACTORY_BOUNDS}
                nameLabelContainer={showNPCLabels ? containerRef.current : null}
              />
            );
          })}
        </>
      )}
    </div>
  );
});

FactoryScene.displayName = "FactoryScene";

export default FactoryScene;
