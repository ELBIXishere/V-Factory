# V-Factory Backend 프로덕션용 Dockerfile (공통)
# 멀티스테이지 빌드로 FastAPI 프로덕션 이미지 생성
# 서비스 이름을 빌드 인자로 받아 서비스별 빌드 지원

# ============================================
# Stage 1: 의존성 설치 스테이지
# ============================================
FROM python:3.12-slim AS deps

# 서비스 이름을 빌드 인자로 받음 (FROM 이후에 선언)
ARG SERVICE_NAME=factory-core

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치 (필수만 설치)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# pip 업그레이드
RUN pip install --no-cache-dir --upgrade pip

# requirements.txt 복사 및 의존성 설치
COPY services/${SERVICE_NAME}/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --user -r requirements.txt

# ============================================
# Stage 2: 프로덕션 런타임 스테이지
# ============================================
FROM python:3.12-slim AS runner

# 서비스 이름 인자 재선언
ARG SERVICE_NAME=factory-core

WORKDIR /app

# 프로덕션 환경 변수 설정
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONHASHSEED=random
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# 시스템 사용자 생성 (보안 강화)
RUN groupadd -r appuser && useradd -r -g appuser appuser

# 의존성 스테이지에서 설치된 패키지 복사
COPY --from=deps /root/.local /home/appuser/.local

# 소스 코드 복사
COPY services/${SERVICE_NAME}/ ./services/${SERVICE_NAME}/

# 작업 디렉토리를 서비스 디렉토리로 변경
WORKDIR /app/services/${SERVICE_NAME}

# 사용자 전환
USER appuser

# PATH에 사용자 로컬 bin 추가
ENV PATH=/home/appuser/.local/bin:$PATH

# 포트 노출
EXPOSE 8000

# 프로덕션 서버 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
