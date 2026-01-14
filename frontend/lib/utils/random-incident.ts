/**
 * 랜덤 사고 생성 유틸리티
 * CCTV 위치 기반으로 실제 감지 가능한 위치에 랜덤 사고 생성
 */

import type { IncidentType, Vector3 } from "@/lib/api/types";
import type { CCTVCameraConfig } from "@/lib/three";

/**
 * 랜덤 사고 데이터 인터페이스
 */
export interface RandomIncidentData {
  type: IncidentType;
  severity: number;
  position: Vector3;
  description: string;
}

/**
 * 사고 유형 목록
 */
const INCIDENT_TYPES: IncidentType[] = [
  "ENTANGLEMENT",
  "FALL",
  "COLLISION",
  "FIRE",
  "ELECTRIC_SHOCK",
  "OTHER",
];

/**
 * 사고 유형별 설명 템플릿
 */
const INCIDENT_DESCRIPTIONS: Record<IncidentType, string[]> = {
  ENTANGLEMENT: [
    "작업자가 기계에 끼임 사고 발생",
    "컨베이어 벨트에 옷감이 끼임",
    "설비에 손이 끼임",
  ],
  FALL: [
    "작업자가 넘어짐",
    "물건이 전도됨",
    "계단에서 미끄러짐",
  ],
  COLLISION: [
    "지게차와 작업자 충돌",
    "물류 로봇과 장애물 충돌",
    "운반 차량 간 충돌",
  ],
  FIRE: [
    "전기 배선에서 화재 발생",
    "기계 과열로 인한 화재",
    "화학 물질 접촉으로 인한 화재",
  ],
  ELECTRIC_SHOCK: [
    "전기 설비 접촉으로 감전",
    "누전으로 인한 감전 사고",
    "전기 패널 작업 중 감전",
  ],
  OTHER: [
    "기타 안전 사고 발생",
    "비상 상황 발생",
    "알 수 없는 사고 발생",
  ],
};

/**
 * 랜덤 정수 생성 (min ~ max)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 랜덤 실수 생성 (min ~ max)
 */
function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 가중치 기반 랜덤 선택
 * weights 배열의 인덱스에 해당하는 값을 가중치로 사용
 */
function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

/**
 * CCTV 위치 근처 랜덤 위치 생성
 * CCTV 위치에서 ±5 범위 내의 랜덤 위치 생성
 */
function generateRandomPositionNearCCTV(
  cctvPosition: Vector3,
  range: number = 5.0
): Vector3 {
  return {
    x: cctvPosition.x + randomFloat(-range, range),
    y: Math.max(0, cctvPosition.y + randomFloat(-1, 2)), // Y는 바닥 근처에
    z: cctvPosition.z + randomFloat(-range, range),
  };
}

/**
 * 랜덤 사고 생성
 * CCTV 설정 배열을 받아 랜덤 사고 데이터 생성
 *
 * @param cctvConfigs CCTV 설정 배열
 * @returns 랜덤 사고 데이터
 */
export function generateRandomIncident(
  cctvConfigs: CCTVCameraConfig[]
): RandomIncidentData {
  if (cctvConfigs.length === 0) {
    // CCTV가 없으면 기본 위치 사용
    return {
      type: "OTHER",
      severity: 3,
      position: { x: 0, y: 0, z: 0 },
      description: "기본 위치에서 사고 발생",
    };
  }

  // 랜덤 CCTV 선택
  const randomCCTV =
    cctvConfigs[randomInt(0, cctvConfigs.length - 1)];

  // 랜덤 사고 유형 선택 (모든 유형 동일 확률)
  const incidentType =
    INCIDENT_TYPES[randomInt(0, INCIDENT_TYPES.length - 1)];

  // 랜덤 심각도 선택 (가중치 적용: 3-4가 더 높은 확률)
  // 가중치: [1, 2, 3, 4, 5] = [0.1, 0.2, 0.3, 0.3, 0.1]
  const severity = weightedRandom(
    [1, 2, 3, 4, 5],
    [0.1, 0.2, 0.3, 0.3, 0.1]
  );

  // CCTV 위치 근처 랜덤 위치 생성
  const position = generateRandomPositionNearCCTV(
    randomCCTV.position,
    5.0
  );

  // 랜덤 설명 생성
  const descriptions = INCIDENT_DESCRIPTIONS[incidentType];
  const description =
    descriptions[randomInt(0, descriptions.length - 1)];

  return {
    type: incidentType,
    severity,
    position,
    description,
  };
}

/**
 * 여러 개의 랜덤 사고 생성
 *
 * @param cctvConfigs CCTV 설정 배열
 * @param count 생성할 사고 개수
 * @returns 랜덤 사고 데이터 배열
 */
export function generateRandomIncidents(
  cctvConfigs: CCTVCameraConfig[],
  count: number = 1
): RandomIncidentData[] {
  return Array.from({ length: count }, () =>
    generateRandomIncident(cctvConfigs)
  );
}
