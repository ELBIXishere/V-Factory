"use client";

/**
 * CCTV 개별 뷰 페이지
 * /monitoring/[cctvId] - 동적 라우트로 CCTV 개별 뷰 표시
 */

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { FactoryScene } from "@/components/three";
import type { NPCRef } from "@/components/three/FactoryScene";
import { CCTVView } from "@/components/cctv";
import {
  SceneManager,
  MultiViewRenderer,
  createDefaultCCTVCameras,
  type CCTVViewData,
  type CCTVCameraConfig,
} from "@/lib/three";
import { useCCTVStore, useSceneStore } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CCTVDetailPage() {
  const router = useRouter();
  const params = useParams();
  const cctvId = params?.cctvId as string;

  // 전역 씬 매니저 가져오기
  const globalSceneManager = useSceneStore((state) => state.sceneManager);
  const isInitialized = useSceneStore((state) => state.isInitialized);

  // 로컬 SceneManager 상태
  const [localSceneManager, setLocalSceneManager] = useState<SceneManager | null>(null);
  const sceneManager = globalSceneManager || localSceneManager;

  // MultiViewRenderer 참조
  const multiViewRendererRef = useRef<MultiViewRenderer | null>(null);

  // CCTV 뷰 데이터 - 스토어에서 가져오기
  const cctvViews = useCCTVStore((state) => state.cctvViews);
  const getCCTVView = useCCTVStore((state) => state.getCCTVView);

  // CCTV 설정 목록
  const [cctvConfigs, setCCTVConfigs] = useState<CCTVCameraConfig[]>([]);

  // NPC 참조 관리
  const npcRefsRef = useRef<Map<string, NPCRef>>(new Map());

  // 전역 씬 매니저 준비 감지
  useEffect(() => {
    if (isInitialized && globalSceneManager) {
      console.log("[CCTVDetailPage] 전역 씬 매니저 준비 완료");
      setLocalSceneManager(globalSceneManager);
    }
  }, [isInitialized, globalSceneManager]);

  // 씬 준비 완료 핸들러
  const handleSceneReady = useCallback((manager: SceneManager) => {
    console.log("[CCTVDetailPage] 로컬 씬 준비 완료");
    setLocalSceneManager(manager);
  }, []);

  // MultiViewRenderer 초기화 (항상 실행하여 실시간 업데이트 보장)
  useEffect(() => {
    if (!sceneManager || !cctvId) {
      return;
    }

    // 이미 MultiViewRenderer가 있으면 재사용 (같은 sceneManager일 때)
    if (multiViewRendererRef.current) {
      console.log("[CCTVDetailPage] MultiViewRenderer already exists, reusing");
      return;
    }

    // MultiViewRenderer 생성
    const multiViewRenderer = new MultiViewRenderer({
      sceneManager,
      defaultResolution: 512,
      maxCamerasPerFrame: 4,
    });
    multiViewRendererRef.current = multiViewRenderer;

    // 기본 CCTV 카메라들 추가 (스토어에 이미 설정이 있으면 재사용)
    const defaultConfigs = createDefaultCCTVCameras();
    defaultConfigs.forEach((config) => {
      multiViewRenderer.addCamera(config);
    });
    setCCTVConfigs(defaultConfigs);

    // 전역 스토어에도 설정 (아직 없을 때만)
    const currentList = useCCTVStore.getState().cctvList;
    if (currentList.length === 0) {
      useCCTVStore.getState().setCCTVList(
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
    }

    // 렌더링 시작하여 스토어에 데이터 저장 (실시간 업데이트)
    multiViewRenderer.startRendering((views) => {
      useCCTVStore.getState().setCCTVViews(views);
    });

    console.log("[CCTVDetailPage] MultiViewRenderer initialized and started");

    // 클린업
    return () => {
      if (multiViewRendererRef.current) {
        console.log("[CCTVDetailPage] Cleaning up MultiViewRenderer");
        multiViewRendererRef.current.stopRendering();
        multiViewRendererRef.current.dispose();
        multiViewRendererRef.current = null;
      }
    };
  }, [sceneManager, cctvId]);

  // CCTV 뷰 데이터 가져오기
  const viewData = cctvId ? getCCTVView(cctvId) : undefined;

  // CCTV 설정 정보 가져오기
  const cctvConfig = cctvConfigs.find((c) => c.id === cctvId) || 
    createDefaultCCTVCameras().find((c) => c.id === cctvId);

  // 뒤로가기 핸들러
  const handleBack = useCallback(() => {
    router.push("/monitoring");
  }, [router]);

  // 스크린샷 저장 핸들러
  const handleSaveScreenshot = useCallback(() => {
    // CCTVView 컴포넌트에서 내부적으로 처리하도록 할 수도 있음
    // 또는 여기서 canvas를 가져와서 처리
    toast.info("스크린샷 저장 기능은 CCTVView 컴포넌트에서 처리됩니다");
  }, []);

  // CCTV ID가 없으면 에러 페이지로 리다이렉트
  useEffect(() => {
    if (!cctvId) {
      router.push("/monitoring");
    }
  }, [cctvId, router]);

  // CCTV가 존재하지 않으면 에러
  if (!cctvId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">CCTV ID가 지정되지 않았습니다</p>
          <Button onClick={handleBack} className="mt-4">
            모니터링 페이지로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* 3D 씬 (화면 구석에 작게 표시 - CCTV 렌더링용) */}
      <div
        className="fixed z-50 overflow-hidden rounded border border-border/50 shadow-lg"
        style={{
          right: "8px",
          bottom: "8px",
          width: "120px",
          height: "90px",
        }}
      >
        <div
          style={{
            width: "512px",
            height: "384px",
            transform: "scale(0.234)",
            transformOrigin: "top left",
          }}
        >
          <FactoryScene
            debug={false}
            useGlobalScene={true}
            onSceneReady={handleSceneReady}
          />
        </div>
      </div>

      {/* CCTV 개별 뷰 */}
      <div className="flex-1 overflow-auto p-6">
        <CCTVView
          viewData={viewData}
          cctvInfo={
            cctvConfig
              ? {
                  id: cctvConfig.id,
                  name: cctvConfig.name,
                  position: cctvConfig.position,
                  fov: cctvConfig.fov,
                }
              : undefined
          }
          onBack={handleBack}
          onSaveScreenshot={handleSaveScreenshot}
          fullscreen={true}
        />
      </div>
    </div>
  );
}
