"use client";

/**
 * 사고 로그 페이지
 * Backend API 연동 및 실시간 업데이트 지원
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIncidents, useResolveIncident } from "@/lib/api/hooks/useIncidents";
import { useFactories, useCreateFactory } from "@/lib/api/hooks/useFactories";
import { createDefaultCCTVCameras } from "@/lib/three";
import type { IncidentType, IncidentResponse } from "@/lib/api/types";
import { RandomIncidentTest } from "@/components/incident";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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
const SEVERITY_LEVELS: Record<number, { label: string; color: string; badgeColor: string }> = {
  1: { label: "경미", color: "text-green-500", badgeColor: "bg-green-500/20 text-green-500" },
  2: { label: "주의", color: "text-yellow-500", badgeColor: "bg-yellow-500/20 text-yellow-500" },
  3: { label: "경고", color: "text-orange-500", badgeColor: "bg-orange-500/20 text-orange-500" },
  4: { label: "위험", color: "text-red-500", badgeColor: "bg-red-500/20 text-red-500" },
  5: { label: "심각", color: "text-red-700", badgeColor: "bg-red-700/20 text-red-700" },
};

export default function IncidentsPage() {
  const router = useRouter();

  // API 훅
  const { data: incidents, isLoading, error, refetch } = useIncidents();
  const resolveIncidentMutation = useResolveIncident();
  const { data: factories, isLoading: isLoadingFactories } = useFactories(); // 공장 목록 조회
  const createFactoryMutation = useCreateFactory(); // 공장 생성 훅
  
  // CCTV 설정은 랜덤 테스트용이므로 기본 CCTV 사용 (API 호출 안 함)
  // 실제 factory ID가 필요하면 공장 목록을 먼저 조회해야 함
  const cctvConfigs = useMemo(() => {
    // 기본 CCTV 사용 (랜덤 테스트는 기본 CCTV 위치 기반으로 작동)
    return createDefaultCCTVCameras();
  }, []);
  
  // Factory가 없으면 기본 Factory 자동 생성
  useEffect(() => {
    if (!isLoadingFactories && factories && factories.length === 0 && !createFactoryMutation.isPending) {
      console.log("[IncidentsPage] Factory가 없어 기본 Factory 생성 중...");
      createFactoryMutation.mutate(
        {
          name: "기본 공장",
          description: "V-Factory 기본 테스트 공장",
          layout_json: {},
        },
        {
          onSuccess: (newFactory) => {
            console.log("[IncidentsPage] Factory 생성 성공:", newFactory.id);
          },
          onError: (error) => {
            console.error("[IncidentsPage] Factory 생성 실패:", error);
          },
        }
      );
    }
  }, [factories, isLoadingFactories, createFactoryMutation]);
  
  // 실제 존재하는 factory ID 사용 (없으면 첫 번째 factory)
  const defaultFactoryId = useMemo(() => {
    // Factory 목록이 로드 중이면 null 반환
    if (isLoadingFactories) {
      console.log("[IncidentsPage] Factory 목록 로딩 중...");
      return null;
    }
    
    // Factory 목록이 있고 항목이 있으면 첫 번째 Factory ID 사용
    if (factories && factories.length > 0) {
      const factoryId = factories[0].id;
      console.log("[IncidentsPage] 사용할 Factory ID:", factoryId, "Factory 목록:", factories.map(f => ({ id: f.id, name: f.name })));
      
      // 유효한 UUID 형식인지 확인
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(factoryId)) {
        console.error("[IncidentsPage] 잘못된 Factory ID 형식:", factoryId);
        return null;
      }
      
      return factoryId;
    }
    
    // Factory가 아직 생성 중이거나 없으면 null 반환 (랜덤 테스트 비활성화)
    console.log("[IncidentsPage] Factory가 없음 - 랜덤 테스트 비활성화", {
      factories,
      isLoadingFactories,
      isPending: createFactoryMutation.isPending,
    });
    return null;
  }, [factories, isLoadingFactories, createFactoryMutation.isPending]);

  // 필터 상태
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 상세 모달 상태
  const [selectedIncident, setSelectedIncident] = useState<IncidentResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 필터링된 사고 목록
  const filteredIncidents = useMemo(() => {
    if (!incidents || !Array.isArray(incidents)) return [];

    return incidents.filter((incident) => {
      // 유형 필터
      if (typeFilter !== "all" && incident.type !== typeFilter) {
        return false;
      }

      // 상태 필터
      if (statusFilter === "resolved" && !incident.is_resolved) {
        return false;
      }
      if (statusFilter === "unresolved" && incident.is_resolved) {
        return false;
      }

      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const typeLabel = INCIDENT_TYPE_LABELS[incident.type as IncidentType]?.label || "";
        const description = incident.description?.toLowerCase() || "";

        if (
          !incident.id.toLowerCase().includes(query) &&
          !typeLabel.toLowerCase().includes(query) &&
          !description.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, typeFilter, statusFilter, searchQuery]);

  // 통계 계산
  const stats = useMemo(() => {
    if (!incidents || !Array.isArray(incidents)) return { total: 0, unresolved: 0, thisMonth: 0, avgSeverity: 0 };

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthIncidents = incidents.filter(
      (i) => new Date(i.timestamp) >= thisMonthStart
    );

    const totalSeverity = incidents.reduce((sum, i) => sum + i.severity, 0);

    return {
      total: incidents.length,
      unresolved: incidents.filter((i) => !i.is_resolved).length,
      thisMonth: thisMonthIncidents.length,
      avgSeverity: incidents.length > 0 ? (totalSeverity / incidents.length).toFixed(1) : "0.0",
    };
  }, [incidents]);

  // 사고 상세보기 핸들러
  const handleViewDetail = useCallback((incident: IncidentResponse) => {
    setSelectedIncident(incident);
    setIsDetailModalOpen(true);
  }, []);

  // 사고 해결 처리 핸들러
  const handleResolve = useCallback(
    async (incidentId: string) => {
      try {
        const response = await resolveIncidentMutation.mutateAsync(incidentId);
        toast.success("✅ 사고가 해결 처리되었습니다", {
          description: response.detected_cctv_ids && response.detected_cctv_ids.length > 0
            ? `${response.detected_cctv_ids.length}개 CCTV의 이펙트가 해제되었습니다.`
            : "사고 상태가 해결됨으로 변경되었습니다.",
          duration: 4000,
        });
        setIsDetailModalOpen(false);
        refetch();
      } catch (error) {
        console.error("사고 해결 처리 실패:", error);
        toast.error("사고 해결 처리에 실패했습니다", {
          description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        });
      }
    },
    [resolveIncidentMutation, refetch]
  );

  // CCTV 모니터링으로 이동
  const handleGoToCCTV = useCallback(
    (cctvIds: string[]) => {
      if (cctvIds.length > 0) {
        // 첫 번째 CCTV로 이동
        router.push(`/monitoring?cctv=${cctvIds[0]}`);
      }
    },
    [router]
  );

  // 타임스탬프 포맷
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // 좌표 포맷 (Backend 응답은 position_x, position_y, position_z로 분리됨)
  const formatPosition = (incident: IncidentResponse) => {
    return `(${incident.position_x.toFixed(1)}, ${incident.position_y.toFixed(1)}, ${incident.position_z.toFixed(1)})`;
  };

  // 데이터 확인 로그 (Hooks는 조건부 return 이전에 위치해야 함)
  useEffect(() => {
    if (incidents && Array.isArray(incidents)) {
      console.log("[IncidentsPage] 사고 목록 데이터:", incidents.length, "건", incidents);
    }
  }, [incidents]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // 에러 상태
  if (error) {
    console.error("[IncidentsPage] 사고 목록 로드 실패:", error);
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg text-destructive mb-2">사고 목록을 불러오는데 실패했습니다</p>
        <p className="text-sm text-muted-foreground mb-4">
          {error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."}
        </p>
        <Button onClick={() => refetch()}>다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">사고 로그</h1>
          <p className="text-muted-foreground">
            발생한 사고 기록을 확인하고 관리합니다
          </p>
        </div>

        {/* 필터/검색 */}
        <div className="flex gap-2">
          {/* 유형 필터 */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 유형</SelectItem>
              {Object.entries(INCIDENT_TYPE_LABELS).map(([type, { label, icon }]) => (
                <SelectItem key={type} value={type}>
                  {icon} {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 상태 필터 */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="unresolved">미해결</SelectItem>
              <SelectItem value="resolved">해결됨</SelectItem>
            </SelectContent>
          </Select>

          {/* 검색 */}
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="검색..."
            className="w-40"
          />

          {/* 새로고침 버튼 */}
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            🔄
          </Button>
        </div>
      </div>

      {/* 랜덤 테스트 패널 */}
      <div className="flex justify-end">
        <div className="w-80">
          {defaultFactoryId ? (
            <RandomIncidentTest
              factoryId={defaultFactoryId}
              cctvConfigs={cctvConfigs}
              onIncidentCreated={(incidentId) => {
                console.log("[IncidentsPage] 랜덤 사고 생성됨:", incidentId);
                // 사고 목록 새로고침
                refetch();
              }}
            />
          ) : (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-semibold text-foreground">랜덤 테스트</h3>
              </div>
              <div className="rounded-md bg-secondary/50 p-2 text-xs text-muted-foreground text-center">
                {isLoadingFactories || createFactoryMutation.isPending
                  ? "Factory 생성 중..."
                  : createFactoryMutation.isError
                  ? "Factory 생성 실패. 페이지를 새로고침해주세요."
                  : "Factory를 준비하는 중입니다..."}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">총 사고 건수</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">미해결 사고</p>
          <p className="mt-1 text-2xl font-bold text-status-warning">{stats.unresolved}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">이번 달 사고</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.thisMonth}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">평균 심각도</p>
          <p className="mt-1 text-2xl font-bold text-status-warning">{stats.avgSeverity}</p>
        </Card>
      </div>

      {/* 사고 목록 테이블 */}
      <Card>
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            사고 기록 ({filteredIncidents.length}건)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  유형
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  심각도
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  위치
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  발생 시간
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    {incidents && Array.isArray(incidents) && incidents.length > 0
                      ? "검색 결과가 없습니다"
                      : "등록된 사고가 없습니다"}
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => {
                  const typeInfo = INCIDENT_TYPE_LABELS[incident.type as IncidentType] || {
                    label: incident.type,
                    icon: "⚠️",
                  };
                  const severityInfo = SEVERITY_LEVELS[incident.severity] || {
                    label: `Level ${incident.severity}`,
                    badgeColor: "bg-gray-500/20 text-gray-500",
                  };

                  return (
                    <tr
                      key={incident.id}
                      className="border-b border-border hover:bg-secondary/30 cursor-pointer"
                      onClick={() => handleViewDetail(incident)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-foreground font-mono">
                        {incident.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        <span className="flex items-center gap-1">
                          <span>{typeInfo.icon}</span>
                          <span>{typeInfo.label}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={severityInfo.badgeColor}>
                          Level {incident.severity} ({severityInfo.label})
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground font-mono text-xs">
                        {formatPosition(incident)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatTimestamp(incident.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            incident.is_resolved
                              ? "bg-green-500/20 text-green-500"
                              : "bg-red-500/20 text-red-500 animate-pulse"
                          }
                        >
                          {incident.is_resolved ? "해결됨" : "미해결"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(incident);
                          }}
                        >
                          상세보기
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 사고 상세 모달 */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIncident && (
                <>
                  <span>
                    {INCIDENT_TYPE_LABELS[selectedIncident.type as IncidentType]?.icon || "⚠️"}
                  </span>
                  <span>
                    {INCIDENT_TYPE_LABELS[selectedIncident.type as IncidentType]?.label || selectedIncident.type}{" "}
                    사고
                  </span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>사고 상세 정보</DialogDescription>
          </DialogHeader>

          {selectedIncident && (
            <div className="space-y-4 py-4">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">사고 ID</p>
                  <p className="font-mono text-sm">{selectedIncident.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">심각도</p>
                  <Badge className={SEVERITY_LEVELS[selectedIncident.severity]?.badgeColor}>
                    Level {selectedIncident.severity} (
                    {SEVERITY_LEVELS[selectedIncident.severity]?.label})
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">발생 시간</p>
                  <p className="text-sm">{formatTimestamp(selectedIncident.timestamp)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">상태</p>
                  <Badge
                    className={
                      selectedIncident.is_resolved
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    }
                  >
                    {selectedIncident.is_resolved ? "해결됨" : "미해결"}
                  </Badge>
                </div>
              </div>

              {/* 위치 정보 */}
              <div>
                <p className="text-sm text-muted-foreground">발생 위치</p>
                <p className="font-mono text-sm">
                  X: {selectedIncident.position_x.toFixed(2)}, Y:{" "}
                  {selectedIncident.position_y.toFixed(2)}, Z:{" "}
                  {selectedIncident.position_z.toFixed(2)}
                </p>
              </div>

              {/* 설명 */}
              {selectedIncident.description && (
                <div>
                  <p className="text-sm text-muted-foreground">설명</p>
                  <p className="text-sm">{selectedIncident.description}</p>
                </div>
              )}

              {/* 감지 CCTV */}
              {selectedIncident.detected_cctv_ids &&
                selectedIncident.detected_cctv_ids.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">감지 CCTV</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedIncident.detected_cctv_ids.map((cctvId) => (
                        <Button
                          key={cctvId}
                          variant="outline"
                          size="sm"
                          onClick={() => handleGoToCCTV([cctvId])}
                        >
                          📹 {cctvId.slice(0, 8)}...
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

              {/* 해결 시간 */}
              {selectedIncident.resolved_at && (
                <div>
                  <p className="text-sm text-muted-foreground">해결 시간</p>
                  <p className="text-sm">{formatTimestamp(selectedIncident.resolved_at)}</p>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-2 pt-4 border-t border-border">
                {!selectedIncident.is_resolved && (
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleResolve(selectedIncident.id)}
                    disabled={resolveIncidentMutation.isPending}
                  >
                    {resolveIncidentMutation.isPending ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        처리 중...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">✅</span>
                        해결 처리
                      </>
                    )}
                  </Button>
                )}
                {selectedIncident.detected_cctv_ids &&
                  selectedIncident.detected_cctv_ids.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => handleGoToCCTV(selectedIncident.detected_cctv_ids || [])}
                    >
                      📹 CCTV 보기
                    </Button>
                  )}
                <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)}>
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
