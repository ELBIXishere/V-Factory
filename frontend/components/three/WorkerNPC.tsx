"use client";

/**
 * WorkerNPC 컴포넌트
 * 공장 작업자 NPC - Waypoint 기반 이동, 상태별 색상
 */

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { SceneManager } from "@/lib/three";
import { NPCNameLabel } from "./NPCNameLabel";

// NPC 상태 타입
export type NPCState = "working" | "idle" | "injured" | "walking" | "waiting";

// Waypoint 타입
export interface Waypoint {
  x: number;
  y: number;
  z: number;
  waitTime?: number; // 해당 지점에서 대기 시간 (초)
}

// NPC 설정
export interface WorkerNPCConfig {
  // 고유 ID
  id: string;
  // 시작 위치
  startPosition: { x: number; y: number; z: number };
  // 이동 경로 (Waypoint 배열)
  waypoints: Waypoint[];
  // 이동 속도
  speed?: number;
  // 초기 상태
  initialState?: NPCState;
  // 이름 (표시용)
  name?: string;
}

// 상태별 색상 정의
const STATE_COLORS: Record<NPCState, number> = {
  working: 0x2196f3, // 파랑 - 작업 중
  idle: 0x9e9e9e, // 회색 - 대기
  injured: 0xf44336, // 빨강 - 부상
  walking: 0x4caf50, // 녹색 - 이동 중
  waiting: 0xffeb3b, // 노란색 - 대기 및 재탐색 중
};

// 컨베이어 벨트 설정 타입 (간단한 버전)
export interface ConveyorBeltConfig {
  x: number;
  z: number;
  length: number;
  width: number;
}

// 레이-벨트 교차 검사: 레이와 벨트 AABB 간 교차 검사 (2D XZ 평면)
interface Ray {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
}

interface RayBeltIntersection {
  belt: ConveyorBeltConfig;
  distance: number;
  point: THREE.Vector3;
}

function checkRayBeltIntersection(
  ray: Ray,
  conveyorBelts: ConveyorBeltConfig[],
  npcRadius: number
): RayBeltIntersection | null {
  let closestIntersection: RayBeltIntersection | null = null;
  let closestDistance = Infinity;

  for (const belt of conveyorBelts) {
    if (belt.x === undefined || belt.z === undefined || belt.length === undefined || belt.width === undefined) {
      continue;
    }

    // 벨트 AABB 계산 (NPC 반경 고려)
    const halfLength = belt.length / 2;
    const halfWidth = belt.width / 2;
    const beltMinX = belt.x - halfLength - npcRadius;
    const beltMaxX = belt.x + halfLength + npcRadius;
    const beltMinZ = belt.z - halfWidth - npcRadius;
    const beltMaxZ = belt.z + halfWidth + npcRadius;

    // 레이의 시작점과 끝점 (XZ 평면)
    const rayStart = ray.origin;
    const rayEnd = ray.origin.clone().add(ray.direction.clone().multiplyScalar(ray.length));

    // 레이-AABB 교차 검사 (Slab 방법)
    const dirX = ray.direction.x;
    const dirZ = ray.direction.z;

    // X축 슬랩 검사
    let tMinX = (beltMinX - rayStart.x) / (dirX !== 0 ? dirX : 0.0001);
    let tMaxX = (beltMaxX - rayStart.x) / (dirX !== 0 ? dirX : 0.0001);
    if (tMinX > tMaxX) [tMinX, tMaxX] = [tMaxX, tMinX];

    // Z축 슬랩 검사
    let tMinZ = (beltMinZ - rayStart.z) / (dirZ !== 0 ? dirZ : 0.0001);
    let tMaxZ = (beltMaxZ - rayStart.z) / (dirZ !== 0 ? dirZ : 0.0001);
    if (tMinZ > tMaxZ) [tMinZ, tMaxZ] = [tMaxZ, tMinZ];

    // 교차 확인
    const tMin = Math.max(tMinX, tMinZ);
    const tMax = Math.min(tMaxX, tMaxZ);

    // 교차 조건: tMin <= tMax && tMax >= 0 && tMin <= ray.length
    if (tMin <= tMax && tMax >= 0 && tMin <= ray.length) {
      const intersectionT = Math.max(0, tMin);
      const intersectionPoint = rayStart.clone().add(ray.direction.clone().multiplyScalar(intersectionT));
      const distance = intersectionT;

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIntersection = {
          belt,
          distance,
          point: intersectionPoint,
        };
      }
    }
  }

  return closestIntersection;
}

// 충돌한 면의 법선 계산: AABB의 네 면 중 가장 가까운 면의 법선 반환 (코너 보간 포함)
function calculateFaceNormal(
  npcPos: THREE.Vector3,
  beltMinX: number,
  beltMaxX: number,
  beltMinZ: number,
  beltMaxZ: number
): THREE.Vector3 {
  // 각 면까지의 거리 계산
  const distToMinX = npcPos.x - beltMinX;
  const distToMaxX = beltMaxX - npcPos.x;
  const distToMinZ = npcPos.z - beltMinZ;
  const distToMaxZ = beltMaxZ - npcPos.z;
  
  // 각 면의 법선과 거리를 배열로 저장
  const distances = [
    { dist: distToMinX, normal: new THREE.Vector3(-1, 0, 0) }, // 왼쪽 면
    { dist: distToMaxX, normal: new THREE.Vector3(1, 0, 0) },  // 오른쪽 면
    { dist: distToMinZ, normal: new THREE.Vector3(0, 0, -1) }, // 뒤쪽 면
    { dist: distToMaxZ, normal: new THREE.Vector3(0, 0, 1) },  // 앞쪽 면
  ];
  
  // 거리순으로 정렬
  distances.sort((a, b) => a.dist - b.dist);
  const closest = distances[0];
  const second = distances[1];
  
  // Corner Normal Smoothing: 두 면의 거리가 비슷할 때 (차이가 0.3 이내)
  const CORNER_THRESHOLD = 0.3;
  if (second.dist - closest.dist < CORNER_THRESHOLD) {
    // 두 면의 법선 보간하여 부드러운 대각선 방향 생성
    const totalDist = closest.dist + second.dist;
    const t = totalDist > 0.001 ? closest.dist / totalDist : 0.5;
    const smoothedNormal = closest.normal.clone().lerp(second.normal, 1 - t);
    return smoothedNormal.normalize();
  }
  
  // 코너가 아니면 가장 가까운 면의 법선 반환
  return closest.normal;
}

// 벨트 법선 계산: 충돌한 면의 법선을 기준으로 회피 방향 계산 (좌/우 회피)
function calculateBeltNormal(
  npcPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  belt: ConveyorBeltConfig,
  beltMinX: number,
  beltMaxX: number,
  beltMinZ: number,
  beltMaxZ: number
): THREE.Vector3 {
  // 충돌한 면의 법선 계산
  const faceNormal = calculateFaceNormal(npcPos, beltMinX, beltMaxX, beltMinZ, beltMaxZ);
  
  // NPC에서 목표로의 방향
  const toTarget = targetPos.clone().sub(npcPos);
  const toTargetNormalized = toTarget.length() > 0.001 ? toTarget.clone().normalize() : new THREE.Vector3(0, 0, 1);
  
  // 면 법선에 수직인 두 방향 계산 (XZ 평면에서 90도 회전)
  const perpendicular1 = new THREE.Vector3(-faceNormal.z, 0, faceNormal.x);
  const perpendicular2 = perpendicular1.clone().negate();
  
  // 목표 방향과 더 가까운 방향 선택
  const dot1 = perpendicular1.dot(toTargetNormalized);
  const dot2 = perpendicular2.dot(toTargetNormalized);
  
  // 더 자연스러운 방향 선택 (목표 방향과 더 가까운 각도)
  return dot1 > dot2 ? perpendicular1 : perpendicular2;
}

// 가장 가까운 안전한 waypoint 찾기: 벨트에서 충분히 멀리 떨어진 waypoint
function findNearestSafeWaypoint(
  currentPos: THREE.Vector3,
  waypoints: Waypoint[],
  conveyorBelts: ConveyorBeltConfig[],
  npcRadius: number,
  minSafeDistance: number = 2.0
): Waypoint | null {
  let nearestWaypoint: Waypoint | null = null;
  let nearestDistance = Infinity;

  for (const waypoint of waypoints) {
    const waypointPos = new THREE.Vector3(waypoint.x, 0, waypoint.z);
    const distance = currentPos.distanceTo(waypointPos);

    // 벨트와의 거리 확인
    let isSafe = true;
    for (const belt of conveyorBelts) {
      if (belt.x === undefined || belt.z === undefined || belt.length === undefined || belt.width === undefined) {
        continue;
      }

      const beltCenter = new THREE.Vector3(belt.x, 0, belt.z);
      const halfLength = belt.length / 2;
      const halfWidth = belt.width / 2;
      const beltSize = Math.max(halfLength, halfWidth);
      const distanceToBelt = waypointPos.distanceTo(beltCenter) - beltSize - npcRadius;

      if (distanceToBelt < minSafeDistance) {
        isSafe = false;
        break;
      }
    }

    // 안전하고 가장 가까운 waypoint 선택
    if (isSafe && distance < nearestDistance) {
      nearestDistance = distance;
      nearestWaypoint = waypoint;
    }
  }

  return nearestWaypoint;
}

// 공장 경계 타입
export interface FactoryBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// 컴포넌트 Props
export interface WorkerNPCProps {
  config: WorkerNPCConfig;
  sceneManager: SceneManager;
  // 상태 변경 콜백
  onStateChange?: (npcId: string, newState: NPCState) => void;
  // Waypoint 도착 콜백
  onWaypointReached?: (npcId: string, waypointIndex: number) => void;
  // 컨베이어 벨트 설정 (충돌 감지용)
  conveyorBelts?: ConveyorBeltConfig[];
  // NPC 참조 등록 콜백 (위치 및 상태 제어용)
  onRegister?: (npcId: string, getPosition: () => { x: number; y: number; z: number }, setState: (state: NPCState) => void, getState: () => NPCState) => void;
  // 공장 경계 (벽 회피용)
  factoryBounds?: FactoryBounds;
  // NPC 이름 레이블 컨테이너 (Portal 타겟)
  nameLabelContainer?: HTMLElement | null;
}

/**
 * Worker NPC 훅
 */
export function useWorkerNPC({
  config,
  sceneManager,
  onStateChange,
  onWaypointReached,
  conveyorBelts = [],
  onRegister,
  factoryBounds,
}: WorkerNPCProps) {
  // NPC 그룹 ref
  const groupRef = useRef<THREE.Group | null>(null);
  // 몸체 메쉬 ref
  const bodyRef = useRef<THREE.Mesh | null>(null);
  // 현재 상태
  const stateRef = useRef<NPCState>(config.initialState || "idle");
  // 현재 목표 waypoint 인덱스
  const waypointIndexRef = useRef(0);
  // 대기 시간 타이머 (waypoint 도착 시 대기용)
  const waitTimerRef = useRef(0);
  // 대기 시간 타이머 (충돌 회피 중 대기용)
  const waitingTimerRef = useRef(0);
  // 이전 프레임의 회피 힘 저장 (가로막힘 판단용)
  const lastObstacleAvoidanceForceRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  // 걷기 애니메이션 시간
  const walkAnimTimeRef = useRef(0);
  // 속도 벡터 (스티어링 비헤이비어용)
  const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0)); // 현재 속도 벡터
  // Anti-Stuck: 이전 위치 저장 (끼임 방지용)
  const stuckPositionRef = useRef<THREE.Vector3 | null>(null);
  const stuckFrameCountRef = useRef(0);
  // Anti-Stuck: 후진 시도 상태 추적
  const stuckAttemptRef = useRef(false);
  // Anti-Oscillation Memory: 마지막 회피 방향 저장
  const lastEvasionDirectionRef = useRef<THREE.Vector3 | null>(null);
  // Escape Impulse: 탈출 가속 상태 추적
  const escapeImpulseRef = useRef<{ active: boolean; startTime: number; duration: number }>({
    active: false,
    startTime: 0,
    duration: 0.2,
  });
  // Escape Impulse 쿨다운: 재발동 방지
  const escapeImpulseCooldownRef = useRef(0);
  // 경로 재계획: 차단된 waypoint 건너뛰기 카운터
  const blockedWaypointSkipCountRef = useRef(0);
  // 가상 회피 목표점 (벨트를 우회하기 위한 임시 목표)
  const virtualWaypointRef = useRef<THREE.Vector3 | null>(null);
  // 원래 목표 waypoint (회피 후 복귀용)
  const originalTargetRef = useRef<THREE.Vector3 | null>(null);
  // Enhanced Anti-Stuck: 최근 0.5초간 이동 이력
  const movementHistoryRef = useRef<Array<{ time: number; position: THREE.Vector3 }>>([]);
  const lastHistoryUpdateRef = useRef(0);

  // 기본값
  const { speed = 1.5, waypoints, startPosition } = config;

  // NPC 생성
  const createNPC = useCallback(() => {
    const group = new THREE.Group();
    group.name = `worker-npc-${config.id}`;

    // NPC 크기
    const bodyHeight = 1.2;
    const bodyRadius = 0.25;
    const headRadius = 0.2;

    // 몸체 (캡슐 형태 - 원통 + 반구)
    const bodyGeometry = new THREE.CapsuleGeometry(
      bodyRadius,
      bodyHeight - bodyRadius * 2,
      8,
      16
    );
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: STATE_COLORS[stateRef.current],
      roughness: 0.7,
      metalness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = bodyHeight / 2 + 0.05;
    body.castShadow = true;
    body.receiveShadow = true;
    body.name = "body";
    bodyRef.current = body;
    group.add(body);

    // 머리 (구)
    const headGeometry = new THREE.SphereGeometry(headRadius, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdbac, // 피부색
      roughness: 0.8,
      metalness: 0.1,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = bodyHeight + headRadius * 0.8;
    head.castShadow = true;
    head.name = "head";
    group.add(head);

    // 안전모 (반구)
    const helmetGeometry = new THREE.SphereGeometry(
      headRadius + 0.05,
      16,
      8,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const helmetMaterial = new THREE.MeshStandardMaterial({
      color: 0xffc107, // 노란색 안전모
      roughness: 0.3,
      metalness: 0.5,
    });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = bodyHeight + headRadius * 0.9;
    helmet.castShadow = true;
    helmet.name = "helmet";
    group.add(helmet);

    // 초기 위치 설정 (Y는 startPosition의 Y 값 사용, 없으면 0)
    group.position.set(startPosition.x, startPosition.y || 0, startPosition.z);

    return group;
  }, [config.id, startPosition]);


  // 상태 변경 (useRef로 안정화)
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  const setStateRef = useRef<(newState: NPCState) => void>((newState: NPCState) => {
    if (stateRef.current === newState) return;

    stateRef.current = newState;

    // 몸체 색상 변경
    if (bodyRef.current) {
      (bodyRef.current.material as THREE.MeshStandardMaterial).color.setHex(
        STATE_COLORS[newState]
      );
    }

    onStateChangeRef.current?.(config.id, newState);
  });

  // setState 함수를 최신 값으로 업데이트
  setStateRef.current = (newState: NPCState) => {
    if (stateRef.current === newState) return;

    stateRef.current = newState;

    // 몸체 색상 변경
    if (bodyRef.current) {
      (bodyRef.current.material as THREE.MeshStandardMaterial).color.setHex(
        STATE_COLORS[newState]
      );
    }

    onStateChangeRef.current?.(config.id, newState);
  };

  const setState = useCallback((newState: NPCState) => setStateRef.current(newState), []);

  // 애니메이션 업데이트
  const updateAnimation = useCallback(
    (deltaTime: number) => {
      if (!groupRef.current || waypoints.length === 0) return;

      const group = groupRef.current;

      // 부상 상태면 이동하지 않음
      if (stateRef.current === "injured") {
        return;
      }

      // 현재 목표 waypoint
      const targetWaypoint = waypoints[waypointIndexRef.current];
      const targetPos = new THREE.Vector3(
        targetWaypoint.x,
        targetWaypoint.y,
        targetWaypoint.z
      );

      // 현재 위치
      const currentPos = group.position.clone();
      // Y는 현재 그룹의 Y 위치를 사용 (거리 계산 시)
      // 실제 Y 위치는 이동 중에 설정됨

      // 목표까지 거리
      const distance = currentPos.distanceTo(targetPos);

      // 도착 판정 거리 (경계 밖 waypoint를 고려하여 증가)
      const arrivalThreshold = 0.2;

      if (distance <= arrivalThreshold) {
        // Waypoint 도착
        if (waitTimerRef.current === 0) {
          // 처음 도착
          onWaypointReached?.(config.id, waypointIndexRef.current);

          // 고정 작업자 판단 (speed가 0이고 waypoint가 1개)
          const isFixedWorker = speed === 0 && waypoints.length === 1;
          
          // 대기 시간 설정
          const waitTime = targetWaypoint.waitTime ?? 1;
          if (waitTime > 0 && !isFixedWorker) {
            // 순찰 NPC만 대기 중에는 idle 상태로 변경
            setStateRef.current("idle");
            waitTimerRef.current = waitTime;
          } else if (isFixedWorker) {
            // 고정 작업자는 working 상태 유지
            setStateRef.current("working");
            waitTimerRef.current = waitTime;
          }
        }

        // 대기 시간 처리
        if (waitTimerRef.current > 0) {
          waitTimerRef.current -= deltaTime;

          if (waitTimerRef.current <= 0) {
            // 대기 완료, 다음 waypoint로
            waitTimerRef.current = 0;
            waypointIndexRef.current =
              (waypointIndexRef.current + 1) % waypoints.length;
            setStateRef.current("walking");
          }
        }
      } else {
        // 이동 중
        setStateRef.current("walking");

        // 이동 거리 계산
        const moveDistance = speed * deltaTime;

        // 걷기 애니메이션 (위아래 바운스)
        walkAnimTimeRef.current += deltaTime * 8;
        const bounce = Math.abs(Math.sin(walkAnimTimeRef.current)) * 0.05;
        
        // ===== 레이캐스트 기반 회피 시스템 =====
        const npcRadius = 0.25; // NPC 반경
        const npcPos = new THREE.Vector3(group.position.x, 0, group.position.z);
        
        // 현재 속도 벡터 (초기화되지 않았으면 목표 방향으로 설정)
        let velocity = velocityRef.current;
        if (velocity.length() < 0.001) {
          // 속도가 없으면 목표 방향으로 초기화
          const seekDirection = targetPos.clone().sub(currentPos);
          velocity = seekDirection.normalize().multiplyScalar(speed);
          velocityRef.current = velocity.clone();
        }
        
        // 1. Seek: 목표 waypoint 방향의 원하는 속도 계산
        const seekDirection = targetPos.clone().sub(currentPos);
        const seekDistance = seekDirection.length();
        let desiredVelocity = new THREE.Vector3(0, 0, 0);
        if (seekDistance > 0.001) {
          desiredVelocity = seekDirection.normalize().multiplyScalar(speed);
        }
        
        // 현재 이동 방향 (속도 벡터 또는 목표 방향)
        const velocityNormalized = velocity.length() > 0.001 ? velocity.clone().normalize() : desiredVelocity.clone().normalize();
        
        // 2. 레이 센서 시스템: NPC 전방에 3개의 레이 설치
        const lookAheadTime = 0.5; // 예측 시간 (초) - 2.0에서 0.5로 감소
        // Adaptive Look-ahead: 속도에 비례한 레이 길이 계산
        const centerRayLength = Math.max(0.5, speed * 1.2); // 최소 0.5m
        const sideRayLength = Math.max(0.4, speed * 0.9); // 최소 0.4m
        const sideRayAngle = Math.PI / 6; // 30도
        
        // 중앙 레이: NPC 이동 방향
        const centerRay: Ray = {
          origin: npcPos,
          direction: velocityNormalized.clone(),
          length: centerRayLength,
        };
        
        // 좌측 레이: 이동 방향 기준 왼쪽 30도
        const leftDirection = velocityNormalized.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), sideRayAngle);
        const leftRay: Ray = {
          origin: npcPos,
          direction: leftDirection,
          length: sideRayLength,
        };
        
        // 우측 레이: 이동 방향 기준 오른쪽 30도
        const rightDirection = velocityNormalized.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -sideRayAngle);
        const rightRay: Ray = {
          origin: npcPos,
          direction: rightDirection,
          length: sideRayLength,
        };
        
        // 레이 센서로 벨트 감지
        const sensorRays = [centerRay, leftRay, rightRay];
        let beltDetected = false;
        let detectedBelt: ConveyorBeltConfig | null = null;
        
        for (const ray of sensorRays) {
          const intersection = checkRayBeltIntersection(ray, conveyorBelts, npcRadius);
          if (intersection) {
            beltDetected = true;
            detectedBelt = intersection.belt;
            break; // 첫 번째 감지된 벨트 사용
          }
        }
        
        // 2. AABB Hard Constraint: NPC가 벨트 내부에 있으면 즉시 경계 밖으로 이동
        // 각 컨베이어 벨트에 대해 Hard Constraint 적용
        for (const belt of conveyorBelts) {
          // 데이터 검증
          if (belt.x === undefined || belt.z === undefined || belt.length === undefined || belt.width === undefined) {
            continue;
          }
          
          const halfLength = belt.length / 2;
          const halfWidth = belt.width / 2;
          const beltMinX = belt.x - halfLength - npcRadius;
          const beltMaxX = belt.x + halfLength + npcRadius;
          const beltMinZ = belt.z - halfWidth - npcRadius;
          const beltMaxZ = belt.z + halfWidth + npcRadius;
          
          // 현재 위치가 벨트 내부에 있는지 확인
          const currentInBelt =
            npcPos.x >= beltMinX &&
            npcPos.x <= beltMaxX &&
            npcPos.z >= beltMinZ &&
            npcPos.z <= beltMaxZ;
          
          if (currentInBelt) {
            // 가장 가까운 경계까지의 거리 계산
            const distToMinX = npcPos.x - beltMinX;
            const distToMaxX = beltMaxX - npcPos.x;
            const distToMinZ = npcPos.z - beltMinZ;
            const distToMaxZ = beltMaxZ - npcPos.z;
            const minDist = Math.min(distToMinX, distToMaxX, distToMinZ, distToMaxZ);
            
            // 충돌한 면의 법선 계산
            const faceNormal = calculateFaceNormal(npcPos, beltMinX, beltMaxX, beltMinZ, beltMaxZ);
            
            // 가장 가까운 경계 밖으로 위치 이동 (Safe Snap Distance: 0.05)
            const safeSnapDistance = 0.05;
            if (minDist === distToMinX) {
              group.position.x = beltMinX - npcRadius - safeSnapDistance;
            } else if (minDist === distToMaxX) {
              group.position.x = beltMaxX + npcRadius + safeSnapDistance;
            } else if (minDist === distToMinZ) {
              group.position.z = beltMinZ - npcRadius - safeSnapDistance;
            } else {
              group.position.z = beltMaxZ + npcRadius + safeSnapDistance;
            }
            
            // Velocity Reflection & Sliding: 속도를 법선 기준으로 투영
            // 벽에 수직인 성분을 제거하여 벽을 따라 미끄러지도록 함
            const velocityDotNormal = velocity.dot(faceNormal);
            const reflectedVelocity = velocity.clone().sub(faceNormal.clone().multiplyScalar(velocityDotNormal));
            
            // 약간의 반사 추가 (튕김 방지, 벽에서 살짝 밀어냄)
            const reflectionFactor = 0.1;
            const bounceVelocity = faceNormal.clone().multiplyScalar(-reflectionFactor);
            velocity.copy(reflectedVelocity).add(bounceVelocity);
            
            // 위치가 변경되었으므로 npcPos 업데이트
            npcPos.set(group.position.x, 0, group.position.z);
            velocityRef.current.set(velocity.x, velocity.y, velocity.z);
          }
        }
        
        // 3. Steering Priority: 벨트 감지 시 Seek Force 완전 무시하고 법선 방향으로 즉시 조향
        const seekSteering = desiredVelocity.clone().sub(velocity);
        let steeringForce = new THREE.Vector3(0, 0, 0);
        
        if (beltDetected && detectedBelt) {
          // 벨트 AABB 계산
          const halfLength = detectedBelt.length / 2;
          const halfWidth = detectedBelt.width / 2;
          const detectedBeltMinX = detectedBelt.x - halfLength - npcRadius;
          const detectedBeltMaxX = detectedBelt.x + halfLength + npcRadius;
          const detectedBeltMinZ = detectedBelt.z - halfWidth - npcRadius;
          const detectedBeltMaxZ = detectedBelt.z + halfWidth + npcRadius;
          
          // 벨트 법선 계산
          let beltNormal = calculateBeltNormal(
            npcPos,
            targetPos,
            detectedBelt,
            detectedBeltMinX,
            detectedBeltMaxX,
            detectedBeltMinZ,
            detectedBeltMaxZ
          );
          
          // Anti-Oscillation Memory: 회피 방향 일관성 유지
          if (lastEvasionDirectionRef.current) {
            const directionChange = beltNormal.angleTo(lastEvasionDirectionRef.current);
            const MAX_DIRECTION_CHANGE = Math.PI / 2; // 90도
            
            if (directionChange > MAX_DIRECTION_CHANGE) {
              // 방향 변경이 크면 이전 방향 유지 (핑퐁 방지)
              beltNormal = lastEvasionDirectionRef.current.clone();
            }
          }
          
          // 회피 방향 저장
          lastEvasionDirectionRef.current = beltNormal.clone();
          
          // Angular Priority Steering: NPC의 forward 벡터와 beltNormal 사이의 각도 계산
          const forward = velocityNormalized;
          const dotProduct = Math.max(-1, Math.min(1, forward.dot(beltNormal)));
          const angle = Math.acos(dotProduct);
          
          const ANGLE_THRESHOLD = Math.PI / 4; // 45도
          if (angle > ANGLE_THRESHOLD) {
            // 각도가 크면 회전 우선: 이동 멈추고 제자리에서 회전
            velocity.multiplyScalar(0.3); // 더 강한 감속
            steeringForce = beltNormal.clone().multiplyScalar(speed * 0.5); // 회전 중심
          } else {
            // 각도가 작으면 기존 로직: 속도 감속 + 조향
            velocity.multiplyScalar(0.6); // Speed Dampening: 40% 감속
            steeringForce = beltNormal.clone().multiplyScalar(speed);
          }
        } else {
          // 벨트 미감지 시: 기존 Seek Force 사용
          steeringForce = seekSteering.clone();
          // 벨트를 벗어나면 회피 방향 리셋
          lastEvasionDirectionRef.current = null;
        }
        
        // 4. 속도 벡터 업데이트: 현재 속도 + Steering Force × deltaTime
        const maxSpeed = speed;
        const maxForce = speed * 10.0; // 최대 힘 제한 증가 (더 빠른 반응)
        
        // Anti-Stuck: 후진 시도 중이면 Steering Force 무시
        if (stuckAttemptRef.current) {
          steeringForce.set(0, 0, 0);
        }
        
        // Escape Impulse: 활성화되어 있으면 Steering Force 무시 (반대 방향 이동만)
        if (escapeImpulseRef.current.active) {
          steeringForce.set(0, 0, 0);
        }
        
        // Steering Force 제한
        const steeringForceBeforeLimit = steeringForce.clone();
        if (steeringForce.length() > maxForce) {
          steeringForce.normalize().multiplyScalar(maxForce);
          console.log(`[WorkerNPC ${config.id}] Steering Force 제한 적용: ${steeringForceBeforeLimit.length().toFixed(2)} -> ${steeringForce.length().toFixed(2)}`);
        }
        
        velocity.add(steeringForce.clone().multiplyScalar(deltaTime));
        
        // 속도 제한 적용
        if (velocity.length() > maxSpeed) {
          velocity.normalize().multiplyScalar(maxSpeed);
        }
        
        // 속도 벡터 저장
        velocityRef.current = velocity.clone();
        
        // 5. 위치 업데이트: 현재 위치 + 속도 × 시간
        let newX = group.position.x + velocity.x * deltaTime;
        let newZ = group.position.z + velocity.z * deltaTime;
        
        // 공장 경계 내부로 제한
        if (factoryBounds) {
          newX = Math.max(factoryBounds.minX + npcRadius, Math.min(factoryBounds.maxX - npcRadius, newX));
          newZ = Math.max(factoryBounds.minZ + npcRadius, Math.min(factoryBounds.maxZ - npcRadius, newZ));
        }
        
        // 위치 업데이트
        group.position.x = newX;
        group.position.z = newZ;
        
        // 6. Enhanced Anti-Stuck: 최근 0.5초간 이동 거리 합이 0.1 미만이면 stuck 판정
        const currentPosition = group.position.clone();
        const currentTime = performance.now() / 1000; // 초 단위
        
        // 이동 이력 업데이트 (0.1초마다 기록)
        if (currentTime - lastHistoryUpdateRef.current >= 0.1) {
          movementHistoryRef.current.push({ time: currentTime, position: currentPosition.clone() });
          lastHistoryUpdateRef.current = currentTime;
          
          // 0.5초 이전 데이터 제거
          movementHistoryRef.current = movementHistoryRef.current.filter(
            (h) => currentTime - h.time <= 0.5
          );
        }
        
        // 이동 거리 합 계산
        let totalDistance = 0;
        if (movementHistoryRef.current.length > 1) {
          for (let i = 1; i < movementHistoryRef.current.length; i++) {
            totalDistance += movementHistoryRef.current[i - 1].position.distanceTo(
              movementHistoryRef.current[i].position
            );
          }
        }
        
        // Stuck 판정: 최근 0.5초간 이동 거리 합이 0.1 미만
        const STUCK_DISTANCE_THRESHOLD = 0.1;
        // Escape Impulse는 진짜 stuck일 때만 발동 (STUCK_DISTANCE_THRESHOLD와 동일)
        const ESCAPE_IMPULSE_THRESHOLD = 0.1;
        
        // Escape Impulse 쿨다운 시간 감소
        if (escapeImpulseCooldownRef.current > 0) {
          escapeImpulseCooldownRef.current -= deltaTime;
        }
        
        // Escape Impulse: 탈출 가속 단계 (벨트가 감지되고 진짜 stuck일 때만)
        if (totalDistance < ESCAPE_IMPULSE_THRESHOLD && 
            movementHistoryRef.current.length > 3 &&
            beltDetected && // 벨트가 감지되어야 함
            escapeImpulseCooldownRef.current <= 0) { // 쿨다운 중이 아니어야 함
          if (!escapeImpulseRef.current.active) {
            // Escape Impulse 시작
            escapeImpulseRef.current = {
              active: true,
              startTime: currentTime,
              duration: 0.2, // 0.2초
            };
          }
          
          const elapsed = currentTime - escapeImpulseRef.current.startTime;
          if (elapsed < escapeImpulseRef.current.duration) {
            // Escape Impulse: 반대 방향으로 특정 시간 동안 이동
            let backwardDirection: THREE.Vector3;
            
            if (beltDetected && detectedBelt) {
              // 벨트가 감지되면: 벨트 중심에서 NPC로의 방향 (벨트에서 멀어지는 방향)
              const beltCenter = new THREE.Vector3(detectedBelt.x, 0, detectedBelt.z);
              const fromBeltToNPC = currentPosition.clone().sub(beltCenter);
              backwardDirection = fromBeltToNPC.length() > 0.001 
                ? fromBeltToNPC.normalize() 
                : new THREE.Vector3(0, 0, -1); // 기본 후진 방향
            } else {
              // 벨트가 감지되지 않으면: 현재 속도 방향의 반대
              backwardDirection = velocity.length() > 0.001 
                ? velocity.clone().normalize().negate() 
                : new THREE.Vector3(0, 0, -1); // 기본 후진 방향
            }
            
            // 반대 방향으로 강하게 이동 (원래 속도의 1.5배)
            const escapeForce = backwardDirection.multiplyScalar(speed * 1.5);
            velocity.copy(escapeForce);
            
            // 속도 벡터 저장 (위치는 일반 업데이트 로직에서 처리)
            velocityRef.current.set(velocity.x, velocity.y, velocity.z);
          } else {
            // Escape Impulse 완료
            escapeImpulseRef.current.active = false;
            
            // 쿨다운 시작 (0.5초 동안 재발동 방지)
            escapeImpulseCooldownRef.current = 0.5;
            
            // 이동 이력 초기화 (다음 판정을 위해)
            movementHistoryRef.current = [];
            lastHistoryUpdateRef.current = currentTime;
            
            if (totalDistance < STUCK_DISTANCE_THRESHOLD) {
              // Anti-Stuck Trigger: 순간이동 전 1프레임 후진 시도
              if (!stuckAttemptRef.current) {
                // 첫 번째 프레임: 후진 시도 시작
                stuckAttemptRef.current = true;
                
                // 후진 벡터 계산 및 적용 (다음 프레임에서 적용됨)
                const backwardDirection = velocity.length() > 0.001 
                  ? velocity.clone().normalize().negate() 
                  : new THREE.Vector3(0, 0, -1); // 기본 후진 방향
                const backwardForce = backwardDirection.multiplyScalar(speed * 0.3);
                velocity.add(backwardForce);
                
                // 속도 벡터 저장
                velocityRef.current.set(velocity.x, velocity.y, velocity.z);
              } else {
                // 두 번째 프레임: 후진 시도 후에도 여전히 stuck이면 순간이동
                const safeWaypoint = findNearestSafeWaypoint(
                  currentPosition,
                  waypoints,
                  conveyorBelts,
                  npcRadius,
                  2.0 // 최소 안전 거리
                );
                
                if (safeWaypoint) {
                  // 안전한 waypoint로 순간이동
                  group.position.set(safeWaypoint.x, safeWaypoint.y, safeWaypoint.z);
                  
                  // waypoint 인덱스 업데이트
                  const waypointIndex = waypoints.findIndex(
                    (w) => w.x === safeWaypoint.x && w.y === safeWaypoint.y && w.z === safeWaypoint.z
                  );
                  if (waypointIndex !== -1) {
                    waypointIndexRef.current = waypointIndex;
                  }
                  
                  // 속도 벡터 초기화
                  velocityRef.current.set(0, 0, 0);
                  velocity.set(0, 0, 0);
                  
                  // 이동 이력 초기화
                  movementHistoryRef.current = [];
                  lastHistoryUpdateRef.current = currentTime;
                  
                  // 후진 시도 상태 리셋
                  stuckAttemptRef.current = false;
                  
                  // Escape Impulse 상태 리셋
                  escapeImpulseRef.current.active = false;
                  
                  // 쿨다운 리셋 (순간이동 후에는 즉시 재발동 가능)
                  escapeImpulseCooldownRef.current = 0;
                }
              }
            } else {
              // Escape Impulse로 탈출 성공
              stuckAttemptRef.current = false;
            }
          }
        } else {
          // 이동 중이면 모든 상태 리셋
          stuckAttemptRef.current = false;
          escapeImpulseRef.current.active = false;
        }
        
        // 이동 방향으로 회전
        if (velocity.length() > 0.001) {
          const angle = Math.atan2(velocity.x, velocity.z);
          group.rotation.y = angle;
        }
        
        // Y 위치는 waypoint의 Y 값 사용 (컨베이어 위로 올라가지 않음)
        const baseY = targetWaypoint.y || 0;
        group.position.y = baseY + bounce;
      }
    },
    [waypoints, speed, startPosition.y, config.id, setState, onWaypointReached, conveyorBelts, factoryBounds]
  );

  // NPC 위치 가져오기 함수 (useRef로 안정화)
  const getPositionRef = useRef<() => { x: number; y: number; z: number }>(() => {
    if (!groupRef.current) {
      return { x: startPosition.x, y: startPosition.y || 0, z: startPosition.z };
    }
    return {
      x: groupRef.current.position.x,
      y: groupRef.current.position.y,
      z: groupRef.current.position.z,
    };
  });

  // getPosition 함수를 최신 startPosition으로 업데이트
  getPositionRef.current = () => {
    if (!groupRef.current) {
      return { x: startPosition.x, y: startPosition.y || 0, z: startPosition.z };
    }
    const pos = {
      x: groupRef.current.position.x,
      y: groupRef.current.position.y,
      z: groupRef.current.position.z,
    };
    return pos;
  };

  const getPosition = useCallback(() => getPositionRef.current(), []);

  // getState ref (상태 조회용) - 항상 최신 stateRef를 참조하도록 함수로 유지
  const getStateRef = useRef<() => NPCState>(() => {
    return stateRef.current;
  });
  // getState 함수를 항상 최신 stateRef를 반환하도록 업데이트
  getStateRef.current = () => stateRef.current;

  // onRegister 콜백을 useRef로 안정화
  const onRegisterRef = useRef(onRegister);
  useEffect(() => {
    onRegisterRef.current = onRegister;
  }, [onRegister]);

  // 씬에 NPC 추가
  useEffect(() => {
    console.log(`[WorkerNPC] 생성 시작: ${config.id}, 이름: ${config.name}`);
    
    const npc = createNPC();
    groupRef.current = npc;
    sceneManager.addObject(npc);
    
    console.log(`[WorkerNPC] 씬에 추가됨: ${config.id}, 위치: (${startPosition.x}, ${startPosition.y}, ${startPosition.z})`);

    // NPC 참조 등록 (useRef를 통해 안정적인 참조 사용)
    if (onRegisterRef.current) {
      onRegisterRef.current(config.id, getPositionRef.current, setStateRef.current, getStateRef.current);
    }

    // 애니메이션 콜백 등록
    sceneManager.addRenderCallback(updateAnimation);

    // 클린업
    return () => {
      sceneManager.removeRenderCallback(updateAnimation);

      if (groupRef.current) {
        groupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        sceneManager.removeObject(groupRef.current);
      }
    };
  }, [sceneManager, createNPC, updateAnimation, config.id, startPosition.x, startPosition.y, startPosition.z]);

  // 외부 제어 인터페이스
  return {
    // 상태 변경
    setState,
    // 현재 상태 조회
    getState: () => stateRef.current,
    // 현재 위치 조회
    getPosition: () => groupRef.current?.position.clone() ?? null,
    // 그룹 참조
    group: groupRef.current,
    // 부상 처리
    setInjured: () => setStateRef.current("injured"),
    // 부상 회복
    recover: () => setStateRef.current("idle"),
  };
}

/**
 * WorkerNPC 컴포넌트
 */
export function WorkerNPC(props: WorkerNPCProps) {
  const npcData = useWorkerNPC(props);
  const [npcGroup, setNpcGroup] = useState<THREE.Group | null>(null);

  // 그룹 참조 업데이트
  useEffect(() => {
    if (npcData.group) {
      setNpcGroup(npcData.group);
    }
  }, [npcData.group]);

  // NPC 이름 레이블은 3D 렌더러 안에서 표시하지 않음
  // 더블클릭으로 정보 확인 가능
  return null;
}

export default WorkerNPC;
