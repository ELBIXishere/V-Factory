"""
V-Factory - Incident Event Service
사고 트리거 및 실시간 알림 마이크로서비스
"""
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import text

from config import settings
from database import engine, Base
from routers import incident_router
from services.redis_service import RedisService
from utils.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 생명주기 관리"""
    # 시작 시: 데이터베이스 테이블 생성 (개발 환경)
    logger.info("Incident Event Service 시작 중...")
    if settings.DEBUG:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("데이터베이스 테이블 생성 완료")
    
    logger.info("Incident Event Service 시작 완료")
    yield
    
    # 종료 시: 리소스 정리
    logger.info("Incident Event Service 종료 중...")
    await engine.dispose()
    logger.info("Incident Event Service 종료 완료")


# FastAPI 앱 인스턴스 생성
app = FastAPI(
    title="V-Factory - Incident Event Service",
    description="사고 트리거 및 실시간 알림 API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(incident_router, prefix="/incidents", tags=["incidents"])

# Prometheus 메트릭 수집 설정
instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app)


@app.get("/", tags=["health"])
async def root():
    """루트 엔드포인트 - 서비스 정보"""
    return {
        "service": "Incident Event Service",
        "version": "0.1.0",
        "status": "running",
    }


@app.get("/health", tags=["health"])
async def health_check():
    """향상된 헬스체크 엔드포인트 - DB 및 Redis 연결 상태 확인"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    
    # 데이터베이스 연결 상태 확인
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["database"] = "disconnected"
        health_status["database_error"] = str(e)
    
    # Redis 연결 상태 확인
    try:
        redis_service = RedisService()
        client = await redis_service._get_client()
        await client.ping()
        health_status["redis"] = "connected"
        await redis_service.close()
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["redis"] = "disconnected"
        health_status["redis_error"] = str(e)
    
    return health_status
