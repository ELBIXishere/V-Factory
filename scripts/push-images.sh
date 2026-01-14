#!/bin/bash
# V-Factory Docker 이미지 푸시 스크립트
# Docker Hub에 이미지를 푸시합니다.

set -e

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Docker Hub 사용자명 확인
if [ -z "$DOCKER_HUB_USERNAME" ]; then
  echo -e "${RED}오류: DOCKER_HUB_USERNAME 환경변수가 설정되지 않았습니다.${NC}"
  echo "사용법: DOCKER_HUB_USERNAME=yourusername ./scripts/push-images.sh [tag]"
  exit 1
fi

# 이미지 태그 (기본값: latest)
TAG=${1:-latest}

echo -e "${GREEN}V-Factory Docker 이미지 푸시 시작${NC}"
echo -e "Docker Hub 사용자명: ${YELLOW}${DOCKER_HUB_USERNAME}${NC}"
echo -e "태그: ${YELLOW}${TAG}${NC}"
echo ""

# Docker Hub 로그인 확인
if ! docker info | grep -q "Username"; then
  echo -e "${YELLOW}Docker Hub에 로그인하세요:${NC}"
  docker login
fi

# 이미지 태그 지정 및 푸시
SERVICES=("frontend" "factory-core" "incident-event" "asset-management")

for SERVICE in "${SERVICES[@]}"; do
  IMAGE_NAME="v-factory-${SERVICE}"
  REMOTE_IMAGE="${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${TAG}"
  
  echo -e "${GREEN}[${SERVICE}] 이미지 태그 지정 및 푸시 중...${NC}"
  docker tag ${IMAGE_NAME}:${TAG} ${REMOTE_IMAGE}
  docker push ${REMOTE_IMAGE}
done

echo ""
echo -e "${GREEN}✅ 모든 이미지 푸시 완료!${NC}"
echo ""
echo "푸시된 이미지:"
for SERVICE in "${SERVICES[@]}"; do
  echo "  - ${DOCKER_HUB_USERNAME}/v-factory-${SERVICE}:${TAG}"
done
