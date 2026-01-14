# V-Factory Kubernetes 전체 배포 스크립트 (PowerShell)
# 사용법: .\scripts\deploy-k8s.ps1

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "V-Factory Kubernetes 배포 시작" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# kubectl 설치 확인
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "❌ kubectl이 설치되어 있지 않습니다." -ForegroundColor Red
    exit 1
}

# 클러스터 연결 확인
try {
    kubectl cluster-info | Out-Null
    Write-Host "✅ Kubernetes 클러스터 연결 확인" -ForegroundColor Green
} catch {
    Write-Host "❌ Kubernetes 클러스터에 연결할 수 없습니다." -ForegroundColor Red
    Write-Host "클러스터가 실행 중인지 확인하세요:" -ForegroundColor Yellow
    Write-Host "  - Minikube: minikube start" -ForegroundColor Yellow
    Write-Host "  - Docker Desktop: Kubernetes 활성화 확인" -ForegroundColor Yellow
    Write-Host "  - 클라우드: kubeconfig 설정 확인" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 1. 네임스페이스 및 기본 리소스 생성
Write-Host "[1/5] 네임스페이스 및 기본 리소스 생성..." -ForegroundColor Yellow
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml

# Secret 파일 확인
if (-not (Test-Path "k8s/secrets.yaml")) {
    Write-Host "⚠️  k8s/secrets.yaml 파일이 없습니다." -ForegroundColor Yellow
    Write-Host "   k8s/secrets.yaml.template을 복사하여 secrets.yaml을 생성하고 실제 값을 입력하세요." -ForegroundColor Yellow
    exit 1
}

kubectl apply -f k8s/secrets.yaml
Write-Host "✅ 네임스페이스 및 기본 리소스 생성 완료" -ForegroundColor Green
Write-Host ""

# 2. 데이터베이스 배포
Write-Host "[2/5] 데이터베이스 배포..." -ForegroundColor Yellow
kubectl apply -f k8s/deployments/postgres-deployment.yaml
kubectl apply -f k8s/deployments/redis-deployment.yaml
kubectl apply -f k8s/services/postgres-service.yaml
kubectl apply -f k8s/services/redis-service.yaml

Write-Host "✅ 데이터베이스 배포 완료" -ForegroundColor Green
Write-Host "   데이터베이스가 준비될 때까지 대기 중..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=postgres -n v-factory --timeout=300s 2>$null
kubectl wait --for=condition=ready pod -l app=redis -n v-factory --timeout=300s 2>$null
Write-Host ""

# 3. 백엔드 서비스 배포
Write-Host "[3/5] 백엔드 서비스 배포..." -ForegroundColor Yellow
kubectl apply -f k8s/deployments/factory-core-deployment.yaml
kubectl apply -f k8s/deployments/incident-event-deployment.yaml
kubectl apply -f k8s/deployments/asset-management-deployment.yaml
kubectl apply -f k8s/services/backend-services.yaml

Write-Host "✅ 백엔드 서비스 배포 완료" -ForegroundColor Green
Write-Host ""

# 4. 프론트엔드 배포
Write-Host "[4/5] 프론트엔드 배포..." -ForegroundColor Yellow
kubectl apply -f k8s/deployments/frontend-deployment.yaml
kubectl apply -f k8s/services/frontend-service.yaml

Write-Host "✅ 프론트엔드 배포 완료" -ForegroundColor Green
Write-Host ""

# 5. Ingress 설정 (선택사항)
Write-Host "[5/5] Ingress 설정..." -ForegroundColor Yellow
try {
    kubectl get ingressclass | Out-Null
    kubectl apply -f k8s/ingress.yaml
    Write-Host "✅ Ingress 설정 완료" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Ingress Controller가 설치되어 있지 않습니다." -ForegroundColor Yellow
    Write-Host "   Ingress 설정을 건너뜁니다." -ForegroundColor Yellow
}
Write-Host ""

# 배포 상태 확인
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ 배포 완료!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "배포 상태 확인:" -ForegroundColor Cyan
kubectl get all -n v-factory
Write-Host ""
Write-Host "Pod 상태 확인:" -ForegroundColor Cyan
kubectl get pods -n v-factory
Write-Host ""
Write-Host "서비스 상태 확인:" -ForegroundColor Cyan
kubectl get svc -n v-factory
Write-Host ""
Write-Host "배포가 완료되었습니다. Pod가 모두 Running 상태가 될 때까지 기다려주세요." -ForegroundColor Yellow
