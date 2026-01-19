"use client";

/**
 * ConveyorBelt 컴포넌트
 * 컨베이어 벨트 시스템 - UV 애니메이션과 이동하는 상자들
 */

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { SceneManager } from "@/lib/three";

// 컨베이어 벨트 설정
export interface ConveyorBeltConfig {
  // 고유 ID
  id: string;
  // 이름 (표시용)
  name?: string;
  // 위치
  position: { x: number; y: number; z: number };
  // 회전 (Y축, 라디안)
  rotation?: number;
  // 길이
  length?: number;
  // 너비
  width?: number;
  // 벨트 속도
  speed?: number;
  // 활성화 상태
  isActive?: boolean;
  // 벨트 색상
  beltColor?: number;
  // 프레임 색상
  frameColor?: number;
}

// 이동하는 상자 설정
export interface BoxItem {
  id: string;
  mesh: THREE.Mesh;
  progress: number; // 0~1 (벨트 시작~끝)
}

// 컴포넌트 Props
export interface ConveyorBeltProps {
  config: ConveyorBeltConfig;
  sceneManager: SceneManager;
  // 상자 생성 간격 (초)
  boxSpawnInterval?: number;
  // 상자 크기
  boxSize?: number;
  // 상자가 끝에 도달했을 때 콜백
  onBoxReachedEnd?: (boxId: string) => void;
}

/**
 * 컨베이어 벨트 생성 및 관리
 */
export function useConveyorBelt({
  config,
  sceneManager,
  boxSpawnInterval = 2,
  boxSize = 0.4,
  onBoxReachedEnd,
}: ConveyorBeltProps) {
  // 벨트 그룹 ref
  const groupRef = useRef<THREE.Group | null>(null);
  // 벨트 메쉬 ref
  const beltMeshRef = useRef<THREE.Mesh | null>(null);
  // 상자들 ref
  const boxesRef = useRef<BoxItem[]>([]);
  // 스폰 타이머 ref
  const spawnTimerRef = useRef(0);
  // 상자 ID 카운터
  const boxIdCounter = useRef(0);

  // 기본값 설정
  const {
    position,
    rotation = 0,
    length = 6,
    width = 1,
    speed = 1,
    isActive = true,
    beltColor = 0x333333,
    frameColor = 0x666666,
  } = config;

  // 컨베이어 벨트 생성
  const createConveyorBelt = useCallback(() => {
    const group = new THREE.Group();
    group.name = `conveyor-belt-${config.id}`;

    // 벨트 높이
    const beltHeight = 0.8;
    const frameThickness = 0.05;

    // 벨트 본체 (움직이는 부분)
    const beltGeometry = new THREE.BoxGeometry(length, 0.05, width - 0.1);
    const beltMaterial = new THREE.MeshStandardMaterial({
      color: beltColor,
      roughness: 0.7,
      metalness: 0.3,
    });
    const belt = new THREE.Mesh(beltGeometry, beltMaterial);
    belt.position.y = beltHeight;
    belt.castShadow = true;
    belt.receiveShadow = true;
    belt.name = "belt-surface";
    beltMeshRef.current = belt;
    group.add(belt);

    // 프레임 (양쪽 레일)
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: frameColor,
      roughness: 0.5,
      metalness: 0.5,
    });

    // 왼쪽 레일
    const leftRailGeometry = new THREE.BoxGeometry(
      length,
      0.1,
      frameThickness
    );
    const leftRail = new THREE.Mesh(leftRailGeometry, frameMaterial);
    leftRail.position.set(0, beltHeight + 0.05, width / 2);
    leftRail.castShadow = true;
    group.add(leftRail);

    // 오른쪽 레일
    const rightRail = new THREE.Mesh(leftRailGeometry, frameMaterial);
    rightRail.position.set(0, beltHeight + 0.05, -width / 2);
    rightRail.castShadow = true;
    group.add(rightRail);

    // 지지대 다리 (4개)
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, beltHeight, 8);
    const legPositions = [
      { x: -length / 2 + 0.2, z: width / 2 - 0.1 },
      { x: -length / 2 + 0.2, z: -width / 2 + 0.1 },
      { x: length / 2 - 0.2, z: width / 2 - 0.1 },
      { x: length / 2 - 0.2, z: -width / 2 + 0.1 },
    ];

    legPositions.forEach((pos, index) => {
      const leg = new THREE.Mesh(legGeometry, frameMaterial);
      leg.position.set(pos.x, beltHeight / 2, pos.z);
      leg.castShadow = true;
      leg.name = `leg-${index}`;
      group.add(leg);
    });

    // 롤러 (양쪽 끝)
    const rollerGeometry = new THREE.CylinderGeometry(
      0.1,
      0.1,
      width - 0.1,
      16
    );
    const rollerMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.3,
      metalness: 0.7,
    });

    const leftRoller = new THREE.Mesh(rollerGeometry, rollerMaterial);
    leftRoller.rotation.x = Math.PI / 2;
    leftRoller.position.set(-length / 2, beltHeight, 0);
    leftRoller.castShadow = true;
    group.add(leftRoller);

    const rightRoller = new THREE.Mesh(rollerGeometry, rollerMaterial);
    rightRoller.rotation.x = Math.PI / 2;
    rightRoller.position.set(length / 2, beltHeight, 0);
    rightRoller.castShadow = true;
    group.add(rightRoller);

    // 그룹 위치 및 회전 설정
    group.position.set(position.x, position.y, position.z);
    group.rotation.y = rotation;

    return group;
  }, [config.id, position, rotation, length, width, beltColor, frameColor]);

  // 상자 생성 (useRef로 안정화하여 재생성 방지)
  const createBoxRef = useRef<() => BoxItem>(() => {
    const id = `box-${config.id}-${boxIdCounter.current++}`;

    // 랜덤 색상
    const colors = [0xe94560, 0x00d9ff, 0x00c853, 0xffc107, 0x9c27b0];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.3,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = id;

    return { id, mesh, progress: 0 };
  });

  // createBox 함수를 최신 값으로 업데이트
  createBoxRef.current = () => {
    const id = `box-${config.id}-${boxIdCounter.current++}`;

    // 랜덤 색상
    const colors = [0xe94560, 0x00d9ff, 0x00c853, 0xffc107, 0x9c27b0];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.3,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = id;

    return { id, mesh, progress: 0 };
  };

  const createBox = useCallback(() => createBoxRef.current(), []);

  // onBoxReachedEnd 콜백을 useRef로 안정화
  const onBoxReachedEndRef = useRef(onBoxReachedEnd);
  useEffect(() => {
    onBoxReachedEndRef.current = onBoxReachedEnd;
  }, [onBoxReachedEnd]);

  // 애니메이션 업데이트 (useRef로 안정화)
  const updateAnimationRef = useRef<(deltaTime: number) => void>((deltaTime: number) => {
    if (!isActive || !groupRef.current) return;

    // deltaTime이 너무 크면 클램핑 (프레임 드랍 방지)
    const clampedDeltaTime = Math.min(deltaTime, 0.1); // 최대 0.1초

    const beltHeight = 0.8;

    // 상자 스폰 타이머
    spawnTimerRef.current += clampedDeltaTime;
    if (spawnTimerRef.current >= boxSpawnInterval) {
      spawnTimerRef.current = 0;

      // 새 상자 생성 (진행률은 0으로 시작)
      const newBox = createBoxRef.current();
      newBox.progress = 0; // 명시적으로 0으로 설정
      const startX = -length / 2 + boxSize;
      newBox.mesh.position.set(startX, beltHeight + boxSize / 2 + 0.05, 0);
      groupRef.current.add(newBox.mesh);
      boxesRef.current.push(newBox);
      
      console.log(`[ConveyorBelt] 상자 생성: ${newBox.id}, 진행률: ${newBox.progress}, 위치: (${newBox.mesh.position.x.toFixed(2)}, ${newBox.mesh.position.y.toFixed(2)}, ${newBox.mesh.position.z.toFixed(2)})`);
    }

    // 상자들 이동
    const boxesToRemove: string[] = [];
    const moveDistance = speed * clampedDeltaTime;
    const progressIncrement = moveDistance / length;
    
    // 진행률 증가량이 너무 크면 클램핑 (프레임 드랍 방지)
    // 한 프레임에 0.5 이상 진행되면 비정상적이므로 클램핑
    const safeProgressIncrement = Math.min(progressIncrement, 0.5);

    boxesRef.current.forEach((box) => {
      // 진행률 업데이트
      const oldProgress = box.progress;
      box.progress = Math.min(box.progress + safeProgressIncrement, 1.0);

      // 위치 업데이트 (그룹의 로컬 좌표계 기준)
      const startX = -length / 2 + boxSize;
      const endX = length / 2 - boxSize;
      const currentX = startX + (endX - startX) * box.progress;
      box.mesh.position.x = currentX;
      
      // Y 위치 유지 (벨트 높이 위에 유지)
      box.mesh.position.y = beltHeight + boxSize / 2 + 0.05;
      box.mesh.position.z = 0; // Z는 중앙에 유지

      // 끝에 도달 (진행률이 1.0에 도달했을 때만 제거)
      // oldProgress가 1.0 미만이고, 현재 progress가 1.0 이상이면 제거
      if (box.progress >= 1.0 && oldProgress < 1.0) {
        boxesToRemove.push(box.id);
        onBoxReachedEndRef.current?.(box.id);
      }
    });

    // 완료된 상자 제거
    boxesToRemove.forEach((id) => {
      const index = boxesRef.current.findIndex((b) => b.id === id);
      if (index !== -1) {
        const box = boxesRef.current[index];
        groupRef.current?.remove(box.mesh);
        box.mesh.geometry.dispose();
        (box.mesh.material as THREE.Material).dispose();
        boxesRef.current.splice(index, 1);
      }
    });
  });

  // updateAnimation 함수를 최신 값으로 업데이트
  updateAnimationRef.current = (deltaTime: number) => {
    if (!isActive || !groupRef.current) return;

    // deltaTime이 너무 크면 클램핑 (프레임 드랍 방지)
    const clampedDeltaTime = Math.min(deltaTime, 0.1); // 최대 0.1초

    const beltHeight = 0.8;

    // 상자 스폰 타이머
    spawnTimerRef.current += clampedDeltaTime;
    if (spawnTimerRef.current >= boxSpawnInterval) {
      spawnTimerRef.current = 0;

      // 새 상자 생성 (진행률은 0으로 시작)
      const newBox = createBoxRef.current();
      newBox.progress = 0; // 명시적으로 0으로 설정
      const startX = -length / 2 + boxSize;
      newBox.mesh.position.set(startX, beltHeight + boxSize / 2 + 0.05, 0);
      groupRef.current.add(newBox.mesh);
      boxesRef.current.push(newBox);
      
      console.log(`[ConveyorBelt] 상자 생성: ${newBox.id}, 진행률: ${newBox.progress}, 위치: (${newBox.mesh.position.x.toFixed(2)}, ${newBox.mesh.position.y.toFixed(2)}, ${newBox.mesh.position.z.toFixed(2)})`);
    }

    // 상자들 이동
    const boxesToRemove: string[] = [];
    const moveDistance = speed * clampedDeltaTime;
    const progressIncrement = moveDistance / length;
    
    // 진행률 증가량이 너무 크면 클램핑 (프레임 드랍 방지)
    // 한 프레임에 0.5 이상 진행되면 비정상적이므로 클램핑
    const safeProgressIncrement = Math.min(progressIncrement, 0.5);

    boxesRef.current.forEach((box) => {
      // 진행률 업데이트
      const oldProgress = box.progress;
      box.progress = Math.min(box.progress + safeProgressIncrement, 1.0);

      // 위치 업데이트 (그룹의 로컬 좌표계 기준)
      const startX = -length / 2 + boxSize;
      const endX = length / 2 - boxSize;
      const currentX = startX + (endX - startX) * box.progress;
      box.mesh.position.x = currentX;
      
      // Y 위치 유지 (벨트 높이 위에 유지)
      box.mesh.position.y = beltHeight + boxSize / 2 + 0.05;
      box.mesh.position.z = 0; // Z는 중앙에 유지

      // 끝에 도달 (진행률이 1.0에 도달했을 때만 제거)
      // oldProgress가 1.0 미만이고, 현재 progress가 1.0 이상이면 제거
      if (box.progress >= 1.0 && oldProgress < 1.0) {
        boxesToRemove.push(box.id);
        onBoxReachedEndRef.current?.(box.id);
      }
    });

    // 완료된 상자 제거
    boxesToRemove.forEach((id) => {
      const index = boxesRef.current.findIndex((b) => b.id === id);
      if (index !== -1) {
        const box = boxesRef.current[index];
        groupRef.current?.remove(box.mesh);
        box.mesh.geometry.dispose();
        (box.mesh.material as THREE.Material).dispose();
        boxesRef.current.splice(index, 1);
      }
    });
  };

  const updateAnimation = useCallback((deltaTime: number) => updateAnimationRef.current(deltaTime), []);

  // 씬에 컨베이어 벨트 추가
  useEffect(() => {
    console.log(`[ConveyorBelt] 생성 시작: ${config.id}, 위치: (${position.x}, ${position.y}, ${position.z})`);
    
    const group = createConveyorBelt();
    groupRef.current = group;
    sceneManager.addObject(group);
    
    console.log(`[ConveyorBelt] 씬에 추가됨: ${config.id}`);

    // 애니메이션 콜백 등록 (useRef를 통해 안정적인 참조 사용)
    const animationCallback = updateAnimationRef.current;
    sceneManager.addRenderCallback(animationCallback);

    // 클린업
    return () => {
      sceneManager.removeRenderCallback(animationCallback);

      // 상자들 정리
      boxesRef.current.forEach((box) => {
        box.mesh.geometry.dispose();
        (box.mesh.material as THREE.Material).dispose();
      });
      boxesRef.current = [];

      // 그룹 정리
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
  }, [sceneManager, createConveyorBelt]);

  // 외부 제어 인터페이스 반환
  return {
    // 벨트 속도 변경
    setSpeed: (newSpeed: number) => {
      // speed는 config에서 가져오므로 외부에서 업데이트 필요
    },
    // 활성화 상태 변경
    setActive: (active: boolean) => {
      // isActive는 config에서 가져오므로 외부에서 업데이트 필요
    },
    // 그룹 참조
    group: groupRef.current,
    // 현재 상자 수
    boxCount: boxesRef.current.length,
  };
}

/**
 * ConveyorBelt 컴포넌트
 * React 컴포넌트로 래핑
 */
export function ConveyorBelt(props: ConveyorBeltProps) {
  useConveyorBelt(props);
  return null; // 렌더링은 Three.js에서 처리
}

export default ConveyorBelt;
