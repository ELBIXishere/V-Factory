#!/bin/bash
# V-Factory Docker 이미지 빌드 스크립트
# 로컬에서 프로덕션용 Docker 이미지를 빌드합니다.

set -e

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 이미지 태그 (기본값: latest)
TAG=${1:-latest}

echo -e "${GREEN}V-Factory Docker 이미지 빌드 시작${NC}"
echo -e "태그: ${YELLOW}${TAG}${NC}"
echo ""

# Frontend 이미지 빌드
echo -e "${GREEN}[1/4] Frontend 이미지 빌드 중...${NC}"
docker build \
  -f docker/prod/frontend.Dockerfile \
  -t v-factory-frontend:${TAG} \
  .

# Factory Core 이미지 빌드
echo -e "${GREEN}[2/4] Factory Core 이미지 빌드 중...${NC}"
docker build \
  -f docker/prod/backend.Dockerfile \
  --build-arg SERVICE_NAME=factory-core \
  -t v-factory-factory-core:${TAG} \
  .

# Incident Event 이미지 빌드
echo -e "${GREEN}[3/4] Incident Event 이미지 빌드 중...${NC}"
docker build \
  -f docker/prod/backend.Dockerfile \
  --build-arg SERVICE_NAME=incident-event \
  -t v-factory-incident-event:${TAG} \
  .

# Asset Management 이미지 빌드
echo -e "${GREEN}[4/4] Asset Management 이미지 빌드 중...${NC}"
docker build \
  -f docker/prod/backend.Dockerfile \
  --build-arg SERVICE_NAME=asset-management \
  -t v-factory-asset-management:${TAG} \
  .

echo ""
echo -e "${GREEN}✅ 모든 이미지 빌드 완료!${NC}"
echo ""
echo "빌드된 이미지:"
docker images | grep v-factory
