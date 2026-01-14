"""
V-Factory - CCTV Config ORM 모델
CCTV 설정 엔티티 정의
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class CCTVConfig(Base):
    """CCTV 설정 테이블 ORM 모델"""
    
    __tablename__ = "cctv_configs"
    
    # 기본 필드
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id = Column(UUID(as_uuid=True), ForeignKey("factories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    
    # 위치 정보 (3D 좌표)
    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)
    position_z = Column(Float, nullable=False)
    
    # 회전 정보 (Euler 각도)
    rotation_x = Column(Float, default=0)
    rotation_y = Column(Float, default=0)
    rotation_z = Column(Float, default=0)
    
    # 카메라 설정
    fov = Column(Float, default=75.0)  # 화각 (Field of View)
    is_active = Column(Boolean, default=True)
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    factory = relationship("Factory", back_populates="cctv_configs")
    
    def __repr__(self):
        return f"<CCTVConfig(id={self.id}, name={self.name})>"
