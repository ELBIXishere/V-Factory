"""
V-Factory - Equipment ORM 모델
공장 설비 엔티티 정의
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from database import Base


class EquipmentType(str, enum.Enum):
    """설비 유형 열거형"""
    CONVEYOR_BELT = "CONVEYOR_BELT"          # 컨베이어 벨트
    ROBOT_ARM = "ROBOT_ARM"                  # 로봇 팔
    PRESS_MACHINE = "PRESS_MACHINE"          # 프레스 기계
    CNC_MACHINE = "CNC_MACHINE"              # CNC 기계
    PACKAGING_MACHINE = "PACKAGING_MACHINE"  # 포장 기계
    FORKLIFT = "FORKLIFT"                    # 지게차
    CRANE = "CRANE"                          # 크레인
    TANK = "TANK"                            # 탱크/저장고
    GENERATOR = "GENERATOR"                  # 발전기
    CONTROL_PANEL = "CONTROL_PANEL"          # 제어 패널
    OTHER = "OTHER"                          # 기타


class EquipmentStatus(str, enum.Enum):
    """설비 상태 열거형"""
    RUNNING = "RUNNING"        # 가동 중
    IDLE = "IDLE"              # 대기 중
    MAINTENANCE = "MAINTENANCE"  # 점검 중
    ERROR = "ERROR"            # 오류
    OFFLINE = "OFFLINE"        # 오프라인


class Equipment(Base):
    """설비 테이블 ORM 모델"""
    
    __tablename__ = "equipment"
    
    # 기본 필드
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factory_id = Column(UUID(as_uuid=True), ForeignKey("factories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # 설비 유형 및 상태
    type = Column(Enum(EquipmentType, name="equipment_type"), nullable=False)
    status = Column(Enum(EquipmentStatus, name="equipment_status"), default=EquipmentStatus.IDLE)
    
    # 위치 정보 (3D 좌표)
    position_x = Column(Float, nullable=False, default=0)
    position_y = Column(Float, nullable=False, default=0)
    position_z = Column(Float, nullable=False, default=0)
    
    # 회전 정보 (Euler 각도)
    rotation_x = Column(Float, default=0)
    rotation_y = Column(Float, default=0)
    rotation_z = Column(Float, default=0)
    
    # 크기 정보
    scale_x = Column(Float, default=1)
    scale_y = Column(Float, default=1)
    scale_z = Column(Float, default=1)
    
    # 3D 모델 에셋 ID (Asset Management Service 연동)
    asset_id = Column(UUID(as_uuid=True), nullable=True)
    
    # 설비 속성 (JSON) - 컨베이어 속도, 로봇 팔 각도 등
    properties = Column(JSONB, default={})
    
    # 활성화 여부
    is_active = Column(Boolean, default=True)
    
    # 타임스탬프
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    factory = relationship("Factory", back_populates="equipment")
    
    def __repr__(self):
        return f"<Equipment(id={self.id}, name={self.name}, type={self.type})>"
