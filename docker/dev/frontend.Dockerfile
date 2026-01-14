# V-Factory Frontend 개발용 Dockerfile
# Next.js 14 + Hot Reload 지원

FROM node:20-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치
RUN apk add --no-cache libc6-compat

# package.json 복사 (캐싱 최적화)
COPY frontend/package*.json ./

# 의존성 설치 (package-lock.json이 없을 수 있으므로 npm install 사용)
RUN npm install

# 소스 코드는 볼륨 마운트로 처리 (docker-compose.yml 참조)
# COPY frontend/ ./

# 개발 서버 포트
EXPOSE 3000

# 환경 변수 설정
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
# Windows/WSL2 환경에서 파일 감지를 위한 폴링 활성화
ENV WATCHPACK_POLLING=true

# 개발 서버 실행 (Hot Reload 활성화)
CMD ["npm", "run", "dev"]
