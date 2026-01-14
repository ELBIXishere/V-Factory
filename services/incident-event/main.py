"""
V-Factory - Incident Event Service
사고 트리거 및 실시간 알림 마이크로서비스
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import engine, Base
from routers import incident_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 생명주기 관리"""
    # 시작 시: 데이터베이스 테이블 생성 (개발 환경)
    if settings.DEBUG:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # 종료 시: 리소스 정리
    await engine.dispose()


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
    """헬스체크 엔드포인트"""
    return {"status": "healthy"}
