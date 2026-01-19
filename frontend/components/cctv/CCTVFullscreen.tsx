"use client";

/**
 * CCTVFullscreen 컴포넌트
 * CCTV 전체화면 모드 - Dialog로 표시되며 스크린샷 저장 기능 포함
 */

import { useEffect, useRef, useCallback, memo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CCTVViewData } from "@/lib/three";

// 컴포넌트 Props
export interface CCTVFullscreenProps {
  // 열림 상태
  isOpen: boolean;
  // 닫기 콜백
  onClose: () => void;
  // CCTV 뷰 데이터
  viewData?: CCTVViewData;
  // CCTV 정보
  cctvInfo?: {
    id: string;
    name: string;
    position?: { x: number; y: number; z: number };
    fov?: number;
  };
}

/**
 * CCTV 전체화면 컴포넌트
 */
export const CCTVFullscreen = memo(function CCTVFullscreen({
  isOpen,
  onClose,
  viewData,
  cctvInfo,
}: CCTVFullscreenProps) {
  // 캔버스 ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // 스크린샷 저장 상태
  const [isSaving, setIsSaving] = useState(false);

  // 컴포넌트 마운트 시 로그
  useEffect(() => {
    console.log("[CCTVFullscreen] 컴포넌트 마운트:", { 
      isOpen, 
      hasViewData: !!viewData,
      hasCctvInfo: !!cctvInfo,
      viewDataId: viewData?.id,
      cctvInfoId: cctvInfo?.id,
    });
    
    return () => {
      console.log("[CCTVFullscreen] 컴포넌트 언마운트");
    };
  }, []); // 마운트 시 한 번만 실행

  // isOpen 변경 시 무조건 로그
  useEffect(() => {
    console.log("[CCTVFullscreen] isOpen 변경:", {
      isOpen,
      hasViewData: !!viewData,
      hasCanvas: !!viewData?.canvas,
      viewDataId: viewData?.id,
      viewDataName: viewData?.name,
      cctvInfoId: cctvInfo?.id,
      cctvInfoName: cctvInfo?.name,
    });
  }, [isOpen, viewData, cctvInfo]);

  // 캔버스 컨텍스트 초기화 (CCTVFeed와 동일한 방식)
  useEffect(() => {
    if (canvasRef.current) {
      contextRef.current = canvasRef.current.getContext("2d");
    }
  }, []);

  // 캔버스에 이미지 그리기 함수 (공통 로직)
  const drawCanvas = useCallback(() => {
    if (!viewData?.canvas || !canvasRef.current || !contextRef.current) {
      return;
    }

    const ctx = contextRef.current;
    const canvas = canvasRef.current;

    // 캔버스 크기가 0이면 스킵
    if (canvas.width === 0 || canvas.height === 0) {
      return;
    }

    try {
      // 소스 캔버스를 출력 캔버스에 그리기 (CCTVFeed와 동일한 방식)
      ctx.drawImage(
        viewData.canvas,
        0,
        0,
        viewData.canvas.width,
        viewData.canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    } catch (error) {
      console.error(`[CCTVFullscreen] drawImage error for ${viewData.id}:`, error);
    }
  }, [viewData]);

  // 캔버스 크기 설정 및 이미지 그리기 (모달이 열릴 때 컨테이너 크기에 맞춤)
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const updateCanvasSize = () => {
      if (!canvasRef.current) return;
      
      const container = canvasRef.current.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const oldWidth = canvasRef.current.width;
          const oldHeight = canvasRef.current.height;
          
          canvasRef.current.width = rect.width;
          canvasRef.current.height = rect.height;
          
          // 캔버스 크기가 변경되면 이미지 다시 그리기
          if (oldWidth !== rect.width || oldHeight !== rect.height) {
            drawCanvas();
          }
        }
      }
    };

    // 즉시 한 번 실행
    updateCanvasSize();

    // DOM 렌더링 완료를 위해 다음 프레임에 다시 실행
    requestAnimationFrame(() => {
      updateCanvasSize();
    });
  }, [isOpen, drawCanvas]);

  // viewData 변경 시 캔버스 업데이트
  // CCTVFeed와 동일한 방식: viewData?.timestamp가 변경될 때마다 drawImage 실행
  useEffect(() => {
    if (!isOpen) return; // 모달이 닫혀있으면 스킵
    
    drawCanvas();
  }, [viewData, viewData?.timestamp, isOpen, drawCanvas]);

  // 스크린샷 저장
  const handleSaveScreenshot = useCallback(async () => {
    if (!canvasRef.current) return;

    setIsSaving(true);

    try {
      // 캔버스를 이미지 데이터로 변환
      const dataUrl = canvasRef.current.toDataURL("image/png");

      // 다운로드 링크 생성
      const link = document.createElement("a");
      link.download = `CCTV_${cctvInfo?.id ?? "unknown"}_${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
      link.href = dataUrl;
      link.click();

      console.log("[CCTVFullscreen] Screenshot saved");
    } catch (error) {
      console.error("[CCTVFullscreen] Failed to save screenshot:", error);
    } finally {
      setIsSaving(false);
    }
  }, [cctvInfo?.id]);

  // 표시 정보
  const displayName = viewData?.name ?? cctvInfo?.name ?? "Unknown";
  const isAccident = viewData?.isAccident ?? false;

  // 타임스탬프 포맷
  const formattedTime = viewData?.timestamp
    ? new Date(viewData.timestamp).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "-";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl border-border bg-card p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <span>📹</span>
            <span>{displayName}</span>
            {isAccident && (
              <span className="ml-2 animate-pulse rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                ⚠️ ALERT
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {/* CCTV 피드 캔버스 */}
          <div
            className={cn(
              "relative overflow-hidden rounded-lg border",
              isAccident ? "border-red-500 alert-effect" : "border-border",
              "aspect-video w-full bg-black"
            )}
            style={{ minHeight: "400px" }}
          >
            <canvas
              ref={canvasRef}
              className="h-full w-full object-cover"
              style={{ 
                imageRendering: "auto",
                display: "block",
                backgroundColor: "#000",
                minHeight: "400px"
              }}
            />

            {/* LIVE 인디케이터 */}
            {viewData && (
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    isAccident
                      ? "animate-pulse bg-red-500"
                      : "animate-pulse bg-green-500"
                  )}
                />
                <span className="text-sm font-medium text-white drop-shadow-lg">
                  {isAccident ? "ALERT" : "LIVE"}
                </span>
              </div>
            )}

            {/* 타임스탬프 */}
            <div className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-1 text-sm text-white backdrop-blur-sm">
              {formattedTime}
            </div>

            {/* 데이터 없을 때 placeholder */}
            {!viewData && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center">
                  <span className="text-6xl opacity-30">📹</span>
                  <p className="mt-4 text-muted-foreground">
                    CCTV 피드를 불러오는 중...
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {cctvInfo?.name || "Unknown"}
                  </p>
                </div>
              </div>
            )}
            
            {/* viewData는 있지만 canvas가 없을 때 */}
            {viewData && !viewData.canvas && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center">
                  <span className="text-6xl opacity-30">📹</span>
                  <p className="mt-4 text-muted-foreground">
                    렌더링 중...
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {viewData.name || cctvInfo?.name || "Unknown"}
                  </p>
                </div>
              </div>
            )}

            {/* 사고 경고 오버레이 */}
            {isAccident && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-red-600/90 px-4 py-3 text-center">
                <p className="text-lg font-bold text-white">
                  ⚠️ 사고 감지됨 - 즉시 확인 필요
                </p>
              </div>
            )}
          </div>

          {/* 정보 패널 및 액션 버튼 */}
          <div className="mt-4 flex items-start justify-between gap-4">
            {/* CCTV 정보 */}
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                카메라 정보
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="text-muted-foreground">ID:</div>
                <div className="font-mono text-foreground">
                  {cctvInfo?.id ?? viewData?.id ?? "-"}
                </div>

                <div className="text-muted-foreground">상태:</div>
                <div
                  className={cn(
                    "font-medium",
                    viewData?.isActive
                      ? "text-green-500"
                      : "text-muted-foreground"
                  )}
                >
                  {viewData?.isActive ? "활성" : "비활성"}
                </div>

                {cctvInfo?.position && (
                  <>
                    <div className="text-muted-foreground">위치:</div>
                    <div className="font-mono text-foreground">
                      ({cctvInfo.position.x.toFixed(1)},{" "}
                      {cctvInfo.position.y.toFixed(1)},{" "}
                      {cctvInfo.position.z.toFixed(1)})
                    </div>
                  </>
                )}

                {cctvInfo?.fov && (
                  <>
                    <div className="text-muted-foreground">FOV:</div>
                    <div className="text-foreground">{cctvInfo.fov}°</div>
                  </>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSaveScreenshot}
                disabled={!viewData || isSaving}
                className="flex items-center gap-2"
                variant="default"
              >
                <span>📷</span>
                {isSaving ? "저장 중..." : "스크린샷 저장"}
              </Button>

              <Button
                onClick={onClose}
                variant="outline"
                className="flex items-center gap-2"
              >
                <span>✕</span>
                닫기
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default CCTVFullscreen;
