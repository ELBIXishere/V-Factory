"use client";

/**
 * CCTVFeed 컴포넌트
 * 개별 CCTV 피드를 캔버스에 표시하는 컴포넌트
 */

import { useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";
import type { CCTVViewData } from "@/lib/three";

// 컴포넌트 Props
export interface CCTVFeedProps {
  // CCTV 뷰 데이터
  viewData?: CCTVViewData;
  // CCTV ID (viewData가 없을 때 placeholder용)
  cctvId?: string;
  // CCTV 이름
  cctvName?: string;
  // 클릭 핸들러
  onClick?: () => void;
  // 추가 CSS 클래스
  className?: string;
  // 선택됨 여부
  isSelected?: boolean;
  // LIVE 인디케이터 표시
  showLiveIndicator?: boolean;
  // 타임스탬프 표시
  showTimestamp?: boolean;
  // 오버레이 표시
  showOverlay?: boolean;
}

/**
 * CCTV 피드 컴포넌트
 * WebGL에서 렌더링된 캔버스를 받아서 화면에 표시
 */
export const CCTVFeed = memo(function CCTVFeed({
  viewData,
  cctvId,
  cctvName,
  onClick,
  className = "",
  isSelected = false,
  showLiveIndicator = true,
  showTimestamp = false,
  showOverlay = true,
}: CCTVFeedProps) {
  const displayId = viewData?.id ?? cctvId ?? "unknown";
  
  // 컴포넌트 마운트 확인
  useEffect(() => {
    console.log(`[CCTVFeed] 컴포넌트 마운트: ${displayId}, viewData:`, !!viewData, "canvas:", !!viewData?.canvas);
  }, [displayId, viewData]);
  
  // 출력용 캔버스 ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // 캔버스 컨텍스트 초기화
  useEffect(() => {
    if (canvasRef.current) {
      contextRef.current = canvasRef.current.getContext("2d");
      console.log(`[CCTVFeed] ${displayId}: 캔버스 컨텍스트 초기화, context:`, !!contextRef.current);
    } else {
      console.warn(`[CCTVFeed] ${displayId}: canvasRef.current가 없음`);
    }
  }, [displayId]);

  // viewData 변경 시 캔버스 업데이트
  // canvas 참조 자체를 의존성으로 사용하여 강제 업데이트 보장
  useEffect(() => {
    const displayId = viewData?.id ?? cctvId ?? "unknown";
    
    if (!viewData?.canvas) {
      console.log(`[CCTVFeed] ${displayId}: viewData.canvas가 없음`);
      return;
    }
    
    if (!canvasRef.current) {
      console.log(`[CCTVFeed] ${displayId}: canvasRef.current가 없음`);
      return;
    }
    
    if (!contextRef.current) {
      console.log(`[CCTVFeed] ${displayId}: contextRef.current가 없음`);
      return;
    }

    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    const sourceCanvas = viewData.canvas;

    // 캔버스 크기 확인
    if (sourceCanvas.width === 0 || sourceCanvas.height === 0) {
      console.warn(`[CCTVFeed] ${displayId}: 소스 캔버스 크기가 0입니다 (${sourceCanvas.width}x${sourceCanvas.height})`);
      return;
    }

    try {
      // 출력 캔버스 크기를 소스 캔버스 크기에 맞춤
      if (canvas.width !== sourceCanvas.width || canvas.height !== sourceCanvas.height) {
        canvas.width = sourceCanvas.width;
        canvas.height = sourceCanvas.height;
        console.log(`[CCTVFeed] ${displayId}: 캔버스 크기 조정 ${canvas.width}x${canvas.height}`);
      }

      // 소스 캔버스를 출력 캔버스에 그리기
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        sourceCanvas,
        0,
        0,
        sourceCanvas.width,
        sourceCanvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      
      // 첫 프레임만 로그
      if (!(window as any)[`cctv-feed-${displayId}-logged`]) {
        console.log(`[CCTVFeed] ${displayId}: drawImage 성공, 소스: ${sourceCanvas.width}x${sourceCanvas.height}, 출력: ${canvas.width}x${canvas.height}`);
        (window as any)[`cctv-feed-${displayId}-logged`] = true;
      }
    } catch (error) {
      console.error(`[CCTVFeed] ${displayId}: drawImage error:`, error);
    }
  }, [viewData, viewData?.canvas, viewData?.timestamp, cctvId]); // canvas 참조를 명시적으로 의존성에 포함

  // 표시할 이름
  const displayName = viewData?.name ?? cctvName ?? cctvId ?? "Unknown";
  const isAccident = viewData?.isAccident ?? false;
  const isActive = viewData?.isActive ?? true;

  // 타임스탬프 포맷
  const formattedTime = viewData?.timestamp
    ? new Date(viewData.timestamp).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-control-primary transition-all duration-200",
        isSelected
          ? "border-primary ring-2 ring-primary/50"
          : "border-border hover:border-primary/50",
        isAccident && "alert-effect border-red-500",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* 렌더링된 CCTV 피드 캔버스 */}
      <canvas
        ref={canvasRef}
        width={512}
        height={512}
        className="h-full w-full object-cover"
        style={{ imageRendering: "auto" }}
      />

      {/* 데이터 없을 때 placeholder */}
      {!viewData && (
        <div className="absolute inset-0 flex items-center justify-center bg-control-primary">
          <div className="text-center">
            <span className="text-4xl opacity-30">📹</span>
            <p className="mt-2 text-xs text-muted-foreground">
              {isActive ? "연결 중..." : "비활성화"}
            </p>
          </div>
        </div>
      )}

      {/* 오버레이 정보 */}
      {showOverlay && (
        <>
          {/* 카메라 이름 */}
          <div className="absolute left-2 top-2 z-10 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {displayName}
          </div>

          {/* LIVE 인디케이터 */}
          {showLiveIndicator && viewData && (
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isAccident
                    ? "animate-pulse bg-red-500"
                    : "animate-pulse bg-green-500"
                )}
              />
              <span className="text-xs font-medium text-white drop-shadow-md">
                {isAccident ? "ALERT" : "LIVE"}
              </span>
            </div>
          )}

          {/* 타임스탬프 */}
          {showTimestamp && formattedTime && (
            <div className="absolute bottom-2 right-2 z-10 rounded bg-black/60 px-2 py-0.5 text-xs text-white/80 backdrop-blur-sm">
              {formattedTime}
            </div>
          )}

          {/* 사고 경고 배너 */}
          {isAccident && (
            <div className="absolute left-0 right-0 top-1/2 z-20 -translate-y-1/2 bg-red-600/90 px-3 py-1.5 text-center text-sm font-bold text-white backdrop-blur-sm">
              ⚠️ 사고 감지
            </div>
          )}
        </>
      )}

      {/* 선택 표시 */}
      {isSelected && (
        <div className="absolute inset-0 z-5 border-2 border-primary/70 pointer-events-none" />
      )}
    </div>
  );
});

export default CCTVFeed;
