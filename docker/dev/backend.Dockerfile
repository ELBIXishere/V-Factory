# V-Factory Backend 개발용 Dockerfile (공통)
# FastAPI + Uvicorn Hot Reload 지원

FROM python:3.12-slim

# 서비스 이름을 빌드 인자로 받음
ARG SERVICE_NAME=factory-core

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# pip 업그레이드
RUN pip install --no-cache-dir --upgrade pip

# requirements.txt 복사 및 의존성 설치 (캐싱 최적화)
COPY services/${SERVICE_NAME}/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드는 볼륨 마운트로 처리 (docker-compose.yml 참조)
# COPY services/${SERVICE_NAME}/ ./

# 개발 서버 포트
EXPOSE 8000

# 환경 변수 설정
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 개발 서버 실행 (Hot Reload 활성화)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
