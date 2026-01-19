"use client";

/**
 * CCTVView 컴포넌트
 * CCTV 개별 뷰 표시 - Dialog 없이 순수 컴포넌트로 분리
 * 재사용 가능하도록 Dialog 의존성 제거
 */

import { useEffect, useRef, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CCTVViewData } from "@/lib/three";

// 컴포넌트 Props
export interface CCTVViewProps {
  // CCTV 뷰 데이터
  viewData?: CCTVViewData;
  // CCTV 정보
  cctvInfo?: {
    id: string;
    name: string;
    position?: { x: number; y: number; z: number };
    fov?: number;
  };
  // 스크린샷 저장 핸들러
  onSaveScreenshot?: () => void;
  // 뒤로가기 핸들러
  onBack?: () => void;
  // 추가 CSS 클래스
  className?: string;
  // 전체 화면 모드 여부
  fullscreen?: boolean;
}

/**
 * CCTV 개별 뷰 컴포넌트
 * Dialog 없이 순수 뷰 컴포넌트
 */
export const CCTVView = memo(function CCTVView({
  viewData,
  cctvInfo,
  onSaveScreenshot,
  onBack,
  className = "",
  fullscreen = false,
}: CCTVViewProps) {
  // 캔버스 ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // 캔버스 컨텍스트 초기화
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
      console.error(`[CCTVView] drawImage error for ${viewData.id}:`, error);
    }
  }, [viewData]);

  // 캔버스 크기 설정 및 이미지 그리기
  useEffect(() => {
    if (!canvasRef.current) return;

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

    // 리사이즈 이벤트 리스너
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [drawCanvas, fullscreen]);

  // viewData 변경 시 캔버스 업데이트 (requestAnimationFrame으로 최적화)
  useEffect(() => {
    if (!viewData) return;
    
    // requestAnimationFrame을 사용하여 렌더링 최적화
    const rafId = requestAnimationFrame(() => {
      drawCanvas();
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [viewData, viewData?.timestamp, drawCanvas]);

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
    <div className={cn("flex flex-col", className)}>
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← 뒤로
            </Button>
          )}
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <span>📹</span>
              <span>{displayName}</span>
              {isAccident && (
                <span className="ml-2 animate-pulse rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                  ⚠️ ALERT
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              CCTV 개별 뷰 모드
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          {onSaveScreenshot && (
            <Button
              onClick={onSaveScreenshot}
              disabled={!viewData}
              className="flex items-center gap-2"
              variant="default"
            >
              <span>📷</span>
              스크린샷 저장
            </Button>
          )}
        </div>
      </div>

      {/* CCTV 피드 캔버스 */}
      <div
        className={cn(
          "relative flex-1 overflow-hidden rounded-lg border",
          isAccident ? "border-red-500 alert-effect" : "border-border",
          "bg-black"
        )}
        style={{ minHeight: fullscreen ? "calc(100vh - 200px)" : "600px" }}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full object-cover"
          style={{
            imageRendering: "auto",
            display: "block",
            backgroundColor: "#000",
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
              <p className="mt-4 text-muted-foreground">렌더링 중...</p>
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

      {/* 정보 패널 */}
      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
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
                ({cctvInfo.position.x.toFixed(1)}, {cctvInfo.position.y.toFixed(1)},{" "}
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
    </div>
  );
});

export default CCTVView;
