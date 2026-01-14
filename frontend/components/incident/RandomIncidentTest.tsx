"use client";

/**
 * 랜덤 사고 테스트 컴포넌트
 * 랜덤 사고 발생 버튼 및 테스트 기능 제공
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { CCTVCameraConfig } from "@/lib/three";
import { generateRandomIncident } from "@/lib/utils/random-incident";
import type { IncidentType } from "@/lib/api/types";
import { useCreateIncidentWithCCTV } from "@/lib/api/hooks/useIncidents";
import type { NPCRef } from "@/components/three/FactoryScene";
import type { NPCState } from "@/components/three/WorkerNPC";

// 사고 유형 라벨 매핑
const INCIDENT_TYPE_LABELS: Record<IncidentType, { label: string; icon: string }> = {
  ENTANGLEMENT: { label: "끼임", icon: "⚙️" },
  FALL: { label: "전도", icon: "🚶" },
  COLLISION: { label: "충돌", icon: "💥" },
  FIRE: { label: "화재", icon: "🔥" },
  ELECTRIC_SHOCK: { label: "감전", icon: "⚡" },
  OTHER: { label: "기타", icon: "⚠️" },
};

// 심각도 레벨 정의
const SEVERITY_LABELS: Record<number, string> = {
  1: "경미",
  2: "주의",
  3: "경고",
  4: "위험",
  5: "심각",
};

// 컴포넌트 Props
export interface RandomIncidentTestProps {
  // 공장 ID
  factoryId: string;
  // CCTV 설정 배열 (위치 기반 랜덤 생성용)
  cctvConfigs: CCTVCameraConfig[];
  // 사고 생성 후 콜백 (선택사항)
  onIncidentCreated?: (incidentId: string) => void;
  // NPC 참조 및 찾기 함수 (선택사항)
  npcRefs?: Map<string, NPCRef>;
  findNearestNPC?: (position: { x: number; y: number; z: number }) => string | null;
  // 추가 CSS 클래스
  className?: string;
}

/**
 * 랜덤 사고 테스트 컴포넌트
 */
export function RandomIncidentTest({
  factoryId,
  cctvConfigs,
  onIncidentCreated,
  npcRefs,
  findNearestNPC,
  className = "",
}: RandomIncidentTestProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<{
    type: IncidentType;
    severity: number;
    position: { x: number; y: number; z: number };
  } | null>(null);

  const createIncidentMutation = useCreateIncidentWithCCTV();

  // 랜덤 사고 생성 핸들러
  const handleRandomIncident = useCallback(async () => {
    if (!factoryId) {
      toast.error("Factory ID가 없습니다", {
        description: "Factory를 먼저 생성해주세요.",
      });
      return;
    }

    if (cctvConfigs.length === 0) {
      toast.error("CCTV 설정이 없습니다", {
        description: "랜덤 사고를 생성하려면 최소 1개 이상의 CCTV가 필요합니다.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // 랜덤 사고 데이터 생성
      const randomData = generateRandomIncident(cctvConfigs);
      setLastGenerated(randomData);

      console.log("[RandomIncidentTest] 사고 생성 시도 - Factory ID:", factoryId);

      // 가장 가까운 NPC 찾기 및 부상 상태로 변경
      let npcId: string | null = null;
      if (findNearestNPC && npcRefs) {
        npcId = findNearestNPC(randomData.position);
        if (npcId) {
          const npcRef = npcRefs.get(npcId);
          if (npcRef) {
            // NPC를 부상 상태로 변경
            npcRef.setState("injured" as NPCState);
            console.log(`[RandomIncidentTest] NPC ${npcId} 부상 상태로 변경`);
          }
        }
      }

      // Backend API 호출 (NPC ID 포함)
      const response = await createIncidentMutation.mutateAsync({
        factory_id: factoryId,
        type: randomData.type,
        severity: randomData.severity,
        position_x: randomData.position.x,
        position_y: randomData.position.y,
        position_z: randomData.position.z,
        description: randomData.description,
        npc_id: npcId || undefined, // NPC ID 포함
      });

      // 성공 알림
      const typeInfo = INCIDENT_TYPE_LABELS[randomData.type] || {
        label: randomData.type,
        icon: "⚠️",
      };
      const severityLabel = SEVERITY_LABELS[randomData.severity] || `Level ${randomData.severity}`;

      toast.success(`${typeInfo.icon} 랜덤 사고 발생!`, {
        description: `유형: ${typeInfo.label} | 심각도: ${severityLabel} (${randomData.severity})`,
        duration: 5000,
        action: response.detected_cctv_ids && response.detected_cctv_ids.length > 0
          ? {
              label: "CCTV 보기",
              onClick: () => {
                // CCTV 모니터링 페이지로 이동
                if (response.detected_cctv_ids && response.detected_cctv_ids.length > 0) {
                  window.location.href = `/monitoring?cctv=${response.detected_cctv_ids[0]}`;
                }
              },
            }
          : undefined,
      });

      // 콜백 호출
      if (onIncidentCreated) {
        onIncidentCreated(response.id);
      }
    } catch (error) {
      console.error("[RandomIncidentTest] 사고 생성 실패:", error);
      toast.error("랜덤 사고 생성 실패", {
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [cctvConfigs, factoryId, createIncidentMutation, onIncidentCreated]);

  const isLoading = isGenerating || createIncidentMutation.isPending;

  return (
    <Card className={`p-4 space-y-3 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-sm font-semibold text-foreground">랜덤 테스트</h3>
        <Badge variant="outline" className="text-xs">
          {cctvConfigs.length}개 CCTV
        </Badge>
      </div>

      {/* 마지막 생성 정보 */}
      {lastGenerated && (
        <div className="rounded-md bg-secondary/50 p-2 space-y-1 text-xs">
          <div className="font-medium text-foreground">마지막 생성:</div>
          <div className="flex justify-between text-muted-foreground">
            <span>유형:</span>
            <span className="text-foreground">
              {INCIDENT_TYPE_LABELS[lastGenerated.type]?.icon}{" "}
              {INCIDENT_TYPE_LABELS[lastGenerated.type]?.label}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>심각도:</span>
            <span className="text-foreground">
              Level {lastGenerated.severity} ({SEVERITY_LABELS[lastGenerated.severity]})
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>위치:</span>
            <span className="text-foreground font-mono">
              ({lastGenerated.position.x.toFixed(1)}, {lastGenerated.position.y.toFixed(1)},{" "}
              {lastGenerated.position.z.toFixed(1)})
            </span>
          </div>
        </div>
      )}

      {/* 랜덤 테스트 버튼 */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={handleRandomIncident}
        disabled={isLoading || cctvConfigs.length === 0}
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            생성 중...
          </>
        ) : (
          <>
            <span className="mr-2">🎲</span>
            랜덤 테스트(사고 발생)
          </>
        )}
      </Button>

      {/* 안내 메시지 */}
      <p className="text-xs text-muted-foreground text-center">
        * CCTV 위치 근처에 랜덤 사고를 생성합니다
      </p>
    </Card>
  );
}
