"""
V-Factory - Equipment Pydantic 스키마
요청/응답 데이터 유효성 검사
"""
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class EquipmentTypeEnum(str, Enum):
    """설비 유형 열거형"""
    CONVEYOR_BELT = "CONVEYOR_BELT"
    ROBOT_ARM = "ROBOT_ARM"
    PRESS_MACHINE = "PRESS_MACHINE"
    CNC_MACHINE = "CNC_MACHINE"
    PACKAGING_MACHINE = "PACKAGING_MACHINE"
    FORKLIFT = "FORKLIFT"
    CRANE = "CRANE"
    TANK = "TANK"
    GENERATOR = "GENERATOR"
    CONTROL_PANEL = "CONTROL_PANEL"
    OTHER = "OTHER"


class EquipmentStatusEnum(str, Enum):
    """설비 상태 열거형"""
    RUNNING = "RUNNING"
    IDLE = "IDLE"
    MAINTENANCE = "MAINTENANCE"
    ERROR = "ERROR"
    OFFLINE = "OFFLINE"


class EquipmentBase(BaseModel):
    """설비 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=255, description="설비 이름")
    description: Optional[str] = Field(None, description="설비 설명")
    type: EquipmentTypeEnum = Field(..., description="설비 유형")
    
    # 위치 정보
    position_x: float = Field(default=0, description="X 좌표")
    position_y: float = Field(default=0, description="Y 좌표")
    position_z: float = Field(default=0, description="Z 좌표")
    
    # 회전 정보
    rotation_x: float = Field(default=0, description="X축 회전")
    rotation_y: float = Field(default=0, description="Y축 회전")
    rotation_z: float = Field(default=0, description="Z축 회전")
    
    # 크기 정보
    scale_x: float = Field(default=1, ge=0.01, description="X 스케일")
    scale_y: float = Field(default=1, ge=0.01, description="Y 스케일")
    scale_z: float = Field(default=1, ge=0.01, description="Z 스케일")


class EquipmentCreate(EquipmentBase):
    """설비 생성 요청 스키마"""
    factory_id: UUID = Field(..., description="공장 ID")
    asset_id: Optional[UUID] = Field(None, description="3D 에셋 ID")
    properties: Optional[Dict[str, Any]] = Field(default={}, description="설비 속성")


class EquipmentUpdate(BaseModel):
    """설비 수정 요청 스키마"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="설비 이름")
    description: Optional[str] = Field(None, description="설비 설명")
    status: Optional[EquipmentStatusEnum] = Field(None, description="설비 상태")
    
    # 위치 정보
    position_x: Optional[float] = Field(None, description="X 좌표")
    position_y: Optional[float] = Field(None, description="Y 좌표")
    position_z: Optional[float] = Field(None, description="Z 좌표")
    
    # 회전 정보
    rotation_x: Optional[float] = Field(None, description="X축 회전")
    rotation_y: Optional[float] = Field(None, description="Y축 회전")
    rotation_z: Optional[float] = Field(None, description="Z축 회전")
    
    # 크기 정보
    scale_x: Optional[float] = Field(None, ge=0.01, description="X 스케일")
    scale_y: Optional[float] = Field(None, ge=0.01, description="Y 스케일")
    scale_z: Optional[float] = Field(None, ge=0.01, description="Z 스케일")
    
    # 에셋 및 속성
    asset_id: Optional[UUID] = Field(None, description="3D 에셋 ID")
    properties: Optional[Dict[str, Any]] = Field(None, description="설비 속성")
    is_active: Optional[bool] = Field(None, description="활성화 여부")


class EquipmentResponse(EquipmentBase):
    """설비 응답 스키마"""
    id: UUID
    factory_id: UUID
    status: EquipmentStatusEnum
    asset_id: Optional[UUID]
    properties: Dict[str, Any]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
