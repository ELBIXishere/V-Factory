"""
V-Factory - Factory Pydantic 스키마
요청/응답 데이터 유효성 검사
"""
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class FactoryBase(BaseModel):
    """공장 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=255, description="공장 이름")
    description: Optional[str] = Field(None, description="공장 설명")


class FactoryCreate(FactoryBase):
    """공장 생성 요청 스키마"""
    layout_json: Optional[Dict[str, Any]] = Field(default={}, description="레이아웃 JSON")


class FactoryUpdate(BaseModel):
    """공장 수정 요청 스키마"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="공장 이름")
    description: Optional[str] = Field(None, description="공장 설명")


class FactoryLayoutUpdate(BaseModel):
    """공장 레이아웃 수정 요청 스키마"""
    layout_json: Dict[str, Any] = Field(..., description="레이아웃 JSON")


class FactoryResponse(FactoryBase):
    """공장 응답 스키마"""
    id: UUID
    layout_json: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
