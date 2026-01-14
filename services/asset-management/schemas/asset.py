"""
V-Factory - Asset Pydantic 스키마
요청/응답 데이터 유효성 검사
"""
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class AssetMetadata(BaseModel):
    """에셋 메타데이터 스키마"""
    # GLB/GLTF 메타데이터
    vertex_count: Optional[int] = Field(None, description="버텍스 수")
    face_count: Optional[int] = Field(None, description="면 수")
    material_count: Optional[int] = Field(None, description="머티리얼 수")
    animation_count: Optional[int] = Field(None, description="애니메이션 수")
    
    # 추가 메타데이터
    author: Optional[str] = Field(None, description="제작자")
    description: Optional[str] = Field(None, description="설명")
    tags: Optional[list[str]] = Field(default=[], description="태그")


class AssetBase(BaseModel):
    """에셋 기본 스키마"""
    name: str = Field(..., min_length=1, max_length=255, description="에셋 이름")


class AssetCreate(AssetBase):
    """에셋 생성 요청 스키마 (파일 업로드 후 사용)"""
    file_path: str = Field(..., description="파일 경로")
    file_type: str = Field(..., description="파일 타입")
    file_size: int = Field(..., ge=0, description="파일 크기 (바이트)")
    asset_metadata: Optional[Dict[str, Any]] = Field(default={}, description="메타데이터")
    thumbnail_path: Optional[str] = Field(None, description="썸네일 경로")


class AssetUpdate(BaseModel):
    """에셋 수정 요청 스키마"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="에셋 이름")
    asset_metadata: Optional[Dict[str, Any]] = Field(None, description="메타데이터")


class AssetResponse(AssetBase):
    """에셋 응답 스키마"""
    id: UUID
    file_path: str
    file_type: str
    file_size: int
    asset_metadata: Dict[str, Any]
    thumbnail_path: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
