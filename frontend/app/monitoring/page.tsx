"use client";

/**
 * CCTV 모니터링 페이지
 * 공장 씬을 렌더링하고 여러 CCTV 뷰를 그리드로 표시
 */

import { useCallback, useState, useEffect, useRef } from "react";
import { FactoryScene } from "@/components/three";
import type { NPCRef } from "@/components/three/FactoryScene";
import { NPCState } from "@/components/three/WorkerNPC";
import {
  CCTVGridView,
  CCTVFullscreen,
  CCTVSettingsPanel,
  type GridLayout,
} from "@/components/cctv";
import { IncidentTriggerPanel, RandomIncidentTest } from "@/components/incident";
import {
  SceneManager,
  MultiViewRenderer,
  createDefaultCCTVCameras,
  type CCTVViewData,
  type CCTVCameraConfig,
} from "@/lib/three";
import { useCCTVStore } from "@/lib/stores";
import { useCreateIncidentWithCCTV } from "@/lib/api/hooks/useIncidents";
import { useFactories } from "@/lib/api/hooks/useFactories";
import type { IncidentType, Vector3 } from "@/lib/api/types";
import { generateRandomIncident } from "@/lib/utils/random-incident";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function MonitoringPage() {
  // SceneManager 상태
  const [sceneManager, setSceneManager] = useState<SceneManager | null>(null);

  // MultiViewRenderer 참조
  const multiViewRendererRef = useRef<MultiViewRenderer | null>(null);

  // CCTV 뷰 데이터 상태
  const [cctvViews, setCCTVViews] = useState<CCTVViewData[]>([]);

  // CCTV 설정 목록
  const [cctvConfigs, setCCTVConfigs] = useState<CCTVCameraConfig[]>([]);

  // 그리드 레이아웃
  const [gridLayout, setGridLayout] = useState<GridLayout>("2x2");

  // 선택된 CCTV
  const [selectedCCTVId, setSelectedCCTVId] = useState<string | undefined>();

  // 전체화면 CCTV
  const [fullscreenCCTVId, setFullscreenCCTVId] = useState<string | null>(null);

  // 설정 패널 표시 여부
  const [showSettings, setShowSettings] = useState(false);

  // 사고 트리거 패널 표시 여부
  const [showIncidentPanel, setShowIncidentPanel] = useState(false);

  // 헬퍼 표시 여부
  const [showHelpers, setShowHelpers] = useState(true);

  // 전역 스토어
  const { setCCTVList, setAccidentFlag } = useCCTVStore();

  // 사고 생성 훅 (CCTV 플래그 연동)
  const createIncidentMutation = useCreateIncidentWithCCTV();
  
  // Factory 목록 조회 (사고 생성 시 사용)
  const { data: factories } = useFactories();
  
  // 실제 존재하는 Factory ID 사용
  const defaultFactoryId = factories && factories.length > 0 
    ? factories[0].id 
    : "11111111-1111-1111-1111-111111111111"; // 데이터베이스 초기 데이터 Factory ID

  // NPC 참조 관리
  const npcRefsRef = useRef<Map<string, NPCRef>>(new Map());
  const findNearestNPCRef = useRef<((position: Vector3) => string | null) | null>(null);

  // 씬 준비 완료 핸들러
  const handleSceneReady = useCallback((manager: SceneManager) => {
    console.log("[MonitoringPage] Scene ready");
    setSceneManager(manager);
  }, []);

  // NPC 참조 준비 핸들러 (의존성 배열 비움 - 안정적인 콜백)
  const handleNPCRefsReady = useCallback(
    (npcRefs: Map<string, NPCRef>, findNearestNPC: (position: Vector3) => string | null) => {
      npcRefsRef.current = npcRefs;
      findNearestNPCRef.current = findNearestNPC;
      console.log("[MonitoringPage] NPC refs ready:", npcRefs.size);
    },
    [] // 의존성 배열 비움 - ref 업데이트만 하므로 안정적
  );

  // MultiViewRenderer 초기화
  useEffect(() => {
    if (!sceneManager) return;

    // MultiViewRenderer 생성
    const multiViewRenderer = new MultiViewRenderer({
      sceneManager,
      defaultResolution: 512,
      maxCamerasPerFrame: 4,
    });
    multiViewRendererRef.current = multiViewRenderer;

    // 기본 CCTV 카메라들 추가
    const defaultConfigs = createDefaultCCTVCameras();
    defaultConfigs.forEach((config) => {
      multiViewRenderer.addCamera(config);
    });
    setCCTVConfigs(defaultConfigs);

    // 전역 스토어에도 설정
    setCCTVList(
      defaultConfigs.map((c) => ({
        id: c.id,
        factoryId: "default",
        name: c.name,
        position: c.position,
        rotation: { x: 0, y: 0, z: 0 },
        fov: c.fov,
        isActive: c.isActive,
        isAccident: c.isAccident ?? false,
      }))
    );

    // 렌더링 시작
    multiViewRenderer.startRendering((views) => {
      setCCTVViews(views);
    });

    console.log("[MonitoringPage] MultiViewRenderer initialized");

    // 클린업
    return () => {
      multiViewRenderer.stopRendering();
      multiViewRenderer.dispose();
      multiViewRendererRef.current = null;
    };
  }, [sceneManager, setCCTVList]);

  // CCTV 선택 핸들러
  const handleSelectCCTV = useCallback((cctvId: string) => {
    setSelectedCCTVId(cctvId);
  }, []);

  // 전체화면 핸들러
  const handleFullscreen = useCallback((cctvId: string) => {
    setFullscreenCCTVId(cctvId);
  }, []);

  // 전체화면 닫기
  const handleCloseFullscreen = useCallback(() => {
    setFullscreenCCTVId(null);
  }, []);

  // CCTV 추가
  const handleAddCCTV = useCallback(
    (config: Omit<CCTVCameraConfig, "id">) => {
      if (!multiViewRendererRef.current) return;

      const newId = `cctv-${Date.now()}`;
      const newConfig: CCTVCameraConfig = {
        ...config,
        id: newId,
      };

      multiViewRendererRef.current.addCamera(newConfig);
      setCCTVConfigs((prev) => [...prev, newConfig]);

      console.log("[MonitoringPage] CCTV added:", newId);
    },
    []
  );

  // CCTV 삭제
  const handleRemoveCCTV = useCallback((id: string) => {
    if (!multiViewRendererRef.current) return;

    multiViewRendererRef.current.removeCamera(id);
    setCCTVConfigs((prev) => prev.filter((c) => c.id !== id));

    // 선택/전체화면 상태 초기화
    setSelectedCCTVId((prev) => (prev === id ? undefined : prev));
    setFullscreenCCTVId((prev) => (prev === id ? null : prev));

    console.log("[MonitoringPage] CCTV removed:", id);
  }, []);

  // CCTV 업데이트
  const handleUpdateCCTV = useCallback(
    (id: string, updates: Partial<CCTVCameraConfig>) => {
      if (!multiViewRendererRef.current) return;

      multiViewRendererRef.current.updateCamera(id, updates);
      setCCTVConfigs((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    },
    []
  );

  // 헬퍼 토글
  const handleToggleHelpers = useCallback((visible: boolean) => {
    setShowHelpers(visible);
    multiViewRendererRef.current?.setAllHelpersVisible(visible);
  }, []);

  // 테스트용 사고 시뮬레이션 (로컬 - Backend 없이)
  const handleSimulateAccident = useCallback(async () => {
    if (cctvConfigs.length === 0) {
      toast.error("CCTV 설정이 없습니다");
      return;
    }

    // 랜덤 CCTV 선택
    const randomIndex = Math.floor(Math.random() * cctvConfigs.length);
    const targetCCTV = cctvConfigs[randomIndex];

    // 랜덤 사고 데이터 생성
    const randomData = generateRandomIncident(cctvConfigs);
    
    // CCTV 위치 근처에 사고 발생
    const incidentPosition = {
      x: targetCCTV.position.x + (Math.random() * 10 - 5),
      y: Math.max(0, targetCCTV.position.y + (Math.random() * 2 - 1)),
      z: targetCCTV.position.z + (Math.random() * 10 - 5),
    };

    try {
      // Backend API 호출하여 사고 생성
      const response = await createIncidentMutation.mutateAsync({
        factory_id: defaultFactoryId,
        type: randomData.type,
        severity: randomData.severity,
        position_x: incidentPosition.x,
        position_y: incidentPosition.y,
        position_z: incidentPosition.z,
        description: randomData.description,
      });

      // 사고 상태 설정
      handleUpdateCCTV(targetCCTV.id, { isAccident: true });
      setAccidentFlag(targetCCTV.id, true);

      console.log(
        `[MonitoringPage] 사고 발생 (Backend 연동):`,
        targetCCTV.name,
        response
      );

      // 토스트 알림
      toast.error(`사고 발생: ${targetCCTV.name}`, {
        description: `유형: ${randomData.type}, 심각도: ${randomData.severity}`,
      });
    } catch (error) {
      console.error("[MonitoringPage] 사고 생성 실패:", error);
      
      // API 실패 시에도 로컬 시뮬레이션으로 폴백
      handleUpdateCCTV(targetCCTV.id, { isAccident: true });
      setAccidentFlag(targetCCTV.id, true);

      toast.warning(`사고 시뮬레이션 (로컬): ${targetCCTV.name}`, {
        description: "Backend 연결 실패, 로컬 시뮬레이션만 실행",
      });
    }
  }, [cctvConfigs, handleUpdateCCTV, setAccidentFlag, createIncidentMutation, defaultFactoryId]);

  // 사고 트리거 핸들러 (Backend API 연동)
  const handleIncidentTrigger = useCallback(
    async (data: {
      type: IncidentType;
      severity: number;
      position: Vector3;
      description?: string;
    }) => {
      // 가장 가까운 NPC 찾기 및 부상 상태로 변경
      let npcId: string | null = null;
      if (findNearestNPCRef.current && npcRefsRef.current.size > 0) {
        npcId = findNearestNPCRef.current(data.position);
        if (npcId) {
          const npcRef = npcRefsRef.current.get(npcId);
          if (npcRef) {
            // NPC를 부상 상태로 변경
            npcRef.setState("injured" as NPCState);
            console.log(`[MonitoringPage] NPC ${npcId} 부상 상태로 변경`);
          }
        }
      }

      try {
        // 실제 존재하는 Factory ID 사용
        const factoryId = defaultFactoryId;

        await createIncidentMutation.mutateAsync({
          factory_id: factoryId,
          type: data.type,
          severity: data.severity,
          position_x: data.position.x,
          position_y: data.position.y,
          position_z: data.position.z,
          description: data.description,
          npc_id: npcId || undefined, // NPC ID 포함
        });

        toast.error("사고가 트리거되었습니다!", {
          description: `유형: ${data.type}, 심각도: ${data.severity}${npcId ? `, NPC: ${npcId}` : ""}`,
        });
      } catch (error) {
        console.error("[MonitoringPage] 사고 트리거 실패:", error);

        // API 실패 시 로컬 시뮬레이션으로 폴백
        // 위치 기반으로 가장 가까운 CCTV 찾기
        const nearestCCTV = findNearestCCTV(data.position, cctvConfigs);
        if (nearestCCTV) {
          handleUpdateCCTV(nearestCCTV.id, { isAccident: true });
          setAccidentFlag(nearestCCTV.id, true);

          toast.warning("사고 시뮬레이션 (로컬)", {
            description: `Backend 연결 실패, ${nearestCCTV.name}에서 로컬 시뮬레이션`,
          });
        }
      }
    },
    [createIncidentMutation, cctvConfigs, handleUpdateCCTV, setAccidentFlag, defaultFactoryId]
  );

  // 가장 가까운 CCTV 찾기 유틸리티
  const findNearestCCTV = (position: Vector3, configs: CCTVCameraConfig[]) => {
    if (configs.length === 0) return null;

    let nearest = configs[0];
    let minDistance = Infinity;

    for (const config of configs) {
      const dx = config.position.x - position.x;
      const dy = config.position.y - position.y;
      const dz = config.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = config;
      }
    }

    return nearest;
  };

  // 전체화면 CCTV 뷰 데이터
  // 그리드와 동일하게 cctvViews에서 직접 찾기
  const fullscreenViewData = fullscreenCCTVId
    ? cctvViews.find((v) => v.id === fullscreenCCTVId)
    : undefined;
  const fullscreenCCTVInfo = fullscreenCCTVId
    ? cctvConfigs.find((c) => c.id === fullscreenCCTVId)
    : undefined;

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CCTV 모니터링</h1>
          <p className="text-muted-foreground">
            실시간 CCTV 피드를 모니터링합니다
          </p>
        </div>

        {/* 컨트롤 버튼들 */}
        <div className="flex items-center gap-4">
          {/* 헬퍼 토글 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">카메라 헬퍼</span>
            <Switch checked={showHelpers} onCheckedChange={handleToggleHelpers} />
          </div>

          {/* 설정 패널 토글 */}
          <Button
            variant={showSettings ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowSettings(!showSettings);
              if (!showSettings) setShowIncidentPanel(false);
            }}
          >
            ⚙️ 설정
          </Button>

          {/* 사고 트리거 패널 토글 */}
          <Button
            variant={showIncidentPanel ? "destructive" : "outline"}
            size="sm"
            onClick={() => {
              setShowIncidentPanel(!showIncidentPanel);
              if (!showIncidentPanel) setShowSettings(false);
            }}
          >
            ⚠️ 사고 트리거
          </Button>

          {/* 사고 시뮬레이션 (테스트용 - 로컬) */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateAccident}
            title="로컬 시뮬레이션 (Backend 없이)"
          >
            🎲 로컬 테스트
          </Button>
        </div>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex gap-6">
        {/* 3D 씬 (화면 구석에 작게 표시 - CCTV 렌더링용) */}
        <div 
          className="fixed z-50 overflow-hidden rounded border border-border/50 shadow-lg"
          style={{ 
            right: '8px', 
            bottom: '8px',
            width: '120px',
            height: '90px',
          }}
        >
          <div style={{ width: '512px', height: '384px', transform: 'scale(0.234)', transformOrigin: 'top left' }}>
            <FactoryScene debug={false} onSceneReady={handleSceneReady} />
          </div>
        </div>

        {/* CCTV 그리드 */}
        <div className={showSettings ? "flex-1" : "w-full"}>
          <CCTVGridView
            views={cctvViews}
            layout={gridLayout}
            onLayoutChange={setGridLayout}
            onSelectCCTV={handleSelectCCTV}
            onFullscreen={handleFullscreen}
            selectedCCTVId={selectedCCTVId}
            showHeader={true}
          />
        </div>

        {/* 설정 패널 */}
        {showSettings && (
          <div className="w-80 shrink-0">
            <CCTVSettingsPanel
              cctvList={cctvConfigs}
              selectedCCTVId={selectedCCTVId}
              onSelectCCTV={handleSelectCCTV}
              onAddCCTV={handleAddCCTV}
              onRemoveCCTV={handleRemoveCCTV}
              onUpdateCCTV={handleUpdateCCTV}
            />
          </div>
        )}

        {/* 사고 트리거 패널 */}
        {showIncidentPanel && (
          <div className="w-80 shrink-0 space-y-4">
            <RandomIncidentTest
              factoryId={defaultFactoryId}
              cctvConfigs={cctvConfigs}
              npcRefs={npcRefsRef.current}
              findNearestNPC={findNearestNPCRef.current || undefined}
              onIncidentCreated={(incidentId) => {
                console.log("[MonitoringPage] 랜덤 사고 생성됨:", incidentId);
              }}
            />
            <IncidentTriggerPanel
              factoryId="default"
              onTrigger={handleIncidentTrigger}
              isLoading={createIncidentMutation.isPending}
            />
          </div>
        )}
      </div>

      {/* 전체화면 모달 */}
      <CCTVFullscreen
        isOpen={fullscreenCCTVId !== null}
        onClose={handleCloseFullscreen}
        viewData={fullscreenViewData}
        cctvInfo={
          fullscreenCCTVInfo
            ? {
                id: fullscreenCCTVInfo.id,
                name: fullscreenCCTVInfo.name,
                position: fullscreenCCTVInfo.position,
                fov: fullscreenCCTVInfo.fov,
              }
            : undefined
        }
      />
    </div>
  );
}
