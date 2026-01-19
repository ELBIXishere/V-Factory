/**
 * CCTV 카메라 클래스
 * 가상 CCTV 카메라 시스템 - 위치, 방향, FOV 관리 및 씬 내 시각화
 */

import * as THREE from "three";

/**
 * CCTV 카메라 설정 인터페이스
 */
export interface CCTVCameraConfig {
  // 고유 ID
  id: string;
  // 카메라 이름 (표시용)
  name: string;
  // 3D 위치
  position: { x: number; y: number; z: number };
  // 카메라가 바라보는 방향 (타겟 좌표)
  target: { x: number; y: number; z: number };
  // 화각 (Field of View, 도 단위)
  fov: number;
  // 활성화 상태
  isActive: boolean;
  // 사고 감지 플래그
  isAccident?: boolean;
  // 렌더 타겟 해상도
  resolution?: number;
}

/**
 * CCTV 카메라 클래스
 * Three.js PerspectiveCamera를 래핑하여 CCTV 기능 제공
 */
export class CCTVCamera {
  // 카메라 설정
  readonly id: string;
  readonly name: string;

  // Three.js 카메라
  private camera: THREE.PerspectiveCamera;

  // 카메라 헬퍼 (씬 내 시각화)
  private helperGroup: THREE.Group;
  private coneHelper: THREE.Mesh;
  private bodyHelper: THREE.Mesh;

  // 상태
  private _isActive: boolean;
  private _isAccident: boolean;
  private _fov: number;
  private _resolution: number;

  // 타겟 위치
  private targetPosition: THREE.Vector3;

  constructor(config: CCTVCameraConfig) {
    this.id = config.id;
    this.name = config.name;
    this._isActive = config.isActive;
    this._isAccident = config.isAccident ?? false;
    this._fov = config.fov;
    this._resolution = config.resolution ?? 512;

    // 타겟 위치 설정
    this.targetPosition = new THREE.Vector3(
      config.target.x,
      config.target.y,
      config.target.z
    );

    // Three.js 카메라 생성
    this.camera = new THREE.PerspectiveCamera(
      this._fov,
      1, // aspect ratio (정사각형 렌더 타겟)
      0.1,
      100
    );

    // 카메라 위치 설정
    this.camera.position.set(
      config.position.x,
      config.position.y,
      config.position.z
    );

    // 타겟을 바라보도록 설정
    this.camera.lookAt(this.targetPosition);

    // 헬퍼 그룹 생성
    this.helperGroup = new THREE.Group();
    this.helperGroup.name = `cctv-helper-${this.id}`;

    // 카메라 본체 헬퍼 (박스 형태)
    const bodyGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.4);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this._isAccident ? 0xe94560 : 0x333333,
      roughness: 0.5,
      metalness: 0.7,
    });
    this.bodyHelper = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyHelper.castShadow = true;

    // 시야각 콘 헬퍼 (카메라 FOV 시각화)
    const coneLength = 2;
    const coneRadius = Math.tan((this._fov * Math.PI) / 360) * coneLength;
    const coneGeometry = new THREE.ConeGeometry(coneRadius, coneLength, 16, 1, true);
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: this._isAccident ? 0xe94560 : 0x00d9ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      wireframe: false,
    });
    this.coneHelper = new THREE.Mesh(coneGeometry, coneMaterial);

    // 콘을 앞쪽으로 향하도록 회전
    this.coneHelper.rotation.x = Math.PI / 2;
    this.coneHelper.position.z = -coneLength / 2;

    // 헬퍼 그룹에 추가
    this.helperGroup.add(this.bodyHelper);
    this.helperGroup.add(this.coneHelper);

    // 헬퍼 그룹 위치 및 방향 설정
    this.updateHelperTransform();
  }

  /**
   * 헬퍼의 위치와 방향을 카메라에 맞게 업데이트
   */
  private updateHelperTransform(): void {
    // 헬퍼 위치를 카메라 위치로 설정
    this.helperGroup.position.copy(this.camera.position);

    // 헬퍼가 타겟을 바라보도록 설정
    this.helperGroup.lookAt(this.targetPosition);
  }

  /**
   * Three.js 카메라 객체 반환
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * 헬퍼 그룹 반환 (씬에 추가용)
   */
  getHelper(): THREE.Group {
    return this.helperGroup;
  }

  /**
   * 카메라 위치 설정
   */
  setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.targetPosition);
    this.updateHelperTransform();
  }

  /**
   * 카메라 타겟 설정
   */
  setTarget(x: number, y: number, z: number): void {
    this.targetPosition.set(x, y, z);
    this.camera.lookAt(this.targetPosition);
    this.updateHelperTransform();
  }

  /**
   * FOV 설정
   */
  setFOV(fov: number): void {
    this._fov = fov;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();

    // 콘 헬퍼 업데이트
    const coneLength = 2;
    const coneRadius = Math.tan((fov * Math.PI) / 360) * coneLength;

    this.coneHelper.geometry.dispose();
    this.coneHelper.geometry = new THREE.ConeGeometry(coneRadius, coneLength, 16, 1, true);
  }

  /**
   * 활성화 상태 설정
   */
  setActive(isActive: boolean): void {
    this._isActive = isActive;
    this.helperGroup.visible = isActive;
  }

  /**
   * 사고 상태 설정
   */
  setAccident(isAccident: boolean): void {
    this._isAccident = isAccident;

    // 색상 업데이트
    const bodyMaterial = this.bodyHelper.material as THREE.MeshStandardMaterial;
    const coneMaterial = this.coneHelper.material as THREE.MeshBasicMaterial;

    if (isAccident) {
      bodyMaterial.color.setHex(0xe94560);
      coneMaterial.color.setHex(0xe94560);
      coneMaterial.opacity = 0.4;
    } else {
      bodyMaterial.color.setHex(0x333333);
      coneMaterial.color.setHex(0x00d9ff);
      coneMaterial.opacity = 0.2;
    }
  }

  /**
   * 헬퍼 가시성 설정
   */
  setHelperVisible(visible: boolean): void {
    this.helperGroup.visible = visible;
  }

  /**
   * 현재 설정 반환
   */
  getConfig(): CCTVCameraConfig {
    return {
      id: this.id,
      name: this.name,
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
      target: {
        x: this.targetPosition.x,
        y: this.targetPosition.y,
        z: this.targetPosition.z,
      },
      fov: this._fov,
      isActive: this._isActive,
      isAccident: this._isAccident,
      resolution: this._resolution,
    };
  }

  /**
   * 활성화 상태
   */
  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * 사고 상태
   */
  get isAccident(): boolean {
    return this._isAccident;
  }

  /**
   * 화각
   */
  get fov(): number {
    return this._fov;
  }

  /**
   * 렌더 타겟 해상도
   */
  get resolution(): number {
    return this._resolution;
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    // 헬퍼 지오메트리 및 머티리얼 정리
    this.bodyHelper.geometry.dispose();
    (this.bodyHelper.material as THREE.Material).dispose();

    this.coneHelper.geometry.dispose();
    (this.coneHelper.material as THREE.Material).dispose();
  }
}

/**
 * 기본 CCTV 카메라 프리셋 생성
 * 공장 씬의 주요 위치에 4대의 CCTV 배치
 */
export function createDefaultCCTVCameras(): CCTVCameraConfig[] {
  return [
    {
      id: "cctv-01",
      name: "CAM-01 입구",
      position: { x: -10, y: 6, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      fov: 60,
      isActive: true,
      isAccident: false,
      resolution: 512,
    },
    {
      id: "cctv-02",
      name: "CAM-02 컨베이어 A",
      position: { x: -6, y: 6, z: -4 },
      target: { x: -4, y: 0, z: -6 },
      fov: 65,
      isActive: true,
      isAccident: false,
      resolution: 512,
    },
    {
      id: "cctv-03",
      name: "CAM-03 컨베이어 B",
      position: { x: 6, y: 6, z: 2 },
      target: { x: 2, y: 0, z: -2 },
      fov: 65,
      isActive: true,
      isAccident: false,
      resolution: 512,
    },
    {
      id: "cctv-04",
      name: "CAM-04 출하 구역",
      position: { x: 10, y: 6, z: 10 },
      target: { x: 0, y: 0, z: 0 },
      fov: 60,
      isActive: true,
      isAccident: false,
      resolution: 512,
    },
  ];
}

export default CCTVCamera;
