"""
V-Factory - Asset Management Service 설정
환경 변수 기반 설정 관리
"""
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
    
    # 파일 업로드 설정
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: List[str] = [".glb", ".gltf", ".png", ".jpg", ".jpeg", ".hdr"]
    
    # CORS 설정
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# 전역 설정 인스턴스
settings = Settings()
