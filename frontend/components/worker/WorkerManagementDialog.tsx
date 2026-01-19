"use client";

/**
 * 작업자/감독 관리 다이얼로그 컴포넌트
 * 작업자 추가 시 컨베이어 벨트 선택 및 이름 입력
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConveyorBeltConfig } from "@/components/three/ConveyorBelt";

export interface WorkerManagementDialogProps {
  // 다이얼로그 열림 상태
  open: boolean;
  // 다이얼로그 닫기 콜백
  onClose: () => void;
  // 작업자 추가 콜백 (이름, 컨베이어 벨트 ID)
  onAddWorker: (name: string, beltId: string) => void;
  // 감독 추가 콜백 (이름)
  onAddSupervisor: (name: string) => void;
  // 컨베이어 벨트 목록
  conveyorBelts: ConveyorBeltConfig[];
  // 다이얼로그 타입 ("worker" | "supervisor")
  type: "worker" | "supervisor";
}

/**
 * 작업자/감독 관리 다이얼로그
 */
export function WorkerManagementDialog({
  open,
  onClose,
  onAddWorker,
  onAddSupervisor,
  conveyorBelts,
  type,
}: WorkerManagementDialogProps) {
  const [name, setName] = useState("");
  const [selectedBeltId, setSelectedBeltId] = useState<string>("");

  // 폼 제출 핸들러
  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }

    if (type === "worker") {
      if (!selectedBeltId) {
        return;
      }
      onAddWorker(name.trim(), selectedBeltId);
    } else {
      onAddSupervisor(name.trim());
    }

    // 폼 초기화
    setName("");
    setSelectedBeltId("");
    onClose();
  };

  // 다이얼로그 닫기 핸들러
  const handleClose = () => {
    setName("");
    setSelectedBeltId("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {type === "worker" ? "현장 작업자 추가" : "감독/관리자 추가"}
          </DialogTitle>
          <DialogDescription>
            {type === "worker"
              ? "작업할 컨베이어 벨트를 선택하고 작업자 이름을 입력하세요."
              : "감독/관리자 이름을 입력하세요. 순찰 경로로 이동합니다."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* 이름 입력 */}
          <div className="grid gap-2">
            <Label htmlFor="name">
              {type === "worker" ? "작업자 이름" : "감독 이름"}
            </Label>
            <Input
              id="name"
              placeholder={type === "worker" ? "예: 홍길동" : "예: 이관리"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* 컨베이어 벨트 선택 (작업자만) */}
          {type === "worker" && (
            <div className="grid gap-2">
              <Label htmlFor="belt">작업할 컨베이어 벨트</Label>
              <Select value={selectedBeltId} onValueChange={setSelectedBeltId}>
                <SelectTrigger id="belt">
                  <SelectValue placeholder="컨베이어 벨트 선택" />
                </SelectTrigger>
                <SelectContent>
                  {conveyorBelts.map((belt) => (
                    <SelectItem key={belt.id} value={belt.id}>
                      {belt.name || belt.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || (type === "worker" && !selectedBeltId)}
          >
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
