"""
V-Factory - CCTV Config Pydantic 스키마
요청/응답 데이터 유효성 검사
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CCTVConfigBase(BaseModel):
    """CCTV 설정 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=100, description="CCTV 이름")
    position_x: float = Field(..., description="X 좌표")
    position_y: float = Field(..., description="Y 좌표")
    position_z: float = Field(..., description="Z 좌표")
    rotation_x: float = Field(default=0, description="X축 회전")
    rotation_y: float = Field(default=0, description="Y축 회전")
    rotation_z: float = Field(default=0, description="Z축 회전")
    fov: float = Field(default=75.0, ge=30, le=120, description="화각 (30-120)")


class CCTVConfigCreate(CCTVConfigBase):
    """CCTV 설정 생성 요청 스키마"""
    factory_id: UUID = Field(..., description="공장 ID")


class CCTVConfigUpdate(BaseModel):
    """CCTV 설정 수정 요청 스키마"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="CCTV 이름")
    position_x: Optional[float] = Field(None, description="X 좌표")
    position_y: Optional[float] = Field(None, description="Y 좌표")
    position_z: Optional[float] = Field(None, description="Z 좌표")
    rotation_x: Optional[float] = Field(None, description="X축 회전")
    rotation_y: Optional[float] = Field(None, description="Y축 회전")
    rotation_z: Optional[float] = Field(None, description="Z축 회전")
    fov: Optional[float] = Field(None, ge=30, le=120, description="화각 (30-120)")
    is_active: Optional[bool] = Field(None, description="활성화 여부")


class CCTVConfigResponse(CCTVConfigBase):
    """CCTV 설정 응답 스키마"""
    id: UUID
    factory_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
