# V-Factory 개발 로드맵 (Development Roadmap)

**버전:** 1.0.0  
**최종 수정일:** 2026-01-13  
**예상 총 개발 기간:** 12-16주

---

## 📋 개요

본 문서는 V-Factory 프로젝트의 개발 단계를 Phase와 Task로 분해하여 체계적인 개발 진행을 지원합니다.
각 Phase는 독립적으로 완료 가능하며, Task 단위로 진행 상황을 추적할 수 있습니다.

---

## 🗂️ Phase 구조 요약

| Phase | 명칭 | 예상 기간 | 우선순위 |
|-------|------|-----------|----------|
| Phase 1 | 프로젝트 초기 설정 | 1주 | 🔴 Critical |
| Phase 2 | 백엔드 MSA 기반 구축 | 2-3주 | 🔴 Critical |
| Phase 3 | 프론트엔드 기본 구조 | 1-2주 | 🔴 Critical |
| Phase 4 | WebGPU 3D 렌더링 엔진 | 2-3주 | 🔴 Critical |
| Phase 5 | CCTV 멀티뷰 시스템 | 2주 | 🟠 High |
| Phase 6 | 사고 시뮬레이션 & VFX | 2주 | 🟠 High |
| Phase 7 | 실시간 통신 통합 | 1-2주 | 🟠 High |
| Phase 8 | 테스트 및 최적화 | 1주 | 🟡 Medium |
| Phase 9 | 배포 및 인프라 | 1주 | 🟡 Medium |

---

## 🚀 Phase 1: 프로젝트 초기 설정 (1주)

### 목표
프로젝트의 기본 폴더 구조와 개발 환경을 구성합니다.

### Tasks

#### Task 1.1: 프로젝트 폴더 구조 생성
- [ ] 루트 디렉토리 구조 생성
- [ ] `frontend/`, `services/`, `docker/`, `k8s/` 폴더 생성
- [ ] `.gitignore`, `.env.example` 파일 생성

#### Task 1.2: Frontend 초기화 (Next.js)
- [ ] Next.js 14 프로젝트 생성 (`create-next-app`)
- [ ] App Router 구조 설정
- [ ] TailwindCSS 설치 및 설정
- [ ] ShadCN UI 설치 및 초기 컴포넌트 추가
- [ ] TypeScript 설정 최적화

#### Task 1.3: Backend 서비스 초기화
- [ ] `services/factory-core/` FastAPI 프로젝트 생성
- [ ] `services/incident-event/` FastAPI 프로젝트 생성
- [ ] `services/asset-management/` FastAPI 프로젝트 생성
- [ ] 각 서비스별 `requirements.txt` 작성
- [ ] Poetry 또는 pip 의존성 관리 설정

#### Task 1.4: Docker 개발 환경 구성 ⭐ 핵심
- [ ] `docker-compose.yml` 작성 (전체 서비스 오케스트레이션)
- [ ] `docker/dev/frontend.Dockerfile` 작성 (Hot Reload 지원)
- [ ] `docker/dev/backend.Dockerfile` 작성 (Hot Reload 지원)
- [ ] `docker/dev/init-db.sql` 초기화 스크립트 작성
- [ ] Docker 네트워크 및 볼륨 설정
- [ ] 환경변수 템플릿 작성 및 문서화

#### Task 1.5: 데이터베이스 스키마 설계
- [ ] PostgreSQL 테이블 생성 (factories, incidents, cctv_configs, assets)
- [ ] 인덱스 및 트리거 설정
- [ ] 샘플 데이터 삽입 스크립트
- [ ] Redis 캐시 키 설계

#### Task 1.6: 개발 도구 설정
- [ ] ESLint, Prettier 설정 (Frontend)
- [ ] Black, isort 설정 (Backend)
- [ ] Husky pre-commit hook 설정
- [ ] `docker compose up` 으로 전체 환경 테스트

---

## 🔧 Phase 2: 백엔드 MSA 기반 구축 (2-3주)

### 목표
3개의 FastAPI 마이크로서비스 핵심 기능을 구현합니다.

### Tasks

#### Task 2.1: Factory Core Service - 기본 구조
- [x] FastAPI 앱 엔트리포인트 설정
- [x] Pydantic 모델 정의 (Factory, Equipment)
- [x] SQLAlchemy ORM 모델 생성
- [x] Alembic 마이그레이션 설정

#### Task 2.2: Factory Core Service - API 구현
- [x] `POST /factories` - 공장 생성 API
- [x] `GET /factories/{id}` - 공장 조회 API
- [x] `PUT /factories/{id}/layout` - 레이아웃 업데이트 API
- [x] `GET /factories/{id}/equipment` - 설비 목록 조회 API
- [x] 비동기 데이터베이스 연결 (asyncpg)

#### Task 2.3: Incident Event Service - 기본 구조
- [x] FastAPI 앱 엔트리포인트 설정
- [x] Pydantic 모델 정의 (Incident, IncidentType)
- [x] SQLAlchemy ORM 모델 생성
- [x] Redis 연결 설정

#### Task 2.4: Incident Event Service - API 구현
- [x] `POST /incidents` - 사고 발생 트리거 API
- [x] `GET /incidents` - 사고 목록 조회 API
- [x] `GET /incidents/{id}` - 사고 상세 조회 API
- [x] Redis Pub/Sub 발행 로직 구현
- [x] SSE 엔드포인트 구현 (`GET /incidents/stream`)

#### Task 2.5: Asset Management Service - 기본 구조
- [x] FastAPI 앱 엔트리포인트 설정
- [x] Pydantic 모델 정의 (Asset, AssetMetadata)
- [x] 파일 저장소 연동 설정 (로컬/S3)

#### Task 2.6: Asset Management Service - API 구현
- [x] `POST /assets` - 에셋 업로드 API
- [x] `GET /assets` - 에셋 목록 조회 API
- [x] `GET /assets/{id}` - 에셋 다운로드 API
- [x] `GET /assets/{id}/metadata` - 메타데이터 조회 API
- [x] GLB/GLTF 파일 검증 로직

#### Task 2.7: CCTV 설정 API (Factory Core 확장)
- [x] `POST /cctv-configs` - CCTV 설정 생성 API
- [x] `GET /factories/{id}/cctv-configs` - CCTV 목록 조회 API
- [x] `PUT /cctv-configs/{id}` - CCTV 설정 수정 API
- [x] R-Tree 공간 인덱스 구현 (사고 위치 → CCTV 매칭)

---

## 🎨 Phase 3: 프론트엔드 기본 구조 (1-2주)

### 목표
Next.js 기반 대시보드 UI 레이아웃과 기본 컴포넌트를 구현합니다.

### Tasks

#### Task 3.1: 레이아웃 구조 설계
- [x] `app/layout.tsx` 루트 레이아웃 구현
- [x] 네비게이션 사이드바 컴포넌트
- [x] 헤더 컴포넌트 (시스템 상태 표시)
- [x] 반응형 레이아웃 (Desktop/Tablet)

#### Task 3.2: 페이지 라우팅 설정
- [x] `app/page.tsx` - 메인 대시보드
- [x] `app/monitoring/page.tsx` - CCTV 모니터링
- [x] `app/incidents/page.tsx` - 사고 로그 페이지
- [x] `app/settings/page.tsx` - 시스템 설정

#### Task 3.3: ShadCN 컴포넌트 통합
- [x] Button, Card, Dialog 컴포넌트 설치
- [x] Table, Badge, Alert 컴포넌트 설치
- [x] Select, Input, Form 컴포넌트 설치
- [x] 커스텀 테마 색상 설정 (관제 시스템 다크 테마)

#### Task 3.4: 상태 관리 설정
- [x] Zustand 또는 Jotai 설치
- [x] 전역 상태 스토어 설계 (Factory, CCTV, Incident)
- [x] API 클라이언트 유틸리티 (fetch wrapper)

#### Task 3.5: API 연동 기본 설정
- [x] Backend API Base URL 환경변수 설정
- [x] API 타입 정의 (TypeScript interfaces)
- [x] React Query 또는 SWR 설정
- [x] 에러 핸들링 및 로딩 상태 처리

---

## 🎮 Phase 4: WebGPU 3D 렌더링 엔진 (2-3주)

### 목표
Three.js WebGPU Renderer를 활용한 3D 공장 환경 렌더링 엔진을 구현합니다.

### Tasks

#### Task 4.1: Three.js WebGPU 설정
- [x] Three.js 및 WebGPU Renderer 설치
- [x] WebGPU 지원 여부 체크 로직
- [x] 기본 Scene, Camera, Renderer 설정
- [x] React 컴포넌트 래퍼 구현 (`<WebGPUCanvas />`)

#### Task 4.2: 공장 환경 기본 렌더링
- [x] 공장 바닥(Floor) 메쉬 생성
- [x] 기본 조명 설정 (Ambient, Directional)
- [x] 카메라 컨트롤 (OrbitControls)
- [x] 그리드 헬퍼 및 축 헬퍼

#### Task 4.3: GLB/GLTF 모델 로더
- [x] GLTFLoader 설정
- [x] 모델 로딩 및 씬 추가
- [x] 로딩 상태 표시 (Progress)
- [x] 에러 핸들링

#### Task 4.4: 컨베이어 벨트 시스템 - 기본
- [x] 컨베이어 벨트 메쉬 생성
- [x] 텍스처 UV 애니메이션 구현
- [x] 벨트 속도 제어 파라미터

#### Task 4.5: 컨베이어 벨트 시스템 - Compute Shader
- [ ] WGSL Compute Shader 작성 (`conveyor.wgsl`)
- [ ] Storage Buffer 설정 (부품 위치 데이터)
- [ ] `newPosition = oldPosition + velocity * deltaTime` 연산
- [ ] GPU → CPU 데이터 읽기 (결과 동기화)

#### Task 4.6: Worker NPC 기본 구현
- [x] NPC 캐릭터 모델 로딩
- [x] 기본 이동 경로 시스템 (Waypoint)
- [x] 애니메이션 믹서 설정 (걷기, 서기)
- [x] NPC 상태 관리 (working, idle, injured)

---

## 📹 Phase 5: CCTV 멀티뷰 시스템 (2주)

### 목표
다수의 가상 CCTV 카메라를 렌더링하고 그리드 뷰로 표시합니다.

### Tasks

#### Task 5.1: CCTV 카메라 시스템
- [x] 가상 CCTV 카메라 클래스 구현
- [x] 카메라 위치/방향 설정 인터페이스
- [x] FOV(화각) 설정 기능
- [x] 카메라 프리뷰 헬퍼 (씬 내 시각화)

#### Task 5.2: 멀티뷰 렌더링 파이프라인
- [x] 각 CCTV별 `WebGLRenderTarget` 생성
- [x] Render Target 설정 (Off-screen rendering)
- [x] 순차 렌더링 (renderAllViews 메서드)
- [x] 프레임당 최대 렌더링 카메라 수 제한

#### Task 5.3: 그리드 뷰 UI 컴포넌트
- [x] `<CCTVGridView />` 컴포넌트 구현
- [x] 2x2, 3x3, 4x4 그리드 레이아웃 옵션
- [x] CCTV 피드 선택/확대 기능
- [x] CCTV 이름 및 상태 오버레이

#### Task 5.4: CCTV 피드 개별 뷰
- [x] 단일 CCTV 전체화면 모드
- [x] CCTV 정보 패널 (위치, FOV, 상태)
- [x] 실시간 타임스탬프 표시
- [x] 스크린샷 저장 기능

#### Task 5.5: CCTV 설정 관리 UI
- [x] CCTV 추가/삭제 인터페이스
- [ ] 드래그로 CCTV 위치 조정 (3D 씬 내)
- [ ] CCTV 설정 저장 (Backend 연동)
- [ ] CCTV 프리셋 저장/불러오기

---

## ⚠️ Phase 6: 사고 시뮬레이션 & VFX (2주)

### 목표
사고 발생 로직과 시각적 이펙트(VFX)를 구현합니다.

### Tasks

#### Task 6.1: 사고 트리거 시스템
- [ ] 수동 사고 트리거 UI 버튼
- [ ] 사고 유형 선택 (끼임, 전도, 충돌)
- [ ] 사고 위치 지정 (3D 좌표)
- [ ] 사고 심각도 설정 (1-5)

#### Task 6.2: 사고 감지 로직
- [ ] 사고 위치 → 가장 가까운 CCTV 매칭
- [ ] R-Tree 공간 인덱스 활용
- [ ] 사고 영역 내 NPC 탐지
- [ ] 사고 대상 NPC 상태 변경

#### Task 6.3: CCTV Alert Effect - Post-Processing
- [ ] WGSL Fragment Shader 작성 (`alert-effect.wgsl`)
- [ ] Red Overlay 효과 구현 (`vec4(0.3, 0.0, 0.0, 0.5)`)
- [ ] Glitch Effect 구현 (UV 왜곡)
- [ ] Scanline Effect 구현

#### Task 6.4: Victim Highlight - Outline Rendering
- [ ] WGSL Outline Shader 작성 (`outline.wgsl`)
- [ ] Backface Culling 역이용 방식 구현
- [ ] 또는 Sobel Filter 외곽선 추출
- [ ] Pulse Animation 효과 (크기 진동)

#### Task 6.5: 사고 이펙트 통합
- [ ] `is_accident` 플래그 기반 셰이더 활성화
- [ ] 이펙트 강도 조절 파라미터
- [ ] 이펙트 지속 시간 설정
- [ ] 이펙트 종료 트랜지션

#### Task 6.6: 사고 로그 UI
- [ ] 실시간 사고 로그 리스트 컴포넌트
- [ ] 사고 상세 정보 모달
- [ ] 사고 발생 CCTV 바로가기
- [ ] 사고 기록 필터링/검색

---

## 🔗 Phase 7: 실시간 통신 통합 (1-2주)

### 목표
Backend와 Frontend 간 실시간 이벤트 통신을 완성합니다.

### Tasks

#### Task 7.1: Redis Pub/Sub 통합
- [ ] Incident Service → Redis 발행 구현
- [ ] Redis 채널 구독 리스너 구현
- [ ] 메시지 직렬화/역직렬화 (JSON)

#### Task 7.2: SSE (Server-Sent Events) 클라이언트
- [ ] EventSource API 래퍼 구현
- [ ] SSE 연결 상태 관리 (연결/재연결)
- [ ] 이벤트 타입별 핸들러 분기
- [ ] 연결 끊김 시 자동 재연결

#### Task 7.3: 실시간 사고 알림 통합
- [ ] 사고 발생 시 SSE 이벤트 수신
- [ ] 수신된 데이터로 3D 씬 상태 업데이트
- [ ] CCTV 이펙트 자동 활성화
- [ ] 알림 토스트 표시

#### Task 7.4: 공장 상태 동기화
- [ ] 공장 레이아웃 변경 실시간 반영
- [ ] CCTV 설정 변경 실시간 반영
- [ ] 다중 클라이언트 동기화 테스트

---

## 🧪 Phase 8: 테스트 및 최적화 (1주)

### 목표
시스템 안정성과 성능을 검증하고 최적화합니다.

### Tasks

#### Task 8.1: 단위 테스트 작성
- [x] Backend API 단위 테스트 (pytest)
- [x] Frontend 컴포넌트 테스트 (Jest, React Testing Library)
- [x] 유틸리티 함수 테스트

#### Task 8.2: 통합 테스트
- [x] API 엔드포인트 통합 테스트
- [x] SSE 통신 테스트
- [x] E2E 테스트 (Playwright)

#### Task 8.3: 성능 최적화 - Frontend
- [x] WebGPU Draw Call 최적화
- [x] 텍스처 메모리 관리
- [x] 프레임 레이트 모니터링 및 최적화
- [x] 메모리 누수 점검

#### Task 8.4: 성능 최적화 - Backend
- [x] 데이터베이스 쿼리 최적화
- [x] Redis 캐싱 전략 적용
- [x] API 응답 시간 측정 및 개선

#### Task 8.5: 브라우저 호환성 테스트
- [x] Chrome WebGPU 테스트
- [x] Edge WebGPU 테스트
- [x] WebGPU 미지원 브라우저 폴백 처리

---

## 🚢 Phase 9: 배포 및 인프라 (1주)

### 목표
Docker 컨테이너화 및 Kubernetes 배포 환경을 구성합니다.

### Tasks

#### Task 9.1: Docker 이미지 빌드
- [ ] Frontend Dockerfile 작성
- [ ] Backend 서비스별 Dockerfile 작성
- [ ] Docker Compose 프로덕션 설정
- [ ] 멀티스테이지 빌드 최적화

#### Task 9.2: Kubernetes 매니페스트
- [ ] Deployment 매니페스트 작성
- [ ] Service 매니페스트 작성
- [ ] ConfigMap, Secret 설정
- [ ] Ingress 설정

#### Task 9.3: CI/CD 파이프라인
- [ ] GitHub Actions 워크플로우 작성
- [ ] 자동 테스트 실행
- [ ] Docker 이미지 자동 빌드/푸시
- [ ] 자동 배포 트리거

#### Task 9.4: 모니터링 설정
- [ ] 로깅 시스템 구성 (stdout → 집계)
- [ ] 헬스체크 엔드포인트 구현
- [ ] 기본 메트릭 수집 설정

---

## 📊 진행 상황 추적

### 체크리스트 사용법
- [ ] 미완료 Task
- [x] 완료된 Task
- [~] 진행 중인 Task

### 우선순위 범례
- 🔴 Critical: 필수 기능, 즉시 구현 필요
- 🟠 High: 핵심 기능, 우선 구현 권장
- 🟡 Medium: 중요 기능, 일정에 따라 구현
- 🟢 Low: 부가 기능, 여유 시 구현

---

## 📝 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-13 | 최초 작성 |
| 1.1.0 | 2026-01-13 | Phase 8 완료: 테스트 및 최적화 구현 |