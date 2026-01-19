"use client";

/**
 * CCTVGridView 컴포넌트
 * 여러 CCTV 피드를 그리드 레이아웃으로 표시
 */

import { useState, useCallback, memo, useEffect } from "react";
import { CCTVFeed } from "./CCTVFeed";
import type { CCTVViewData } from "@/lib/three";
import { cn } from "@/lib/utils";
import { useCCTVStore } from "@/lib/stores";

// 그리드 레이아웃 타입
export type GridLayout = "2x2" | "3x3" | "4x4";

// 컴포넌트 Props
export interface CCTVGridViewProps {
  // CCTV 뷰 데이터 배열
  views: CCTVViewData[];
  // 현재 그리드 레이아웃
  layout?: GridLayout;
  // 레이아웃 변경 콜백
  onLayoutChange?: (layout: GridLayout) => void;
  // CCTV 선택 콜백
  onSelectCCTV?: (cctvId: string) => void;
  // CCTV 전체화면 콜백
  onFullscreen?: (cctvId: string) => void;
  // 추가 CSS 클래스
  className?: string;
  // 헤더 표시 여부
  showHeader?: boolean;
  // 선택된 CCTV ID
  selectedCCTVId?: string;
}

// 그리드 설정
const GRID_CONFIG: Record<GridLayout, { cols: number; rows: number; gap: string }> = {
  "2x2": { cols: 2, rows: 2, gap: "gap-2" },
  "3x3": { cols: 3, rows: 3, gap: "gap-2" },
  "4x4": { cols: 4, rows: 4, gap: "gap-1" },
};

/**
 * CCTV 그리드 뷰 컴포넌트
 * 2x2, 3x3, 4x4 레이아웃을 지원
 */
export const CCTVGridView = memo(function CCTVGridView({
  views,
  layout = "2x2",
  onLayoutChange,
  onSelectCCTV,
  onFullscreen,
  className = "",
  showHeader = true,
  selectedCCTVId,
}: CCTVGridViewProps) {
  console.log("[CCTVGridView] 컴포넌트 렌더링, views.length:", views.length);
  
  // CCTV 목록 가져오기 (cctvViews가 비어있을 때 사용)
  const cctvList = useCCTVStore((state) => state.cctvList);
  console.log("[CCTVGridView] cctvList.length:", cctvList.length);
  
  // 내부 레이아웃 상태 (외부에서 제어하지 않을 때 사용)
  const [internalLayout, setInternalLayout] = useState<GridLayout>(layout);
  const currentLayout = onLayoutChange ? layout : internalLayout;

  // 레이아웃 변경 핸들러
  const handleLayoutChange = useCallback(
    (newLayout: GridLayout) => {
      if (onLayoutChange) {
        onLayoutChange(newLayout);
      } else {
        setInternalLayout(newLayout);
      }
    },
    [onLayoutChange]
  );

  // CCTV 클릭 핸들러 (더블클릭 시 전체화면)
  const handleCCTVClick = useCallback(
    (cctvId: string) => {
      onSelectCCTV?.(cctvId);
    },
    [onSelectCCTV]
  );

  // CCTV 더블클릭 핸들러
  const handleCCTVDoubleClick = useCallback(
    (cctvId: string) => {
      onFullscreen?.(cctvId);
    },
    [onFullscreen]
  );

  // 그리드 설정
  const gridConfig = GRID_CONFIG[currentLayout];
  const totalSlots = gridConfig.cols * gridConfig.rows;

  // views 변경 감지 및 디버그 로그
  useEffect(() => {
    console.log("[CCTVGridView] views prop 변경:", {
      viewsLength: views.length,
      views: views.map(v => ({
        id: v.id,
        name: v.name,
        hasCanvas: !!v.canvas,
        canvasSize: v.canvas ? `${v.canvas.width}x${v.canvas.height}` : 'null',
        isActive: v.isActive,
        timestamp: v.timestamp,
      })),
    });
  }, [views]);

  // cctvViews가 비어있으면 cctvList를 사용하여 초기 뷰 생성
  const effectiveViews = views.length > 0 
    ? views 
    : cctvList.map((cctv) => ({
        id: cctv.id,
        name: cctv.name,
        isActive: cctv.isActive,
        isAccident: cctv.isAccident,
        canvas: null, // 아직 렌더링되지 않음
      }));

  // effectiveViews 변경 감지 및 디버그 로그
  useEffect(() => {
    console.log("[CCTVGridView] effectiveViews 계산 완료:", {
      effectiveViewsLength: effectiveViews.length,
      hasCanvasCount: effectiveViews.filter(v => v.canvas !== null).length,
      source: views.length > 0 ? 'views prop' : 'cctvList fallback',
    });
  }, [effectiveViews, views.length]);

  // 뷰 데이터를 ID로 맵핑
  const viewMap = new Map(effectiveViews.map((v) => [v.id, v]));

  // 그리드에 표시할 슬롯 생성
  const slots = Array.from({ length: totalSlots }, (_, index) => {
    const view = effectiveViews[index];
    return view ?? null;
  });

  return (
    <div className={cn("flex flex-col", className)}>
      {/* 헤더 영역 */}
      {showHeader && (
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">CCTV 그리드</h2>
            <p className="text-sm text-muted-foreground">
              활성 카메라: {effectiveViews.filter((v) => v.isActive).length}개 / 총{" "}
              {effectiveViews.length}개
            </p>
          </div>

          {/* 그리드 레이아웃 선택 버튼 */}
          <div className="flex gap-1.5">
            {(["2x2", "3x3", "4x4"] as GridLayout[]).map((layoutOption) => (
              <button
                key={layoutOption}
                onClick={() => handleLayoutChange(layoutOption)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  currentLayout === layoutOption
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {layoutOption}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CCTV 그리드 */}
      <div
        className={cn(
          "grid aspect-video w-full",
          gridConfig.gap,
          currentLayout === "2x2" && "grid-cols-2 grid-rows-2",
          currentLayout === "3x3" && "grid-cols-3 grid-rows-3",
          currentLayout === "4x4" && "grid-cols-4 grid-rows-4"
        )}
      >
        {slots.map((view, index) => {
          const slotId = view?.id ?? `empty-${index}`;
          console.log(`[CCTVGridView] 슬롯 ${index} 렌더링:`, slotId, "view:", !!view, "canvas:", !!view?.canvas);
          
          return (
            <div
              key={slotId}
              className="relative"
              onDoubleClick={() => view && handleCCTVDoubleClick(view.id)}
            >
              <CCTVFeed
                viewData={view ?? undefined}
                cctvId={view?.id ?? `slot-${index}`}
                cctvName={view?.name ?? `빈 슬롯 ${index + 1}`}
                onClick={() => view && handleCCTVClick(view.id)}
                isSelected={selectedCCTVId === view?.id}
                showLiveIndicator={true}
                showTimestamp={currentLayout !== "4x4"}
                showOverlay={true}
                className="h-full"
              />

              {/* 빈 슬롯 표시 */}
              {!view && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-border bg-control-primary/50">
                  <span className="text-sm text-muted-foreground">
                    CCTV 없음
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 안내 메시지 */}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        💡 CCTV 피드를 클릭하여 선택하거나, 더블클릭하여 전체 화면으로 확대합니다.
      </div>
    </div>
  );
});

export default CCTVGridView;
