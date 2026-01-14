"""
V-Factory - Factory ORM 모델
공장 엔티티 정의
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from database import Base


class Factory(Base):
    """공장 테이블 ORM 모델"""
    
    __tablename__ = "factories"
    
    # 기본 필드
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # 레이아웃 정보 (JSON)
    layout_json = Column(JSONB, default={})
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    cctv_configs = relationship("CCTVConfig", back_populates="factory", cascade="all, delete-orphan")
    equipment = relationship("Equipment", back_populates="factory", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Factory(id={self.id}, name={self.name})>"
