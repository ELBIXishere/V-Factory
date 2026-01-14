# V-Factory

> WebGPU 기반 3D 가상 공장 안전 모니터링 시뮬레이터

WebGPU 기반 3D 렌더링 기술을 활용한 가상 공장 안전 모니터링 시뮬레이터

## 🚀 빠른 시작

### 사전 요구사항

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 및 실행
- [Node.js 20+](https://nodejs.org/) (로컬 개발 시)
- [Python 3.12+](https://www.python.org/) (로컬 개발 시)

### Docker Compose로 전체 환경 실행

```bash
# 1. 프로젝트 폴더로 이동
cd "V-Factory 경로"

# 2. 환경 변수 파일 복사
cp env.example .env

# 3. Docker Compose로 전체 서비스 실행
docker compose up --build

# 또는 백그라운드 실행
docker compose up --build -d
```

### 서비스 접속 URL

| 서비스 | URL | 설명 |
|--------|-----|------|
| Frontend | http://localhost:3000 | Next.js 웹 애플리케이션 |
| Factory Core API | http://localhost:8001 | 공장 설비 관리 API |
| Incident Event API | http://localhost:8002 | 사고 이벤트 API |
| Asset Management API | http://localhost:8003 | 에셋 관리 API |
| PostgreSQL | localhost:5432 | 데이터베이스 |
| Redis | localhost:6379 | 캐시/메시지 브로커 |

## 📁 프로젝트 구조

```
V-Factory/
├── frontend/                    # Next.js 14 프론트엔드
│   ├── app/                     # App Router 페이지
│   │   ├── page.tsx             # 메인 대시보드
│   │   ├── monitoring/          # CCTV 모니터링
│   │   ├── incidents/           # 사고 로그
│   │   └── settings/            # 시스템 설정
│   ├── components/              # React 컴포넌트
│   ├── lib/                     # 유틸리티
│   └── shaders/                 # WGSL 셰이더
├── services/                    # FastAPI 마이크로서비스
│   ├── factory-core/            # 공장 설비 서비스
│   ├── incident-event/          # 사고 이벤트 서비스
│   └── asset-management/        # 에셋 관리 서비스
├── docker/                      # Docker 설정
│   └── dev/                     # 개발 환경 Dockerfile
├── k8s/                         # Kubernetes 매니페스트
├── docs/                        # 문서
│   ├── PRD.md                   # 제품 요구사항
│   ├── TRD.md                   # 기술 요구사항
│   └── DEVELOPMENT_ROADMAP.md   # 개발 로드맵
└── docker-compose.yml           # Docker Compose 설정
```

## 🛠️ 로컬 개발 환경

### Frontend 개발

```bash
cd frontend
npm install
npm run dev
```

### Backend 개발 (각 서비스별)

```bash
cd services/factory-core  # 또는 incident-event, asset-management
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## 📝 API 문서

각 서비스 실행 후 Swagger UI에서 API 문서 확인:

- Factory Core: http://localhost:8001/docs
- Incident Event: http://localhost:8002/docs
- Asset Management: http://localhost:8003/docs

## 🎨 기술 스택

### Frontend
- Next.js 14 (App Router)
- Three.js (WebGPU Renderer)
- TailwindCSS + ShadCN UI
- Zustand (상태 관리)

### Backend
- FastAPI (Python 3.12)
- SQLAlchemy (비동기 ORM)
- PostgreSQL
- Redis (Pub/Sub, SSE)

## 📄 라이선스

Private Project - All Rights Reserved
