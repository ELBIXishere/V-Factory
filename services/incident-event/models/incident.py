"""
V-Factory - Incident ORM 모델
사고 기록 엔티티 정의
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class IncidentType(str, enum.Enum):
    """사고 유형 열거형"""
    ENTANGLEMENT = "ENTANGLEMENT"    # 끼임
    FALL = "FALL"                    # 전도/넘어짐
    COLLISION = "COLLISION"          # 충돌
    FIRE = "FIRE"                    # 화재
    ELECTRIC_SHOCK = "ELECTRIC_SHOCK"  # 감전
    OTHER = "OTHER"                  # 기타


class Incident(Base):
    """사고 기록 테이블 ORM 모델"""
    
    __tablename__ = "incidents"
    
    # 기본 필드
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id = Column(UUID(as_uuid=True), nullable=False)
    
    # 사고 정보
    type = Column(Enum(IncidentType, name="incident_type"), nullable=False)
    severity = Column(Integer, nullable=False)  # 1-5 (심각도)
    description = Column(Text, nullable=True)
    
    # 위치 정보 (3D 좌표)
    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)
    position_z = Column(Float, nullable=False)
    
    # NPC 정보 (선택적)
    npc_id = Column(UUID(as_uuid=True), nullable=True)
    
    # 상태
    is_resolved = Column(Boolean, default=False)
    
    # 타임스탬프
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<Incident(id={self.id}, type={self.type}, severity={self.severity})>"
