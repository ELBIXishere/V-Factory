# V-Factory Frontend 프로덕션용 Dockerfile
# 멀티스테이지 빌드로 Next.js 프로덕션 이미지 생성

# ============================================
# Stage 1: 빌드 스테이지
# ============================================
FROM node:20-alpine AS builder

# 빌드 시점 환경변수 (ARG로 받아서 빌드에 사용)
ARG NEXT_PUBLIC_API_URL=http://localhost:8001
ARG NEXT_PUBLIC_INCIDENT_API_URL=http://localhost:8002
ARG NEXT_PUBLIC_ASSET_API_URL=http://localhost:8003

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치
RUN apk add --no-cache libc6-compat

# package.json 및 package-lock.json 복사 (캐싱 최적화)
COPY frontend/package*.json ./

# 의존성 설치
RUN npm ci --only=production=false

# 소스 코드 복사
COPY frontend/ ./

# 환경변수 설정 (Next.js 빌드 시점에 주입)
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_INCIDENT_API_URL=${NEXT_PUBLIC_INCIDENT_API_URL}
ENV NEXT_PUBLIC_ASSET_API_URL=${NEXT_PUBLIC_ASSET_API_URL}

# Next.js 빌드 실행
RUN npm run build

# ============================================
# Stage 2: 프로덕션 런타임 스테이지
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# 프로덕션 환경 변수 설정
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 시스템 사용자 생성 (보안 강화)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 빌드 스테이지에서 필요한 파일들 복사
# Next.js 프로덕션 실행에 필요한 모든 파일 복사
# 빌드 스테이지에서 frontend/를 /app에 복사했으므로 모든 파일이 /app에 있음
# 먼저 필수 파일 복사
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/postcss.config.mjs ./postcss.config.mjs
# 빌드 결과물 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# 소스 코드 디렉토리 복사 (런타임에 필요 - Next.js가 app 디렉토리를 찾음)
COPY --from=builder --chown=nextjs:nodejs /app/app ./app
COPY --from=builder --chown=nextjs:nodejs /app/components ./components
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/shaders ./shaders
# 의존성 복사
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# 사용자 전환
USER nextjs

# 포트 노출
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 프로덕션 서버 실행
CMD ["npm", "start"]
