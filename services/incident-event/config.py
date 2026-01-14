"""
V-Factory - Incident Event Service 설정
환경 변수 기반 설정 관리
"""
import json
import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    # 디버그 모드
    DEBUG: bool = True
    LOG_LEVEL: str = "debug"
    
    # 데이터베이스 설정
    DATABASE_URL: str = "postgresql+asyncpg://vfactory:vfactory_dev_password@localhost:5432/vfactory_db"
    
    # Redis 설정
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CHANNEL: str = "vfactory:incidents"
    
    # Factory Core Service URL (CCTV 매칭용)
    # Docker 컨테이너 내부에서는 서비스 이름 사용, 로컬에서는 localhost 사용
    FACTORY_CORE_URL: str = "http://factory-core:8000"  # Docker 네트워크 내부 주소
    
    # CORS 설정
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3100",  # Docker Compose 프론트엔드 포트
        "http://frontend:3000",   # Docker 네트워크 내부 주소
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 환경 변수에서 CORS_ORIGINS가 JSON 문자열로 전달되는 경우 파싱
        cors_origins_env = os.getenv("CORS_ORIGINS")
        if cors_origins_env:
            try:
                # JSON 배열 형식 파싱
                self.CORS_ORIGINS = json.loads(cors_origins_env)
            except (json.JSONDecodeError, TypeError):
                # 쉼표로 구분된 문자열인 경우
                self.CORS_ORIGINS = [origin.strip() for origin in cors_origins_env.split(",")]


# 전역 설정 인스턴스
settings = Settings()
