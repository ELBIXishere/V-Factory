"use client";

// 메인 대시보드 페이지
import dynamic from "next/dynamic";
import { useState } from "react";
import { useSceneStore } from "@/lib/stores";

// Three.js 컴포넌트는 클라이언트에서만 로드 (SSR 비활성화)
const FactoryViewer = dynamic(
  () => import("@/components/three/FactoryViewer").then((mod) => mod.FactoryViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-control-primary">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">3D 엔진 로딩 중...</p>
        </div>
      </div>
    ),
  }
);

export default function DashboardPage() {
  // 디버그 모드 상태
  const [debugMode, setDebugMode] = useState(false);

  // 씬 스토어에서 렌더러 정보 가져오기
  const rendererInfo = useSceneStore((state) => state.rendererInfo);
  const isInitialized = useSceneStore((state) => state.isInitialized);

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
        <p className="text-muted-foreground">
          공장 전체 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* 상태 카드 그리드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 활성 CCTV 카드 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              활성 CCTV
            </span>
            <span className="text-2xl">📹</span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-foreground">4</span>
            <span className="ml-2 text-sm text-muted-foreground">/ 4대</span>
          </div>
          <p className="mt-1 text-xs text-status-safe">모든 카메라 정상 작동</p>
        </div>

        {/* 오늘 사고 카드 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              오늘 사고
            </span>
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-foreground">0</span>
            <span className="ml-2 text-sm text-muted-foreground">건</span>
          </div>
          <p className="mt-1 text-xs text-status-safe">사고 없음</p>
        </div>

        {/* 작업자 현황 카드 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              현장 작업자
            </span>
            <span className="text-2xl">👷</span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-foreground">3</span>
            <span className="ml-2 text-sm text-muted-foreground">명</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">실시간 감지</p>
        </div>

        {/* 설비 가동률 카드 */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              설비 가동률
            </span>
            <span className="text-2xl">🏭</span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-foreground">94</span>
            <span className="ml-2 text-sm text-muted-foreground">%</span>
          </div>
          <p className="mt-1 text-xs text-status-normal">정상 범위</p>
        </div>
      </div>

      {/* 3D 공장 뷰어 */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              공장 3D 뷰어
            </h2>
            {isInitialized && (
              <p className="text-xs text-muted-foreground">
                렌더러: {rendererInfo.type.toUpperCase()} | {rendererInfo.fps} FPS
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* 디버그 모드 토글 */}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              디버그 모드
            </label>
          </div>
        </div>
        <div className="h-[500px] bg-control-primary">
          <FactoryViewer debug={debugMode} />
        </div>
      </div>

      {/* 최근 이벤트 */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">최근 이벤트</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="h-2 w-2 rounded-full bg-status-safe"></span>
              <span className="text-muted-foreground">09:00:00</span>
              <span className="text-foreground">시스템 시작됨</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="h-2 w-2 rounded-full bg-status-normal"></span>
              <span className="text-muted-foreground">09:00:05</span>
              <span className="text-foreground">
                모든 CCTV 연결 완료 (4대)
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="h-2 w-2 rounded-full bg-status-normal"></span>
              <span className="text-muted-foreground">09:00:10</span>
              <span className="text-foreground">컨베이어 벨트 가동 시작</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="h-2 w-2 rounded-full bg-status-safe"></span>
              <span className="text-muted-foreground">09:00:15</span>
              <span className="text-foreground">3D 렌더링 엔진 초기화 완료</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
