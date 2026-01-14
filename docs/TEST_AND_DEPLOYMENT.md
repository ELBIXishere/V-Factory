# V-Factory 테스트 및 배포 가이드

## 목차
1. [로컬 테스트](#로컬-테스트)
2. [Docker를 이용한 프로덕션 빌드 및 테스트](#docker를-이용한-프로덕션-빌드-및-테스트)
3. [Kubernetes 배포](#kubernetes-배포)
4. [CI/CD 파이프라인](#cicd-파이프라인)
5. [모니터링 및 헬스체크](#모니터링-및-헬스체크)

---

## 로컬 테스트

### 개발 환경 테스트

#### 1. Docker Compose로 전체 환경 실행

```bash
# 환경변수 파일 설정
cp env.example .env

# 전체 서비스 실행 (개발 모드)
docker compose up --build

# 백그라운드 실행
docker compose up --build -d
```

#### 2. 개별 서비스 로컬 테스트

**Frontend 테스트:**
```bash
cd frontend

# 의존성 설치
npm install

# 테스트 실행
npm test                    # Jest 단위 테스트
npm run test:e2e           # Playwright E2E 테스트
npm run lint               # ESLint 검사
npm run build              # 프로덕션 빌드 테스트
```

**Backend 테스트:**
```bash
cd services/factory-core  # 또는 incident-event, asset-management

# 가상환경 설정
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 테스트 실행
pytest                    # 단위 테스트
pytest --cov=.           # 커버리지 포함 테스트
black --check .          # 코드 포맷팅 검사
isort --check-only .     # import 정렬 검사
```

---

## Docker를 이용한 프로덕션 빌드 및 테스트

### 1. 프로덕션 이미지 빌드

#### 방법 1: 빌드 스크립트 사용 (권장)

```bash
# 모든 서비스 이미지 빌드
chmod +x scripts/build-images.sh
./scripts/build-images.sh [tag]

# 예시: v1.0.0 태그로 빌드
./scripts/build-images.sh v1.0.0
```

#### 방법 2: Docker Compose 사용

```bash
# 프로덕션 이미지 빌드
docker compose -f docker-compose.prod.yml build

# 또는 특정 서비스만 빌드
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml build factory-core
```

#### 방법 3: 개별 Dockerfile 사용

```bash
# Frontend 이미지 빌드
docker build -f docker/prod/frontend.Dockerfile -t v-factory-frontend:latest .

# Backend 이미지 빌드 (서비스별)
docker build -f docker/prod/backend.Dockerfile \
  --build-arg SERVICE_NAME=factory-core \
  -t v-factory-factory-core:latest .

docker build -f docker/prod/backend.Dockerfile \
  --build-arg SERVICE_NAME=incident-event \
  -t v-factory-incident-event:latest .

docker build -f docker/prod/backend.Dockerfile \
  --build-arg SERVICE_NAME=asset-management \
  -t v-factory-asset-management:latest .
```

### 2. 프로덕션 환경에서 테스트

```bash
# 환경변수 설정
cp .env.production.example .env.production
# .env.production 파일 편집하여 실제 값 설정

# 프로덕션 모드로 실행
docker compose -f docker-compose.prod.yml up -d

# 로그 확인
docker compose -f docker-compose.prod.yml logs -f

# 서비스 상태 확인
docker compose -f docker-compose.prod.yml ps

# 특정 서비스 로그 확인
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs factory-core
```

### 3. 이미지 푸시 (Docker Hub)

```bash
# Docker Hub 로그인
docker login

# 푸시 스크립트 사용
export DOCKER_HUB_USERNAME=your-username
chmod +x scripts/push-images.sh
./scripts/push-images.sh [tag]

# 예시: latest 태그로 푸시
./scripts/push-images.sh latest
```

**수동 푸시:**
```bash
# 이미지 태그 지정
docker tag v-factory-frontend:latest your-username/v-factory-frontend:latest

# 푸시
docker push your-username/v-factory-frontend:latest
```

---

## Kubernetes 배포

### 사전 요구사항
- Kubernetes 클러스터 (Minikube, 또는 클라우드 환경)
- kubectl 설치 및 클러스터 접근 설정
- Kubernetes 네임스페이스 권한

### 1. Secret 생성

```bash
# Secret 파일 생성 (템플릿 기반)
cp k8s/secrets.yaml.template k8s/secrets.yaml

# secrets.yaml 파일 편집하여 실제 값 입력
# 또는 kubectl 명령어로 직접 생성
kubectl create secret generic v-factory-secrets \
  --from-literal=POSTGRES_PASSWORD=your-secure-password \
  --namespace=v-factory
```

### 2. 네임스페이스 및 기본 리소스 생성

```bash
# 네임스페이스 생성
kubectl apply -f k8s/namespace.yaml

# ConfigMap 생성
kubectl apply -f k8s/configmap.yaml

# Secret 생성
kubectl apply -f k8s/secrets.yaml
```

### 3. 데이터베이스 배포

```bash
# PostgreSQL StatefulSet 배포
kubectl apply -f k8s/deployments/postgres-deployment.yaml

# Redis StatefulSet 배포
kubectl apply -f k8s/deployments/redis-deployment.yaml

# Service 생성
kubectl apply -f k8s/services/postgres-service.yaml
kubectl apply -f k8s/services/redis-service.yaml

# 배포 상태 확인
kubectl get pods -n v-factory
kubectl get svc -n v-factory
```

### 4. 백엔드 서비스 배포

```bash
# 이미지 태그 업데이트 (Deployment 파일에서)
# v-factory-{service-name}:latest를 실제 이미지 경로로 변경
# 예: your-username/v-factory-factory-core:v1.0.0

# Deployment 배포
kubectl apply -f k8s/deployments/factory-core-deployment.yaml
kubectl apply -f k8s/deployments/incident-event-deployment.yaml
kubectl apply -f k8s/deployments/asset-management-deployment.yaml

# Service 생성
kubectl apply -f k8s/services/backend-services.yaml

# 배포 상태 확인
kubectl get deployments -n v-factory
kubectl get pods -n v-factory
kubectl rollout status deployment/factory-core -n v-factory
```

### 5. 프론트엔드 배포

```bash
# Frontend Deployment 배포
kubectl apply -f k8s/deployments/frontend-deployment.yaml

# Service 생성
kubectl apply -f k8s/services/frontend-service.yaml

# 배포 상태 확인
kubectl get deployment frontend -n v-factory
kubectl get pods -l app=frontend -n v-factory
```

### 6. Ingress 설정 (선택사항)

```bash
# Ingress Controller 설치 확인
kubectl get ingressclass

# Nginx Ingress Controller가 없다면 설치
# (환경에 따라 다름)

# Ingress 설정 파일 편집
# k8s/ingress.yaml에서 도메인 주소 수정

# Ingress 적용
kubectl apply -f k8s/ingress.yaml

# Ingress 상태 확인
kubectl get ingress -n v-factory
```

### 7. 전체 배포 스크립트 (순서대로)

```bash
#!/bin/bash
# 전체 Kubernetes 배포 스크립트

set -e

echo "1. 네임스페이스 및 기본 리소스 생성..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

echo "2. 데이터베이스 배포..."
kubectl apply -f k8s/deployments/postgres-deployment.yaml
kubectl apply -f k8s/deployments/redis-deployment.yaml
kubectl apply -f k8s/services/postgres-service.yaml
kubectl apply -f k8s/services/redis-service.yaml

echo "3. 백엔드 서비스 배포..."
kubectl apply -f k8s/deployments/factory-core-deployment.yaml
kubectl apply -f k8s/deployments/incident-event-deployment.yaml
kubectl apply -f k8s/deployments/asset-management-deployment.yaml
kubectl apply -f k8s/services/backend-services.yaml

echo "4. 프론트엔드 배포..."
kubectl apply -f k8s/deployments/frontend-deployment.yaml
kubectl apply -f k8s/services/frontend-service.yaml

echo "5. Ingress 설정..."
kubectl apply -f k8s/ingress.yaml

echo "✅ 배포 완료!"
kubectl get all -n v-factory
```

### 8. 배포 확인 및 관리

```bash
# 모든 리소스 확인
kubectl get all -n v-factory

# Pod 로그 확인
kubectl logs -f deployment/frontend -n v-factory
kubectl logs -f deployment/factory-core -n v-factory

# Pod 상태 확인
kubectl describe pod <pod-name> -n v-factory

# Deployment 롤아웃 상태
kubectl rollout status deployment/frontend -n v-factory

# 이미지 업데이트 및 재배포
kubectl set image deployment/frontend frontend=your-username/v-factory-frontend:v1.1.0 -n v-factory
kubectl rollout restart deployment/frontend -n v-factory

# 배포 이력 확인
kubectl rollout history deployment/frontend -n v-factory

# 이전 버전으로 롤백
kubectl rollout undo deployment/frontend -n v-factory
```

---

## CI/CD 파이프라인

### GitHub Actions 설정

#### 1. Secrets 설정

GitHub 저장소에서 다음 Secrets를 설정:
- `DOCKER_HUB_USERNAME`: Docker Hub 사용자명
- `DOCKER_HUB_PASSWORD`: Docker Hub 액세스 토큰

설정 방법:
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. New repository secret 추가

#### 2. CI 파이프라인 (자동 실행)

**워크플로우 파일**: `.github/workflows/ci.yml`

`main` 또는 `develop` 브랜치에 push하거나 PR 생성 시 자동 실행:

- **Frontend 작업**:
  - ESLint 린트 검사
  - Jest 단위 테스트
  - Playwright E2E 테스트
  - 프로덕션 빌드 테스트

- **Backend 작업** (각 서비스별 병렬 실행):
  - Factory Core: Black 포맷팅 검사, isort import 정렬 검사, pytest 테스트
  - Incident Event: Black 포맷팅 검사, isort import 정렬 검사, pytest 테스트
  - Asset Management: Black 포맷팅 검사, isort import 정렬 검사, pytest 테스트

- **Docker 빌드 테스트**:
  - 모든 서비스의 프로덕션 Docker 이미지 빌드 테스트 (푸시 안 함)

#### 3. CD 파이프라인 (태그 기반 배포)

**워크플로우 파일**: `.github/workflows/cd.yml`

**방법 1: 태그 생성으로 배포**
```bash
# Git 태그 생성 및 푸시
git tag v1.0.0
git push origin v1.0.0
```

**방법 2: 수동 트리거**
1. GitHub 저장소 → Actions 탭
2. "CD" 워크플로우 선택
3. "Run workflow" 클릭
4. 태그 입력 (예: `v1.0.0`)
5. "Run workflow" 버튼 클릭

워크플로우가 실행되면:
- 모든 서비스의 Docker 이미지 빌드
- Docker Hub에 푸시 (태그 버전 및 latest 태그)
- 태그 기반 버전 관리

**푸시되는 이미지 형식**:
- `{DOCKER_HUB_USERNAME}/v-factory-frontend:{tag}`
- `{DOCKER_HUB_USERNAME}/v-factory-frontend:latest`
- `{DOCKER_HUB_USERNAME}/v-factory-factory-core:{tag}`
- `{DOCKER_HUB_USERNAME}/v-factory-factory-core:latest`
- `{DOCKER_HUB_USERNAME}/v-factory-incident-event:{tag}`
- `{DOCKER_HUB_USERNAME}/v-factory-incident-event:latest`
- `{DOCKER_HUB_USERNAME}/v-factory-asset-management:{tag}`
- `{DOCKER_HUB_USERNAME}/v-factory-asset-management:latest`

### CI/CD 상태 확인

```bash
# GitHub CLI 사용 (선택사항)
gh run list
gh run watch
```

또는 GitHub 웹 인터페이스에서:
- Actions 탭에서 워크플로우 실행 상태 확인

---

## 모니터링 및 헬스체크

### 헬스체크 확인

#### Docker Compose 환경
```bash
# 모든 서비스 헬스체크
docker compose -f docker-compose.prod.yml ps

# 특정 서비스 헬스체크
curl http://localhost:8001/health  # Factory Core
curl http://localhost:8002/health  # Incident Event
curl http://localhost:8003/health  # Asset Management
```

#### Kubernetes 환경
```bash
# Pod 헬스체크 상태 확인
kubectl get pods -n v-factory

# 헬스체크 엔드포인트 직접 호출
kubectl port-forward deployment/factory-core 8000:8000 -n v-factory
curl http://localhost:8000/health
```

### 로그 확인

#### Docker Compose
```bash
# 모든 서비스 로그
docker compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f factory-core
```

#### Kubernetes
```bash
# Pod 로그 확인
kubectl logs -f deployment/frontend -n v-factory
kubectl logs -f deployment/factory-core -n v-factory

# 특정 Pod 로그
kubectl logs <pod-name> -n v-factory

# 이전 컨테이너 로그 (재시작된 경우)
kubectl logs <pod-name> --previous -n v-factory
```

### 리소스 모니터링

#### Kubernetes
```bash
# Pod 리소스 사용률
kubectl top pods -n v-factory

# Node 리소스 사용률
kubectl top nodes

# 상세 정보 확인
kubectl describe pod <pod-name> -n v-factory
```

---

## 트러블슈팅

### 일반적인 문제

1. **포트 충돌**
   - `docker compose ps`로 사용 중인 포트 확인
   - `docker compose down`으로 기존 컨테이너 정리

2. **이미지 빌드 실패**
   - Dockerfile 경로 확인
   - 빌드 컨텍스트 확인 (`.` 디렉토리에서 실행)

3. **Kubernetes 배포 실패**
   - Pod 이벤트 확인: `kubectl describe pod <pod-name> -n v-factory`
   - 로그 확인: `kubectl logs <pod-name> -n v-factory`
   - Secret/ConfigMap 확인: `kubectl get secrets/configmap -n v-factory`

4. **헬스체크 실패**
   - 서비스가 완전히 시작될 때까지 대기 (초기 지연 시간 확인)
   - 환경변수 및 설정 확인

### 유용한 명령어

```bash
# Docker 리소스 정리
docker system prune -a

# Kubernetes 리소스 삭제
kubectl delete all --all -n v-factory

# 전체 재배포
kubectl delete namespace v-factory
kubectl create namespace v-factory
# 이후 배포 스크립트 재실행
```

---

## 체크리스트

### 배포 전 확인사항
- [ ] 환경변수 설정 완료 (.env.production 또는 ConfigMap)
- [ ] Secret 값 설정 완료
- [ ] Docker 이미지 빌드 성공
- [ ] 로컬 테스트 통과
- [ ] Kubernetes 매니페스트 이미지 경로 확인
- [ ] Ingress 도메인 설정 확인
- [ ] 헬스체크 엔드포인트 동작 확인

### 배포 후 확인사항
- [ ] 모든 Pod가 Running 상태
- [ ] 헬스체크 통과
- [ ] 서비스 간 통신 확인
- [ ] 로그에 에러 없음
- [ ] 리소스 사용률 정상 범위

---

## 참고 문서

- [모니터링 가이드](MONITORING.md)
- [개발 로드맵](DEVELOPMENT_ROADMAP.md)
- [Docker 개발 가이드](DOCKER_DEV_GUIDE.md)

---

**최종 수정일:** 2026-01-14
