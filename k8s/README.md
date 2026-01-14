# V-Factory Kubernetes 배포 가이드

## 사전 요구사항

1. **Kubernetes 클러스터**
   - Minikube, Docker Desktop Kubernetes, 또는 클라우드 환경 (GKE, EKS, AKS 등)
   - 클러스터에 접근 가능한 `kubectl` 설정

2. **Docker 이미지**
   - 로컬에 빌드된 이미지 또는 Docker Hub에 푸시된 이미지
   - 이미지 태그가 Deployment 파일의 이미지 경로와 일치해야 함

## 빠른 시작

### 1. Secret 파일 생성

```bash
# 템플릿 복사
cp k8s/secrets.yaml.template k8s/secrets.yaml

# secrets.yaml 파일 편집하여 실제 값 입력
# 특히 POSTGRES_PASSWORD는 반드시 변경하세요
```

### 2. 배포 스크립트 실행

**Linux/Mac:**
```bash
chmod +x scripts/deploy-k8s.sh
./scripts/deploy-k8s.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\deploy-k8s.ps1
```

### 3. 수동 배포 (스크립트 사용 불가 시)

```bash
# 1. 네임스페이스 및 기본 리소스
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# 2. 데이터베이스
kubectl apply -f k8s/deployments/postgres-deployment.yaml
kubectl apply -f k8s/deployments/redis-deployment.yaml
kubectl apply -f k8s/services/postgres-service.yaml
kubectl apply -f k8s/services/redis-service.yaml

# 3. 백엔드 서비스
kubectl apply -f k8s/deployments/factory-core-deployment.yaml
kubectl apply -f k8s/deployments/incident-event-deployment.yaml
kubectl apply -f k8s/deployments/asset-management-deployment.yaml
kubectl apply -f k8s/services/backend-services.yaml

# 4. 프론트엔드
kubectl apply -f k8s/deployments/frontend-deployment.yaml
kubectl apply -f k8s/services/frontend-service.yaml

# 5. Ingress (선택사항)
kubectl apply -f k8s/ingress.yaml
```

## 배포 확인

```bash
# 모든 리소스 확인
kubectl get all -n v-factory

# Pod 상태 확인
kubectl get pods -n v-factory

# 서비스 확인
kubectl get svc -n v-factory

# 로그 확인
kubectl logs -f deployment/frontend -n v-factory
kubectl logs -f deployment/factory-core -n v-factory
```

## 이미지 경로 수정

Deployment 파일에서 이미지 경로를 실제 이미지 위치로 변경해야 합니다:

- `v-factory-frontend:latest` → `your-registry/v-factory-frontend:tag`
- `v-factory-factory-core:latest` → `your-registry/v-factory-factory-core:tag`
- `v-factory-incident-event:latest` → `your-registry/v-factory-incident-event:tag`
- `v-factory-asset-management:latest` → `your-registry/v-factory-asset-management:tag`

## 리소스 요구사항

### 최소 요구사항
- **노드**: 2개 이상 (고가용성)
- **CPU**: 4 cores 이상
- **메모리**: 8GB 이상
- **스토리지**: 65Gi 이상 (PostgreSQL 10Gi + Redis 5Gi + Assets 50Gi)

### 권장 사양
- **노드**: 3개 이상
- **CPU**: 8 cores 이상
- **메모리**: 16GB 이상
- **스토리지**: 100Gi 이상

## 트러블슈팅

### Pod가 시작되지 않는 경우

```bash
# Pod 이벤트 확인
kubectl describe pod <pod-name> -n v-factory

# Pod 로그 확인
kubectl logs <pod-name> -n v-factory

# 이전 컨테이너 로그 (재시작된 경우)
kubectl logs <pod-name> --previous -n v-factory
```

### 이미지를 찾을 수 없는 경우

```bash
# 이미지 Pull 정책 확인
# Deployment 파일에서 imagePullPolicy: IfNotPresent 확인

# 로컬 이미지를 Minikube에 로드 (Minikube 사용 시)
minikube image load v-factory-frontend:latest
minikube image load v-factory-factory-core:latest
minikube image load v-factory-incident-event:latest
minikube image load v-factory-asset-management:latest
```

### 데이터베이스 연결 실패

```bash
# PostgreSQL Pod 상태 확인
kubectl get pods -l app=postgres -n v-factory

# PostgreSQL 로그 확인
kubectl logs -l app=postgres -n v-factory

# Secret 확인 (비밀번호 확인)
kubectl get secret v-factory-secrets -n v-factory -o yaml
```

## 리소스 삭제

```bash
# 전체 네임스페이스 삭제 (모든 리소스 포함)
kubectl delete namespace v-factory

# 또는 개별 리소스 삭제
kubectl delete -f k8s/deployments/
kubectl delete -f k8s/services/
kubectl delete -f k8s/ingress.yaml
kubectl delete -f k8s/configmap.yaml
kubectl delete -f k8s/secrets.yaml
kubectl delete -f k8s/namespace.yaml
```

## 참고

- [Kubernetes 공식 문서](https://kubernetes.io/docs/)
- [TEST_AND_DEPLOYMENT.md](../docs/TEST_AND_DEPLOYMENT.md)
