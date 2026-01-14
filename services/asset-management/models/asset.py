"""
V-Factory - Asset ORM 모델
에셋 파일 메타데이터 엔티티 정의
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, BigInteger, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB

from database import Base


class Asset(Base):
    """에셋 테이블 ORM 모델"""
    
    __tablename__ = "assets"
    
    # 기본 필드
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    
    # 파일 정보
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # glb, gltf, png, jpg 등
    file_size = Column(BigInteger, nullable=False)  # 바이트 단위
    
    # 메타데이터 (JSON) - 'metadata'는 SQLAlchemy 예약어이므로 'asset_metadata' 사용
    asset_metadata = Column(JSONB, default={})
    
    # 썸네일
    thumbnail_path = Column(String(500), nullable=True)
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Asset(id={self.id}, name={self.name}, type={self.file_type})>"
