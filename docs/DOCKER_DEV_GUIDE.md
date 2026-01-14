# V-Factory Docker 개발 환경 가이드

**버전:** 1.0.0  
**최종 수정일:** 2026-01-13

---

## 📋 개요

Docker Compose를 활용하여 V-Factory의 모든 서비스를 컨테이너화된 개발 환경에서 실행합니다.
이를 통해 팀원 간 동일한 개발 환경을 보장하고, 의존성 충돌을 방지합니다.

---

## 🎯 Docker 개발 환경의 장점

| 장점 | 설명 |
|------|------|
| **환경 일관성** | 모든 개발자가 동일한 환경에서 작업 |
| **빠른 온보딩** | 새 팀원도 `docker compose up` 한 번으로 시작 |
| **의존성 격리** | Node.js, Python 버전 충돌 방지 |
| **인프라 통합** | PostgreSQL, Redis를 별도 설치 없이 사용 |
| **Hot Reload** | 코드 변경 시 자동 반영 (볼륨 마운트) |

---

## 🏗️ 아키텍처 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Network (v-factory-network)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  PostgreSQL │  │    Redis    │  │        Frontend         │ │
│  │   :5432     │  │    :6379    │  │   Next.js Dev :3000     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│         │                │                     │                │
│         └────────────────┼─────────────────────┘                │
│                          │                                      │
│  ┌───────────────────────┼───────────────────────────────────┐ │
│  │                 Backend Services                          │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │ │
│  │  │ Factory Core│ │  Incident   │ │  Asset Management   │  │ │
│  │  │   :8001     │ │   :8002     │ │       :8003         │  │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 파일 구조

```
V-Factory/
├── docker/
│   ├── dev/
│   │   ├── frontend.Dockerfile      # Next.js 개발용
│   │   ├── backend.Dockerfile       # FastAPI 개발용 (공통)
│   │   └── init-db.sql              # DB 초기화 스크립트
│   └── prod/
│       └── ...                      # 프로덕션용 (추후)
├── docker-compose.yml               # 개발 환경 Compose 파일
├── docker-compose.override.yml      # 로컬 오버라이드 (선택)
└── .env.docker                      # Docker 환경변수
```

---

## 🚀 빠른 시작

### 1. 사전 요구사항
- Docker Desktop 설치 (Windows/Mac) 또는 Docker Engine (Linux)
- Docker Compose V2 이상

### 2. 환경 변수 설정
```bash
# 아래 내용으로 .env 파일 생성
# 또는 docker-compose.yml의 기본값 사용 (개발 환경에서는 기본값으로 충분)
```

```env
# .env 파일 내용 (선택사항 - 기본값이 설정되어 있음)
POSTGRES_USER=vfactory
POSTGRES_PASSWORD=vfactory_dev_password
POSTGRES_DB=vfactory_db
```

### 3. 개발 서버 실행
```bash
# 모든 서비스 빌드 및 실행
docker compose up --build

# 백그라운드 실행
docker compose up -d --build

# 특정 서비스만 실행
docker compose up frontend postgres redis
```

### 4. 서비스 접속
| 서비스 | URL | 설명 |
|--------|-----|------|
| Frontend | http://localhost:3000 | Next.js 대시보드 |
| Factory Core API | http://localhost:8001/docs | Swagger UI |
| Incident Event API | http://localhost:8002/docs | Swagger UI |
| Asset Management API | http://localhost:8003/docs | Swagger UI |
| PostgreSQL | localhost:5432 | DB 직접 접속 |
| Redis | localhost:6379 | Redis CLI 접속 |

---

## 🛠️ 주요 명령어

### 서비스 관리
```bash
# 모든 서비스 시작
docker compose up -d

# 모든 서비스 중지
docker compose down

# 서비스 재시작
docker compose restart <service-name>

# 로그 확인
docker compose logs -f <service-name>

# 모든 로그 실시간 확인
docker compose logs -f
```

### 데이터베이스 관리
```bash
# PostgreSQL 접속
docker compose exec postgres psql -U vfactory -d vfactory_db

# Redis CLI 접속
docker compose exec redis redis-cli

# DB 초기화 (주의: 데이터 삭제됨)
docker compose down -v
docker compose up -d
```

### 컨테이너 디버깅
```bash
# 컨테이너 내부 접속
docker compose exec <service-name> /bin/sh

# Frontend 컨테이너 접속
docker compose exec frontend /bin/sh

# Backend 컨테이너 접속
docker compose exec factory-core /bin/bash
```

### 빌드 및 캐시
```bash
# 캐시 없이 재빌드
docker compose build --no-cache

# 특정 서비스만 재빌드
docker compose build <service-name>

# 사용하지 않는 이미지/볼륨 정리
docker system prune -a
```

---

## 🔧 Hot Reload 설정

### Frontend (Next.js)
- 볼륨 마운트로 `frontend/` 디렉토리가 컨테이너와 동기화
- 코드 변경 시 자동으로 Fast Refresh 작동
- `node_modules`는 컨테이너 내부에서 관리 (성능 최적화)

### Backend (FastAPI)
- `uvicorn --reload` 옵션으로 자동 재시작
- `services/` 디렉토리가 볼륨 마운트됨
- Python 파일 변경 시 자동 반영

---

## 🗄️ 데이터 영속성

### 볼륨 구성
| 볼륨 이름 | 용도 | 영속성 |
|-----------|------|--------|
| `postgres_data` | PostgreSQL 데이터 | ✅ 유지 |
| `redis_data` | Redis 데이터 | ✅ 유지 |
| `assets_data` | 업로드된 에셋 파일 | ✅ 유지 |

### 데이터 백업
```bash
# PostgreSQL 덤프
docker compose exec postgres pg_dump -U vfactory vfactory_db > backup.sql

# PostgreSQL 복원
docker compose exec -T postgres psql -U vfactory vfactory_db < backup.sql
```

---

## 🔐 환경 변수 설명

```env
# 데이터베이스 설정
POSTGRES_USER=vfactory
POSTGRES_PASSWORD=vfactory_dev_password
POSTGRES_DB=vfactory_db
DATABASE_URL=postgresql://vfactory:vfactory_dev_password@postgres:5432/vfactory_db

# Redis 설정
REDIS_URL=redis://redis:6379/0

# Frontend 설정
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_INCIDENT_API_URL=http://localhost:8002
NEXT_PUBLIC_ASSET_API_URL=http://localhost:8003

# Backend 공통 설정
DEBUG=true
LOG_LEVEL=debug
CORS_ORIGINS=http://localhost:3000
```

---

## ⚠️ 트러블슈팅

### 문제: 포트 충돌
```bash
# 사용 중인 포트 확인
netstat -ano | findstr :3000

# 해결: docker-compose.yml에서 포트 변경
ports:
  - "3001:3000"  # 호스트:컨테이너
```

### 문제: 볼륨 권한 오류 (Linux)
```bash
# 해결: 볼륨 디렉토리 권한 설정
sudo chown -R $USER:$USER ./services
```

### 문제: node_modules 동기화 느림 (Windows)
```bash
# 해결: WSL2 백엔드 사용 권장
# Docker Desktop 설정 → Resources → WSL Integration 활성화
```

### 문제: 컨테이너가 시작되지 않음
```bash
# 로그 확인
docker compose logs <service-name>

# 컨테이너 상태 확인
docker compose ps -a

# 완전 초기화 후 재시작
docker compose down -v --remove-orphans
docker compose up --build
```

---

## 📊 리소스 제한 (선택사항)

대규모 개발 환경에서 리소스 사용량을 제한할 수 있습니다:

```yaml
# docker-compose.yml 내 서비스별 설정
services:
  frontend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
```

---

## 🔗 관련 문서
- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) - 개발 로드맵
- [PRD.md](./PRD.md) - 제품 요구사항
- [TRD.md](./TRD.md) - 기술 요구사항
