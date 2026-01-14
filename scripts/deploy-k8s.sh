#!/bin/bash
# V-Factory Kubernetes 전체 배포 스크립트
# 사용법: ./scripts/deploy-k8s.sh

set -e

echo "=========================================="
echo "V-Factory Kubernetes 배포 시작"
echo "=========================================="
echo ""

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# kubectl 설치 확인
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl이 설치되어 있지 않습니다.${NC}"
    exit 1
fi

# 클러스터 연결 확인
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Kubernetes 클러스터에 연결할 수 없습니다.${NC}"
    echo -e "${YELLOW}클러스터가 실행 중인지 확인하세요:${NC}"
    echo "  - Minikube: minikube start"
    echo "  - Docker Desktop: Kubernetes 활성화 확인"
    echo "  - 클라우드: kubeconfig 설정 확인"
    exit 1
fi

echo -e "${GREEN}✅ Kubernetes 클러스터 연결 확인${NC}"
echo ""

# 1. 네임스페이스 및 기본 리소스 생성
echo -e "${YELLOW}[1/5] 네임스페이스 및 기본 리소스 생성...${NC}"
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml

# Secret 파일 확인
if [ ! -f "k8s/secrets.yaml" ]; then
    echo -e "${YELLOW}⚠️  k8s/secrets.yaml 파일이 없습니다.${NC}"
    echo -e "${YELLOW}   k8s/secrets.yaml.template을 복사하여 secrets.yaml을 생성하고 실제 값을 입력하세요.${NC}"
    exit 1
fi

kubectl apply -f k8s/secrets.yaml
echo -e "${GREEN}✅ 네임스페이스 및 기본 리소스 생성 완료${NC}"
echo ""

# 2. 데이터베이스 배포
echo -e "${YELLOW}[2/5] 데이터베이스 배포...${NC}"
kubectl apply -f k8s/deployments/postgres-deployment.yaml
kubectl apply -f k8s/deployments/redis-deployment.yaml
kubectl apply -f k8s/services/postgres-service.yaml
kubectl apply -f k8s/services/redis-service.yaml

echo -e "${GREEN}✅ 데이터베이스 배포 완료${NC}"
echo -e "${YELLOW}   데이터베이스가 준비될 때까지 대기 중...${NC}"
kubectl wait --for=condition=ready pod -l app=postgres -n v-factory --timeout=300s || true
kubectl wait --for=condition=ready pod -l app=redis -n v-factory --timeout=300s || true
echo ""

# 3. 백엔드 서비스 배포
echo -e "${YELLOW}[3/5] 백엔드 서비스 배포...${NC}"
kubectl apply -f k8s/deployments/factory-core-deployment.yaml
kubectl apply -f k8s/deployments/incident-event-deployment.yaml
kubectl apply -f k8s/deployments/asset-management-deployment.yaml
kubectl apply -f k8s/services/backend-services.yaml

echo -e "${GREEN}✅ 백엔드 서비스 배포 완료${NC}"
echo ""

# 4. 프론트엔드 배포
echo -e "${YELLOW}[4/5] 프론트엔드 배포...${NC}"
kubectl apply -f k8s/deployments/frontend-deployment.yaml
kubectl apply -f k8s/services/frontend-service.yaml

echo -e "${GREEN}✅ 프론트엔드 배포 완료${NC}"
echo ""

# 5. Ingress 설정 (선택사항)
echo -e "${YELLOW}[5/5] Ingress 설정...${NC}"
if kubectl get ingressclass &> /dev/null; then
    kubectl apply -f k8s/ingress.yaml
    echo -e "${GREEN}✅ Ingress 설정 완료${NC}"
else
    echo -e "${YELLOW}⚠️  Ingress Controller가 설치되어 있지 않습니다.${NC}"
    echo -e "${YELLOW}   Ingress 설정을 건너뜁니다.${NC}"
fi
echo ""

# 배포 상태 확인
echo -e "${GREEN}=========================================="
echo "✅ 배포 완료!"
echo "==========================================${NC}"
echo ""
echo "배포 상태 확인:"
kubectl get all -n v-factory
echo ""
echo "Pod 상태 확인:"
kubectl get pods -n v-factory
echo ""
echo "서비스 상태 확인:"
kubectl get svc -n v-factory
echo ""
echo -e "${YELLOW}배포가 완료되었습니다. Pod가 모두 Running 상태가 될 때까지 기다려주세요.${NC}"
