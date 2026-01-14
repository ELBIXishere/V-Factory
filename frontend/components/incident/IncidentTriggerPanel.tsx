"use client";

/**
 * 사고 트리거 패널 컴포넌트
 * 사고 유형, 위치, 심각도를 설정하고 사고를 발생시키는 UI
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IncidentType, Vector3 } from "@/lib/api/types";

// 사고 유형 정의
const INCIDENT_TYPES: { value: IncidentType; label: string; icon: string }[] = [
  { value: "ENTANGLEMENT", label: "끼임", icon: "⚙️" },
  { value: "FALL", label: "전도", icon: "🚶" },
  { value: "COLLISION", label: "충돌", icon: "💥" },
  { value: "FIRE", label: "화재", icon: "🔥" },
  { value: "ELECTRIC_SHOCK", label: "감전", icon: "⚡" },
  { value: "OTHER", label: "기타", icon: "⚠️" },
];

// 심각도 레벨 정의
const SEVERITY_LEVELS = [
  { value: 1, label: "경미", color: "bg-green-500" },
  { value: 2, label: "주의", color: "bg-yellow-500" },
  { value: 3, label: "경고", color: "bg-orange-500" },
  { value: 4, label: "위험", color: "bg-red-500" },
  { value: 5, label: "심각", color: "bg-red-700" },
];

// 프리셋 위치 (공장 내 주요 위치)
const PRESET_POSITIONS: { name: string; position: Vector3 }[] = [
  { name: "컨베이어 A 시작", position: { x: -8, y: 0, z: 0 } },
  { name: "컨베이어 A 끝", position: { x: 0, y: 0, z: 0 } },
  { name: "컨베이어 B 시작", position: { x: 8, y: 0, z: 0 } },
  { name: "컨베이어 B 끝", position: { x: 0, y: 0, z: 0 } },
  { name: "작업자 1 구역", position: { x: -4, y: 0, z: 3 } },
  { name: "작업자 2 구역", position: { x: 4, y: 0, z: 3 } },
  { name: "입구 근처", position: { x: 0, y: 0, z: 8 } },
  { name: "출하 구역", position: { x: 0, y: 0, z: -8 } },
];

// 컴포넌트 Props
export interface IncidentTriggerPanelProps {
  // 공장 ID
  factoryId: string;
  // 사고 트리거 콜백 (API 호출 전 로컬 처리용)
  onTrigger: (data: {
    type: IncidentType;
    severity: number;
    position: Vector3;
    description?: string;
  }) => Promise<void>;
  // 로딩 상태
  isLoading?: boolean;
  // 추가 CSS 클래스
  className?: string;
}

/**
 * 사고 트리거 패널 컴포넌트
 */
export function IncidentTriggerPanel({
  factoryId,
  onTrigger,
  isLoading = false,
  className = "",
}: IncidentTriggerPanelProps) {
  // 사고 유형 상태
  const [incidentType, setIncidentType] = useState<IncidentType>("ENTANGLEMENT");

  // 심각도 상태
  const [severity, setSeverity] = useState<number>(3);

  // 위치 상태
  const [position, setPosition] = useState<Vector3>({ x: 0, y: 0, z: 0 });

  // 설명 상태
  const [description, setDescription] = useState<string>("");

  // 프리셋 선택 상태
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  // 위치 좌표 변경 핸들러
  const handlePositionChange = useCallback(
    (axis: "x" | "y" | "z", value: string) => {
      const numValue = parseFloat(value) || 0;
      setPosition((prev) => ({ ...prev, [axis]: numValue }));
      setSelectedPreset(""); // 수동 입력 시 프리셋 선택 해제
    },
    []
  );

  // 프리셋 선택 핸들러
  const handlePresetSelect = useCallback((presetName: string) => {
    const preset = PRESET_POSITIONS.find((p) => p.name === presetName);
    if (preset) {
      setPosition(preset.position);
      setSelectedPreset(presetName);
    }
  }, []);

  // 사고 트리거 핸들러
  const handleTrigger = useCallback(async () => {
    await onTrigger({
      type: incidentType,
      severity,
      position,
      description: description.trim() || undefined,
    });

    // 트리거 후 설명만 초기화 (나머지 설정 유지)
    setDescription("");
  }, [incidentType, severity, position, description, onTrigger]);

  // 현재 선택된 사고 유형 정보
  const currentType = INCIDENT_TYPES.find((t) => t.value === incidentType);
  const currentSeverity = SEVERITY_LEVELS.find((s) => s.value === severity);

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      {/* 패널 헤더 */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-lg font-semibold text-foreground">사고 트리거</h3>
        <span className="text-xs text-muted-foreground">Factory: {factoryId}</span>
      </div>

      {/* 사고 유형 선택 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">사고 유형</label>
        <Select
          value={incidentType}
          onValueChange={(value) => setIncidentType(value as IncidentType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="사고 유형 선택" />
          </SelectTrigger>
          <SelectContent>
            {INCIDENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <span className="flex items-center gap-2">
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 심각도 선택 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          심각도: {currentSeverity?.label} (Level {severity})
        </label>
        <div className="flex gap-2">
          {SEVERITY_LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => setSeverity(level.value)}
              className={`flex-1 h-8 rounded-md transition-all ${level.color} ${
                severity === level.value
                  ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-105"
                  : "opacity-50 hover:opacity-75"
              }`}
              title={`${level.label} (Level ${level.value})`}
            />
          ))}
        </div>
      </div>

      {/* 위치 설정 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">사고 위치</label>

        {/* 프리셋 선택 */}
        <Select value={selectedPreset} onValueChange={handlePresetSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="프리셋 위치 선택 (선택사항)" />
          </SelectTrigger>
          <SelectContent>
            {PRESET_POSITIONS.map((preset) => (
              <SelectItem key={preset.name} value={preset.name}>
                {preset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 수동 좌표 입력 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">X</label>
            <Input
              type="number"
              step="0.1"
              value={position.x}
              onChange={(e) => handlePositionChange("x", e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Y</label>
            <Input
              type="number"
              step="0.1"
              value={position.y}
              onChange={(e) => handlePositionChange("y", e.target.value)}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Z</label>
            <Input
              type="number"
              step="0.1"
              value={position.z}
              onChange={(e) => handlePositionChange("z", e.target.value)}
              className="h-8"
            />
          </div>
        </div>
      </div>

      {/* 설명 입력 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          설명 (선택사항)
        </label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="사고 상황 설명..."
          className="h-8"
        />
      </div>

      {/* 사고 미리보기 */}
      <div className="rounded-md bg-secondary/50 p-3 space-y-1 text-sm">
        <div className="font-medium text-foreground">사고 미리보기</div>
        <div className="flex justify-between text-muted-foreground">
          <span>유형:</span>
          <span className="text-foreground">
            {currentType?.icon} {currentType?.label}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>심각도:</span>
          <span className="text-foreground">
            Level {severity} ({currentSeverity?.label})
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>위치:</span>
          <span className="text-foreground font-mono text-xs">
            ({position.x.toFixed(1)}, {position.y.toFixed(1)}, {position.z.toFixed(1)})
          </span>
        </div>
      </div>

      {/* 트리거 버튼 */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={handleTrigger}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            처리 중...
          </>
        ) : (
          <>
            <span className="mr-2">⚠️</span>
            사고 발생 트리거
          </>
        )}
      </Button>

      {/* 경고 메시지 */}
      <p className="text-xs text-muted-foreground text-center">
        * 테스트 목적으로만 사용하세요. 실제 시스템에 알림이 전송됩니다.
      </p>
    </Card>
  );
}

export default IncidentTriggerPanel;
