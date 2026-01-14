/**
 * Three.js 컴포넌트 모듈 진입점
 */

// WebGPU 캔버스
export { WebGPUCanvas, type WebGPUCanvasProps } from "./WebGPUCanvas";

// 공장 씬
export { FactoryScene, type FactorySceneProps } from "./FactoryScene";

// 공장 뷰어 (대시보드용)
export { FactoryViewer, type FactoryViewerProps } from "./FactoryViewer";

// 컨베이어 벨트
export {
  ConveyorBelt,
  useConveyorBelt,
  type ConveyorBeltConfig,
  type ConveyorBeltProps,
  type BoxItem,
} from "./ConveyorBelt";

// Worker NPC
export {
  WorkerNPC,
  useWorkerNPC,
  type WorkerNPCConfig,
  type WorkerNPCProps,
  type NPCState,
  type Waypoint,
} from "./WorkerNPC";
