"""
V-Factory - Incident Pydantic 스키마
요청/응답 데이터 유효성 검사
"""
from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class IncidentTypeEnum(str, Enum):
    """사고 유형 열거형"""
    ENTANGLEMENT = "ENTANGLEMENT"
    FALL = "FALL"
    COLLISION = "COLLISION"
    FIRE = "FIRE"
    ELECTRIC_SHOCK = "ELECTRIC_SHOCK"
    OTHER = "OTHER"


class IncidentBase(BaseModel):
    """사고 기본 스키마"""
    type: IncidentTypeEnum = Field(..., description="사고 유형")
    severity: int = Field(..., ge=1, le=5, description="심각도 (1-5)")
    description: Optional[str] = Field(None, description="사고 설명")
    position_x: float = Field(..., description="X 좌표")
    position_y: float = Field(..., description="Y 좌표")
    position_z: float = Field(..., description="Z 좌표")
    npc_id: Optional[UUID] = Field(None, description="NPC ID (선택적)")


class IncidentCreate(IncidentBase):
    """사고 생성 요청 스키마"""
    factory_id: UUID = Field(..., description="공장 ID")


class IncidentUpdate(BaseModel):
    """사고 수정 요청 스키마"""
    description: Optional[str] = Field(None, description="사고 설명")
    is_resolved: Optional[bool] = Field(None, description="해결 여부")


class IncidentResponse(IncidentBase):
    """사고 응답 스키마"""
    id: UUID
    factory_id: UUID
    is_resolved: bool
    timestamp: datetime
    resolved_at: Optional[datetime]
    detected_cctv_ids: Optional[list[UUID]] = Field(None, description="감지된 CCTV ID 목록")
    
    class Config:
        from_attributes = True
