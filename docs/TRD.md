# [TRD] V-Factory: 시스템 설계 및 기술 명세서

**버전:** 1.0.0

**기술 스택:** Next.js (App Router), WebGPU (WGSL), FastAPI, ShadCN, TailwindCSS, Redis, PostgreSQL

> 이 문서는 PRD의 비즈니스 로직을 기술적으로 구체화하며, 특히 **WebGPU 파이프라인 최적화**와 **MSA 기반 서비스 설계**에 중점을 둡니다.

---

## 1. 시스템 아키텍처 (System Architecture)

전체 시스템은 확장성과 실시간성 확보를 위해 **MSA(Micro Service Architecture)** 구조로 설계됩니다.

### 1.1 서비스 분리 및 통신 방식

1. **Simulation Gateway (Next.js):** 클라이언트 엔트리 포인트. WebGPU 렌더링 엔진 포함.
2. **Factory Core Service (FastAPI):** 공장 설비(컨베이어, 장비) 배치 및 상태 관리.
3. **Incident Event Service (FastAPI):** 사고 트리거 및 실시간 알림 전송 (Redis Pub/Sub 활용).
4. **Asset Management Service (FastAPI):** 3D 에셋(GLB/GLTF) 메타데이터 및 텍스처 관리.

---

## 2. 프론트엔드 기술 명세 (Frontend Specifications)

### 2.1 WebGPU 렌더링 파이프라인

#### Multi-View Implementation
* 각 CCTV 뷰를 별도의 `GPUTexture`로 렌더링.
* 메인 캔버스 렌더링 루프 내에서 `passEncoder`를 순차적으로 호출하여 여러 Viewport를 단일 프레임에 출력.

#### Compute Shader (Conveyor Logic)
* 컨베이어 벨트 위의 물체 위치 연산을 CPU가 아닌 Compute Shader에서 수행.
* 공식: `newPosition = oldPosition + velocity * deltaTime`
* `Storage Buffer`를 통해 수천 개의 부품 위치를 GPU 메모리 내에서 직접 업데이트.

### 2.2 사고 시각 효과 (VFX) 구현

#### Post-Processing Shader
사고 발생 시 해당 CCTV 텍스처에만 `Fragment Shader` 필터 적용.

#### Glitch Effect
* `sin()` 함수와 `time` 파라미터를 조합하여 UV 좌표를 의도적으로 왜곡.

#### Red Overlay
* 최종 출력 색상에 `vec4(0.3, 0.0, 0.0, 0.5)` 값을 가산(Additive Blending).

#### Outline Rendering
* 사고 대상 NPC의 메쉬를 두 번 렌더링(Backface Culling 역이용)하거나, Sobel Filter를 이용한 외곽선 추출 방식 채택.

---

## 3. 백엔드 기술 명세 (Backend Specifications)

### 3.1 FastAPI 기반 MSA 엔진

* **Asynchronous Processing:** 모든 API는 `async def`를 통해 비동기로 처리하여 시뮬레이션 데이터 폭주 시에도 낮은 대기 시간 유지.
* **Real-time Event Bridge:** Redis를 메시지 브로커로 사용하여, 사고 발생 시 `Event Service` -> `Simulation Client`로 **Server-Sent Events(SSE)**를 통해 즉각 통보.

### 3.2 데이터베이스 스키마 (PostgreSQL)

| Table | Column | Type | Description |
| --- | --- | --- | --- |
| **factories** | id, name, layout_json | UUID, String, JSONB | 공장 설비 배치 정보 |
| **incidents** | id, factory_id, timestamp, type, severity | UUID, UUID, DateTime, Enum, Int | 사고 발생 기록 |
| **cctv_configs** | id, factory_id, position, fov, name | UUID, UUID, Vector3, Float, String | CCTV 위치 및 화각 설정 |

---

## 4. 핵심 알고리즘 및 로직 (Key Algorithms)

### 4.1 사고 감지 및 전파 로직

1. **Trigger:** 사용자 조작 혹은 시나리오 스크립트에 의해 `Incident Service`로 POST 요청 발생.
2. **Validation:** 해당 위치와 가장 가까운 `cctv_id`를 공간 인덱스(R-Tree)를 통해 조회.
3. **Broadcast:** Redis 채널로 사고 데이터 발행.
4. **Client Reaction:** 클라이언트는 해당 `cctv_id`의 렌더링 파이프라인에 `is_accident` 플래그를 `true`로 설정하여 셰이더 이펙트 활성화.

---

## 5. 인프라 및 빌드 전략 (Infrastructure)

* **Containerization:** 모든 마이크로서비스는 Docker 컨테이너화.
* **Orchestration:** Kubernetes를 통한 서비스 오케스트레이션 및 오토스케일링.
* **Frontend Deployment:** Next.js 최적화를 위해 Vercel 혹은 로컬 서버의 하드웨어 가속 성능을 활용한 빌드 환경 구성.

---

## 6. MVP 이후 고도화 로드맵 (Post-MVP)

1. **WebGPU Ray Tracing:** 공장 내 반사 광원(바닥 타일, 금속 설비)의 실사감을 높이기 위한 레이트레이싱 파이프라인 추가.
2. **Data Playback:** 기록된 `incident_logs`를 기반으로 특정 시점의 시뮬레이션을 재현하는 타임라인 UI 구현.
