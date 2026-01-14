"use client";

/**
 * CCTVSettingsPanel 컴포넌트
 * CCTV 추가, 삭제, 설정 관리 UI
 */

import { useState, useCallback, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { CCTVCameraConfig } from "@/lib/three";

// 컴포넌트 Props
export interface CCTVSettingsPanelProps {
  // CCTV 목록
  cctvList: CCTVCameraConfig[];
  // 선택된 CCTV ID
  selectedCCTVId?: string;
  // CCTV 선택 콜백
  onSelectCCTV?: (id: string) => void;
  // CCTV 추가 콜백
  onAddCCTV?: (config: Omit<CCTVCameraConfig, "id">) => void;
  // CCTV 삭제 콜백
  onRemoveCCTV?: (id: string) => void;
  // CCTV 업데이트 콜백
  onUpdateCCTV?: (id: string, updates: Partial<CCTVCameraConfig>) => void;
  // 추가 CSS 클래스
  className?: string;
}

// 새 CCTV 기본값
const DEFAULT_NEW_CCTV: Omit<CCTVCameraConfig, "id"> = {
  name: "새 카메라",
  position: { x: 0, y: 5, z: 10 },
  target: { x: 0, y: 0, z: 0 },
  fov: 60,
  isActive: true,
  isAccident: false,
  resolution: 512,
};

/**
 * CCTV 설정 패널 컴포넌트
 */
export const CCTVSettingsPanel = memo(function CCTVSettingsPanel({
  cctvList,
  selectedCCTVId,
  onSelectCCTV,
  onAddCCTV,
  onRemoveCCTV,
  onUpdateCCTV,
  className = "",
}: CCTVSettingsPanelProps) {
  // 추가 다이얼로그 상태
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCCTVConfig, setNewCCTVConfig] =
    useState<Omit<CCTVCameraConfig, "id">>(DEFAULT_NEW_CCTV);

  // 삭제 확인 다이얼로그 상태
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // 선택된 CCTV
  const selectedCCTV = cctvList.find((c) => c.id === selectedCCTVId);

  // 새 CCTV 추가
  const handleAddCCTV = useCallback(() => {
    onAddCCTV?.(newCCTVConfig);
    setNewCCTVConfig(DEFAULT_NEW_CCTV);
    setIsAddDialogOpen(false);
  }, [newCCTVConfig, onAddCCTV]);

  // CCTV 삭제 확인
  const handleConfirmDelete = useCallback(() => {
    if (deleteTargetId) {
      onRemoveCCTV?.(deleteTargetId);
      setDeleteTargetId(null);
    }
  }, [deleteTargetId, onRemoveCCTV]);

  // CCTV 활성화 토글
  const handleToggleActive = useCallback(
    (id: string, isActive: boolean) => {
      onUpdateCCTV?.(id, { isActive });
    },
    [onUpdateCCTV]
  );

  // 설정 값 변경
  const handleConfigChange = useCallback(
    (id: string, field: keyof CCTVCameraConfig, value: unknown) => {
      onUpdateCCTV?.(id, { [field]: value });
    },
    [onUpdateCCTV]
  );

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">CCTV 설정</h3>
        <Button
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-1"
        >
          <span>+</span>
          <span>카메라 추가</span>
        </Button>
      </div>

      {/* CCTV 목록 */}
      <div className="space-y-2">
        {cctvList.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            등록된 CCTV가 없습니다.
          </p>
        ) : (
          cctvList.map((cctv) => (
            <div
              key={cctv.id}
              className={cn(
                "flex items-center justify-between rounded-md border p-3 transition-colors",
                selectedCCTVId === cctv.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onSelectCCTV?.(cctv.id)}
            >
              {/* CCTV 정보 */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    cctv.isActive ? "bg-green-500" : "bg-gray-500",
                    cctv.isAccident && "animate-pulse bg-red-500"
                  )}
                />
                <div>
                  <p className="font-medium text-foreground">{cctv.name}</p>
                  <p className="text-xs text-muted-foreground">
                    FOV: {cctv.fov}° | 위치: ({cctv.position.x.toFixed(1)},{" "}
                    {cctv.position.y.toFixed(1)}, {cctv.position.z.toFixed(1)})
                  </p>
                </div>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={cctv.isActive}
                  onCheckedChange={(checked) =>
                    handleToggleActive(cctv.id, checked)
                  }
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTargetId(cctv.id);
                  }}
                >
                  🗑️
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 선택된 CCTV 상세 설정 */}
      {selectedCCTV && (
        <div className="mt-4 border-t border-border pt-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            상세 설정: {selectedCCTV.name}
          </h4>

          <div className="grid grid-cols-2 gap-3">
            {/* 이름 */}
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">
                카메라 이름
              </label>
              <Input
                value={selectedCCTV.name}
                onChange={(e) =>
                  handleConfigChange(selectedCCTV.id, "name", e.target.value)
                }
                className="h-8 text-sm"
              />
            </div>

            {/* FOV */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                화각 (FOV)
              </label>
              <Input
                type="number"
                value={selectedCCTV.fov}
                onChange={(e) =>
                  handleConfigChange(
                    selectedCCTV.id,
                    "fov",
                    Number(e.target.value)
                  )
                }
                min={20}
                max={120}
                className="h-8 text-sm"
              />
            </div>

            {/* 해상도 */}
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                해상도
              </label>
              <Input
                type="number"
                value={selectedCCTV.resolution ?? 512}
                onChange={(e) =>
                  handleConfigChange(
                    selectedCCTV.id,
                    "resolution",
                    Number(e.target.value)
                  )
                }
                min={256}
                max={1024}
                step={128}
                className="h-8 text-sm"
              />
            </div>

            {/* 위치 */}
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">
                위치 (X, Y, Z)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={selectedCCTV.position.x}
                  onChange={(e) =>
                    handleConfigChange(selectedCCTV.id, "position", {
                      ...selectedCCTV.position,
                      x: Number(e.target.value),
                    })
                  }
                  className="h-8 text-sm"
                  placeholder="X"
                />
                <Input
                  type="number"
                  value={selectedCCTV.position.y}
                  onChange={(e) =>
                    handleConfigChange(selectedCCTV.id, "position", {
                      ...selectedCCTV.position,
                      y: Number(e.target.value),
                    })
                  }
                  className="h-8 text-sm"
                  placeholder="Y"
                />
                <Input
                  type="number"
                  value={selectedCCTV.position.z}
                  onChange={(e) =>
                    handleConfigChange(selectedCCTV.id, "position", {
                      ...selectedCCTV.position,
                      z: Number(e.target.value),
                    })
                  }
                  className="h-8 text-sm"
                  placeholder="Z"
                />
              </div>
            </div>

            {/* 타겟 */}
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">
                타겟 (X, Y, Z)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={selectedCCTV.target.x}
                  onChange={(e) =>
                    handleConfigChange(selectedCCTV.id, "target", {
                      ...selectedCCTV.target,
                      x: Number(e.target.value),
                    })
                  }
                  className="h-8 text-sm"
                  placeholder="X"
                />
                <Input
                  type="number"
                  value={selectedCCTV.target.y}
                  onChange={(e) =>
                    handleConfigChange(selectedCCTV.id, "target", {
                      ...selectedCCTV.target,
                      y: Number(e.target.value),
                    })
                  }
                  className="h-8 text-sm"
                  placeholder="Y"
                />
                <Input
                  type="number"
                  value={selectedCCTV.target.z}
                  onChange={(e) =>
                    handleConfigChange(selectedCCTV.id, "target", {
                      ...selectedCCTV.target,
                      z: Number(e.target.value),
                    })
                  }
                  className="h-8 text-sm"
                  placeholder="Z"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 추가 다이얼로그 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>새 CCTV 추가</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 이름 */}
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">
                카메라 이름
              </label>
              <Input
                value={newCCTVConfig.name}
                onChange={(e) =>
                  setNewCCTVConfig({ ...newCCTVConfig, name: e.target.value })
                }
                placeholder="CAM-05 새 구역"
              />
            </div>

            {/* FOV */}
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">
                화각 (FOV)
              </label>
              <Input
                type="number"
                value={newCCTVConfig.fov}
                onChange={(e) =>
                  setNewCCTVConfig({
                    ...newCCTVConfig,
                    fov: Number(e.target.value),
                  })
                }
                min={20}
                max={120}
              />
            </div>

            {/* 위치 */}
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">
                위치 (X, Y, Z)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={newCCTVConfig.position.x}
                  onChange={(e) =>
                    setNewCCTVConfig({
                      ...newCCTVConfig,
                      position: {
                        ...newCCTVConfig.position,
                        x: Number(e.target.value),
                      },
                    })
                  }
                  placeholder="X"
                />
                <Input
                  type="number"
                  value={newCCTVConfig.position.y}
                  onChange={(e) =>
                    setNewCCTVConfig({
                      ...newCCTVConfig,
                      position: {
                        ...newCCTVConfig.position,
                        y: Number(e.target.value),
                      },
                    })
                  }
                  placeholder="Y"
                />
                <Input
                  type="number"
                  value={newCCTVConfig.position.z}
                  onChange={(e) =>
                    setNewCCTVConfig({
                      ...newCCTVConfig,
                      position: {
                        ...newCCTVConfig.position,
                        z: Number(e.target.value),
                      },
                    })
                  }
                  placeholder="Z"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddCCTV}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteTargetId !== null}
        onOpenChange={() => setDeleteTargetId(null)}
      >
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle>CCTV 삭제 확인</DialogTitle>
          </DialogHeader>

          <p className="py-4 text-muted-foreground">
            선택한 CCTV를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default CCTVSettingsPanel;
