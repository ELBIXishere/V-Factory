# V-Factory 프로젝트 내부 보고서

**작성일:** 2026-01-15  
**버전:** 1.0.0  
**작성자:** 개발팀

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [핵심 기능](#2-핵심-기능)
3. [기술 특징 및 차별화 요소](#3-기술-특징-및-차별화-요소)
4. [시스템 아키텍처](#4-시스템-아키텍처)
5. [구현 방식 상세](#5-구현-방식-상세)
6. [배포 방법](#6-배포-방법)
7. [성능 및 최적화](#7-성능-및-최적화)
8. [향후 계획](#8-향후-계획)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 목적

**V-Factory**는 WebGPU 기반 3D 렌더링 기술을 활용한 가상 공장 안전 모니터링 시뮬레이터입니다. 실제 공장 환경을 가상화하여 안전 사고 시나리오를 시각화하고, 다수의 CCTV 멀티뷰 시스템을 통해 실시간 모니터링 경험을 제공합니다.

### 1.2 핵심 가치

- **실시간 가시성 확보**: WebGPU를 이용해 수십 개의 CCTV 피드를 지연 없이 한 화면에서 렌더링
- **위험 인지 극대화**: 사고 발생 시 강렬한 시각적 이펙트를 통해 관리자의 인지 속도 향상
- **안전 교육 데이터화**: 실제 사고 없이도 가상 환경에서 다양한 사고 시나리오 생성 및 데이터화

### 1.3 주요 사용자

- **공장 안전 관리자**: 대시보드에서 2x2 또는 3x3 CCTV 멀티뷰를 통해 공장 전체 모니터링
- **사고 대응 요원**: 특정 구역에서 사고 발생 시 즉시 붉은색 글리치 이펙트가 발생하는 CCTV 뷰를 통해 상세 상황 파악
- **시스템 시뮬레이션 설계자**: 컨베이어 벨트 속도와 근로자(NPC) 동선을 조정하며 사고 발생 확률이 높은 사각지대 검증

---

## 2. 핵심 기능

### 2.1 가상 공장 환경

#### 2.1.1 컨베이어 벨트 시스템
- **물리 기반 구동**: 애니메이션 루프가 아닌 WebGPU Compute Shader를 이용한 물리 기반 컨베이어 벨트 구동
- **실시간 상자 이동**: 수천 개의 부품이 이동해도 프레임 드랍 없는 고성능 렌더링
- **위치 연산 공식**: `newPosition = oldPosition + velocity * deltaTime`

#### 2.1.2 Worker NPC 시스템
- **다수 캐릭터 동시 처리**: 공장 내부를 이동하며 정해진 업무를 수행하는 다수의 캐릭터
- **상태 관리**: working, idle, injured 상태 전환
- **애니메이션 시스템**: 걷기, 서기 등 자연스러운 애니메이션 믹서

#### 2.1.3 Static CCTV 배치
- **고정식 CCTV**: 공장 주요 지점에 고정식 CCTV 배치 (PTZ 기능 제거, 광각 렌더링 집중)
- **다중 뷰 렌더링**: 각 CCTV 뷰를 별도의 `GPUTexture`로 렌더링

### 2.2 사고 시뮬레이션 및 이펙트

#### 2.2.1 사고 트리거 시스템
- **수동/자동 트리거**: 확률적 또는 수동으로 사고(NPC 쓰러짐, 장비 충돌) 발생
- **사고 유형**: 끼임, 전도, 충돌 등 다양한 사고 유형 지원
- **심각도 설정**: 1-5단계 심각도 레벨 설정

#### 2.2.2 CCTV Alert Effect
- **Red Overlay**: 최종 출력 색상에 `vec4(0.3, 0.0, 0.0, 0.5)` 값을 가산(Additive Blending)
- **Glitch Effect**: `sin()` 함수와 `time` 파라미터를 조합하여 UV 좌표를 의도적으로 왜곡
- **Scanline Effect**: 수평 스캔라인 효과로 긴급 상황 강조

#### 2.2.3 Victim Highlight
- **Red Outlining**: 사고 대상 NPC 캐릭터에 빨간색 외곽선 적용
- **Pulse Effect**: 크기 진동 효과로 즉시 식별 가능하게 구현
- **Outline Rendering**: Backface Culling 역이용 또는 Sobel Filter 활용

### 2.3 UI/UX (Multi-View Dashboard)

#### 2.3.1 Grid View
- **가변 그리드 시스템**: ShadCN 기반의 2x2, 3x3, 4x4 그리드 레이아웃 지원
- **멀티 피드 지원**: 최대 960x540 해상도의 멀티 피드 지원
- **실시간 업데이트**: 각 CCTV 피드의 실시간 타임스탬프 표시

#### 2.3.2 Incident Log
- **실시간 리스트**: 사고 발생 시점, 위치, 관련 CCTV 번호를 실시간 리스트로 출력
- **필터링/검색**: 사고 기록 필터링 및 검색 기능
- **상세 정보 모달**: 사고 상세 정보 및 관련 CCTV 바로가기

---

## 3. 기술 특징 및 차별화 요소

### 3.1 WebGPU 기반 고성능 렌더링

#### 3.1.1 WebGPU의 장점
- **GPU 직접 접근**: WebGL 대비 더 낮은 레벨의 GPU 제어 가능
- **병렬 처리**: Compute Shader를 통한 대량 데이터 병렬 처리
- **메모리 효율성**: Storage Buffer를 통한 GPU 메모리 내 직접 업데이트

#### 3.1.2 멀티뷰 렌더링 최적화
- **독립적인 Render Pass**: 각 CCTV 뷰마다 독립적인 `render pass` 생성
- **CommandEncoder 활용**: WebGPU의 `CommandEncoder`를 효율적으로 사용하여 Draw Call 최적화
- **단일 프레임 출력**: 메인 캔버스에서 `passEncoder`를 순차 호출하여 단일 프레임에 출력

### 3.2 MSA (Micro Service Architecture) 기반 설계

#### 3.2.1 서비스 분리
- **Simulation Gateway (Next.js)**: 클라이언트 엔트리 포인트, WebGPU 렌더링 엔진
- **Factory Core Service (FastAPI)**: 공장 설비 배치 및 상태 관리
- **Incident Event Service (FastAPI)**: 사고 트리거 및 실시간 알림 전송
- **Asset Management Service (FastAPI)**: 3D 에셋 메타데이터 및 텍스처 관리

#### 3.2.2 서비스 간 통신
- **REST API**: 동기적 데이터 요청
- **Redis Pub/Sub**: 실시간 이벤트 전파
- **SSE (Server-Sent Events)**: 클라이언트로의 실시간 푸시

### 3.3 실시간 이벤트 처리

#### 3.3.1 사고 감지 및 전파 흐름
1. **Trigger**: 사용자 조작 또는 시나리오 스크립트로 Incident Service에 POST 요청
2. **Validation**: R-Tree 공간 인덱스로 가장 가까운 CCTV 조회
3. **Broadcast**: Redis 채널로 사고 데이터 발행
4. **Client Reaction**: 해당 CCTV의 `is_accident` 플래그 활성화 → 셰이더 이펙트 적용

#### 3.3.2 비동기 처리
- **FastAPI async/await**: 모든 API는 `async def`를 통해 비동기로 처리
- **낮은 대기 시간**: 시뮬레이션 데이터 폭주 시에도 낮은 대기 시간 유지

---

## 4. 시스템 아키텍처

### 4.1 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Side (Browser)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Next.js Dashboard (Frontend)                 │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  WebGPU Simulation Engine (Three.js)         │   │  │
│  │  │  - Multi-View Manager                        │   │  │
│  │  │  - VFX Shader System                         │   │  │
│  │  │  - Compute Shader (Conveyor Belt)            │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/SSE
                            │
┌─────────────────────────────────────────────────────────────┐
│              Micro Services (Backend)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Factory Core │  │   Incident   │  │    Asset     │     │
│  │   Service    │  │    Event     │  │ Management   │     │
│  │   (FastAPI)  │  │   Service    │  │   Service    │     │
│  │              │  │   (FastAPI)  │  │   (FastAPI)  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          │                 │                 │
┌─────────┴─────────────────┴─────────────────┴──────────────┐
│              Infrastructure Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │    Redis    │  │   Docker     │     │
│  │  Database    │  │  Pub/Sub    │  │  Container   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 데이터베이스 스키마

#### 4.2.1 PostgreSQL Tables

| Table | Column | Type | Description |
|-------|--------|------|-------------|
| **factories** | id, name, layout_json | UUID, String, JSONB | 공장 설비 배치 정보 |
| **incidents** | id, factory_id, timestamp, type, severity | UUID, UUID, DateTime, Enum, Int | 사고 발생 기록 |
| **cctv_configs** | id, factory_id, position, fov, name | UUID, UUID, Vector3, Float, String | CCTV 위치 및 화각 설정 |
| **assets** | id, name, file_path, metadata | UUID, String, String, JSONB | 3D 에셋 메타데이터 |

#### 4.2.2 Redis 활용
- **Pub/Sub 채널**: 실시간 이벤트 전파
- **캐시**: 반복 조회 최적화
- **세션 관리**: 클라이언트 세션 상태 관리

---

## 5. 구현 방식 상세

### 5.1 프론트엔드 구현

#### 5.1.1 기술 스택
- **Framework**: Next.js 14 (App Router)
- **3D Engine**: Three.js (WebGPU Renderer)
- **Styling**: ShadCN, TailwindCSS
- **Shader**: WGSL (WebGPU Shading Language)
- **상태 관리**: Zustand

#### 5.1.2 WebGPU 렌더링 파이프라인

**Multi-View Implementation:**
```typescript
// 각 CCTV 뷰를 별도의 GPUTexture로 렌더링
const renderTarget = new THREE.WebGLRenderTarget(width, height);
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

// 메인 캔버스 렌더링 루프 내에서 passEncoder를 순차적으로 호출
renderer.setRenderTarget(renderTarget);
renderer.render(scene, camera);
```

**Compute Shader (Conveyor Logic):**
```wgsl
// WGSL Compute Shader 예시
@group(0) @binding(0) var<storage, read_write> positions: array<vec3<f32>>;
@group(0) @binding(1) var<uniform> velocity: vec3<f32>;
@group(0) @binding(2) var<uniform> deltaTime: f32;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&positions)) {
        return;
    }
    
    // 물리 기반 위치 업데이트
    positions[index] = positions[index] + velocity * deltaTime;
}
```

#### 5.1.3 사고 시각 효과 (VFX) 구현

**Post-Processing Shader:**
```wgsl
// Glitch Effect
fn glitch_effect(uv: vec2<f32>, time: f32) -> vec2<f32> {
    let distortion = sin(time * 10.0) * 0.1;
    return vec2<f32>(uv.x + distortion, uv.y);
}

// Red Overlay
fn red_overlay(color: vec4<f32>) -> vec4<f32> {
    return color + vec4<f32>(0.3, 0.0, 0.0, 0.5);
}
```

**Outline Rendering:**
- Backface Culling 역이용: 사고 대상 NPC의 메쉬를 두 번 렌더링
- Sobel Filter: 외곽선 추출 방식

#### 5.1.4 CCTV 멀티뷰 시스템

**구현 방식:**
1. 각 CCTV별 `WebGLRenderTarget` 생성
2. Off-screen rendering으로 각 카메라 뷰 렌더링
3. 순차 렌더링 (`renderAllViews` 메서드)
4. 프레임당 최대 렌더링 카메라 수 제한 (성능 최적화)

**그리드 뷰 컴포넌트:**
- 2x2, 3x3, 4x4 레이아웃 지원
- CCTV 피드 선택/확대 기능
- 실시간 타임스탬프 표시

### 5.2 백엔드 구현

#### 5.2.1 기술 스택
- **Framework**: FastAPI (Python 3.12)
- **ORM**: SQLAlchemy (비동기)
- **Database**: PostgreSQL
- **Cache/Message Broker**: Redis (Pub/Sub, SSE)

#### 5.2.2 MSA 서비스 구조

**Factory Core Service:**
- 공장 설비 배치 및 상태 관리
- CCTV 설정 관리
- R-Tree 공간 인덱스 구현 (사고 위치 → CCTV 매칭)

**Incident Event Service:**
- 사고 트리거 및 실시간 알림 전송
- Redis Pub/Sub 발행 로직
- SSE 엔드포인트 구현 (`GET /incidents/stream`)

**Asset Management Service:**
- 3D 에셋(GLB/GLTF) 업로드 및 관리
- 메타데이터 관리
- 파일 저장소 연동 (로컬/S3)

#### 5.2.3 비동기 처리

**FastAPI 비동기 엔드포인트:**
```python
@router.post("/incidents")
async def create_incident(incident: IncidentCreate):
    # 비동기 데이터베이스 작업
    db_incident = await incident_service.create(incident)
    
    # Redis Pub/Sub 발행
    await redis_service.publish("incidents", db_incident.dict())
    
    return db_incident
```

**SSE (Server-Sent Events):**
```python
@router.get("/incidents/stream")
async def stream_incidents():
    async def event_generator():
        async for message in redis_service.subscribe("incidents"):
            yield f"data: {message}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

---

## 6. 배포 방법

### 6.1 개발 환경 배포 (Docker Compose)

#### 6.1.1 사전 요구사항
- Docker Desktop 설치 및 실행
- Docker Compose V2 이상

#### 6.1.2 실행 방법

```bash
# 1. 환경 변수 파일 복사
cp env.example .env

# 2. Docker Compose로 전체 서비스 실행
docker compose up --build

# 또는 백그라운드 실행
docker compose up --build -d
```

#### 6.1.3 서비스 접속 URL

| 서비스 | URL | 설명 |
|--------|-----|------|
| Frontend | http://localhost:3100 | Next.js 웹 애플리케이션 |
| Factory Core API | http://localhost:8001/docs | Swagger UI |
| Incident Event API | http://localhost:8002/docs | Swagger UI |
| Asset Management API | http://localhost:8003/docs | Swagger UI |
| PostgreSQL | localhost:5555 | 데이터베이스 |
| Redis | localhost:6379 | 캐시/메시지 브로커 |

#### 6.1.4 Hot Reload 설정
- **Frontend**: 볼륨 마운트로 `frontend/` 디렉토리가 컨테이너와 동기화, 코드 변경 시 자동 Fast Refresh
- **Backend**: `uvicorn --reload` 옵션으로 자동 재시작, Python 파일 변경 시 자동 반영

### 6.2 프로덕션 환경 배포

#### 6.2.1 Docker 이미지 빌드

**방법 1: 빌드 스크립트 사용 (권장)**
```bash
# 모든 서비스 이미지 빌드
chmod +x scripts/build-images.sh
./scripts/build-images.sh v1.0.0
```

**방법 2: Docker Compose 사용**
```bash
# 프로덕션 이미지 빌드
docker compose -f docker-compose.prod.yml build
```

**방법 3: 개별 Dockerfile 사용**
```bash
# Frontend 이미지 빌드
docker build -f docker/prod/frontend.Dockerfile -t v-factory-frontend:latest .

# Backend 이미지 빌드 (서비스별)
docker build -f docker/prod/backend.Dockerfile \
  --build-arg SERVICE_NAME=factory-core \
  -t v-factory-factory-core:latest .
```

#### 6.2.2 Docker Hub 푸시

```bash
# Docker Hub 로그인
docker login

# 푸시 스크립트 사용
export DOCKER_HUB_USERNAME=your-username
chmod +x scripts/push-images.sh
./scripts/push-images.sh v1.0.0
```

### 6.3 Kubernetes 배포

#### 6.3.1 사전 요구사항
- Kubernetes 클러스터 (Minikube, 또는 클라우드 환경)
- kubectl 설치 및 클러스터 접근 설정
- Kubernetes 네임스페이스 권한

#### 6.3.2 배포 순서

**1. Secret 생성**
```bash
# Secret 파일 생성 (템플릿 기반)
cp k8s/secrets.yaml.template k8s/secrets.yaml
# secrets.yaml 파일 편집하여 실제 값 입력
```

**2. 네임스페이스 및 기본 리소스 생성**
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
```

**3. 데이터베이스 배포**
```bash
kubectl apply -f k8s/deployments/postgres-deployment.yaml
kubectl apply -f k8s/deployments/redis-deployment.yaml
kubectl apply -f k8s/services/postgres-service.yaml
kubectl apply -f k8s/services/redis-service.yaml
```

**4. 백엔드 서비스 배포**
```bash
kubectl apply -f k8s/deployments/factory-core-deployment.yaml
kubectl apply -f k8s/deployments/incident-event-deployment.yaml
kubectl apply -f k8s/deployments/asset-management-deployment.yaml
kubectl apply -f k8s/services/backend-services.yaml
```

**5. 프론트엔드 배포**
```bash
kubectl apply -f k8s/deployments/frontend-deployment.yaml
kubectl apply -f k8s/services/frontend-service.yaml
```

**6. Ingress 설정 (선택사항)**
```bash
kubectl apply -f k8s/ingress.yaml
```

#### 6.3.3 배포 스크립트 사용

**Linux/Mac:**
```bash
chmod +x scripts/deploy-k8s.sh
./scripts/deploy-k8s.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\deploy-k8s.ps1
```

#### 6.3.4 리소스 요구사항

**최소 요구사항:**
- 노드: 2개 이상 (고가용성)
- CPU: 4 cores 이상
- 메모리: 8GB 이상
- 스토리지: 65Gi 이상 (PostgreSQL 10Gi + Redis 5Gi + Assets 50Gi)

**권장 사양:**
- 노드: 3개 이상
- CPU: 8 cores 이상
- 메모리: 16GB 이상
- 스토리지: 100Gi 이상

### 6.4 CI/CD 파이프라인

#### 6.4.1 GitHub Actions 설정

**CI 파이프라인 (자동 실행):**
- `main` 또는 `develop` 브랜치에 push하거나 PR 생성 시 자동 실행
- Frontend: ESLint, Jest 단위 테스트, Playwright E2E 테스트, 프로덕션 빌드 테스트
- Backend: Black 포맷팅 검사, isort import 정렬 검사, pytest 테스트
- Docker 빌드 테스트: 모든 서비스의 프로덕션 Docker 이미지 빌드 테스트

**CD 파이프라인 (태그 기반 배포):**
- Git 태그 생성으로 배포 트리거
- 모든 서비스의 Docker 이미지 빌드 및 Docker Hub 푸시
- 태그 기반 버전 관리

#### 6.4.2 배포 워크플로우

```yaml
# .github/workflows/cd.yml 예시
name: CD Pipeline
on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push images
        run: |
          ./scripts/build-images.sh ${{ github.ref_name }}
          ./scripts/push-images.sh ${{ github.ref_name }}
```

---

## 7. 성능 및 최적화

### 7.1 WebGPU 렌더링 최적화

#### 7.1.1 Draw Call 최적화
- 다수의 카메라 뷰 렌더링 시 각 뷰마다 독립적인 render pass 생성
- 메인 캔버스에서 `passEncoder`를 순차 호출하여 단일 프레임에 출력
- 텍스처 메모리 관리: 사용하지 않는 텍스처 즉시 해제

#### 7.1.2 Compute Shader 활용
- 컨베이어 벨트 물리 연산은 Compute Shader에서 처리
- 수천 개의 부품 이동은 GPU 메모리 내에서 직접 업데이트
- 프레임 드랍 방지: `deltaTime` 클램핑으로 비정상적 프레임 드랍 방지

#### 7.1.3 프레임 레이트 모니터링
- 실시간 FPS 표시
- 프레임 레이트 모니터링 및 최적화
- 메모리 누수 점검

### 7.2 백엔드 최적화

#### 7.2.1 데이터베이스 쿼리 최적화
- 비동기 처리로 시뮬레이션 데이터 폭주 시 낮은 대기 시간 유지
- R-Tree 공간 인덱스로 사고 위치 → CCTV 매칭 최적화
- 인덱스 및 트리거 설정

#### 7.2.2 Redis 캐싱 전략
- 반복 조회 최적화를 위한 Redis 캐싱
- Pub/Sub을 통한 실시간 이벤트 전파
- 세션 관리

#### 7.2.3 API 응답 시간 측정
- Prometheus 메트릭 수집 설정
- 헬스체크 엔드포인트 구현
- API 응답 시간 측정 및 개선

### 7.3 브라우저 호환성

#### 7.3.1 WebGPU 지원 브라우저
- Chrome (WebGPU 지원)
- Edge (WebGPU 지원)
- WebGPU 미지원 브라우저 폴백 처리

---

## 8. 향후 계획

### 8.1 MVP 이후 고도화 로드맵

#### 8.1.1 Replay System
- 사고 발생 전후 30초간의 시뮬레이션 데이터를 저장하여 재시청 기능 제공
- 타임라인 UI 구현

#### 8.1.2 Heatmap Visualization
- 사고가 자주 발생하는 구역을 히트맵으로 시각화
- 설비 재배치 제안 기능

#### 8.1.3 IoT Data Integration
- 실제 공장 센서 데이터를 연동하여 가상 환경과 동기화 (Digital Twin)
- 실시간 센서 데이터 시각화

#### 8.1.4 WebGPU Ray Tracing
- 공장 내 반사 광원(바닥 타일, 금속 설비)의 실사감을 높이기 위한 레이트레이싱 파이프라인 추가

### 8.2 기술 개선 계획

#### 8.2.1 성능 개선
- WebGPU Draw Call 추가 최적화
- 텍스처 압축 및 LOD (Level of Detail) 시스템
- 프레임 레이트 안정화

#### 8.2.2 기능 확장
- PTZ (Pan-Tilt-Zoom) CCTV 지원
- 다중 공장 동시 모니터링
- 모바일 디바이스 지원

---

## 부록

### A. 주요 파일 구조

```
V-Factory/
├── docs/                    # 문서 (PRD, TRD, 보고서)
├── frontend/                # Next.js 프론트엔드
│   ├── app/                 # App Router 페이지
│   ├── components/          # React 컴포넌트
│   │   ├── cctv/           # CCTV 관련 컴포넌트
│   │   ├── three/          # Three.js/WebGPU 컴포넌트
│   │   └── ui/             # ShadCN UI 컴포넌트
│   ├── lib/                 # 유틸리티 및 헬퍼
│   │   ├── api/            # API 클라이언트
│   │   ├── stores/         # Zustand 상태 관리
│   │   └── three/          # Three.js 유틸리티
│   └── shaders/             # WGSL 셰이더 파일
├── services/                # FastAPI 마이크로서비스
│   ├── factory-core/        # 공장 설비 서비스
│   ├── incident-event/      # 사고 이벤트 서비스
│   └── asset-management/    # 에셋 관리 서비스
├── docker/                  # Docker 설정
│   ├── dev/                # 개발 환경 Dockerfile
│   └── prod/               # 프로덕션 환경 Dockerfile
├── k8s/                     # Kubernetes 매니페스트
│   ├── deployments/        # Deployment 파일
│   ├── services/           # Service 파일
│   └── ingress.yaml         # Ingress 설정
└── scripts/                 # 배포 및 유틸리티 스크립트
```

### B. 주요 기술 문서 참조

- [PRD.md](./PRD.md): 제품 요구사항 정의서
- [TRD.md](./TRD.md): 기술 요구사항 정의서
- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md): 개발 로드맵
- [DOCKER_DEV_GUIDE.md](./DOCKER_DEV_GUIDE.md): Docker 개발 가이드
- [TEST_AND_DEPLOYMENT.md](./TEST_AND_DEPLOYMENT.md): 테스트 및 배포 가이드

### C. 연락처 및 지원

- **프로젝트 리포지토리**: [GitHub Repository URL]
- **문서 사이트**: [Documentation URL]
- **이슈 트래커**: [Issue Tracker URL]

---

**문서 버전:** 1.0.0  
**최종 수정일:** 2026-01-15  
**다음 검토 예정일:** 2026-02-15
