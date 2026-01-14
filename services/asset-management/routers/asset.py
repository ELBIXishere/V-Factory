"""
V-Factory - Asset API 라우터
에셋 업로드/다운로드 및 메타데이터 관리 엔드포인트
"""
import os
import uuid
from pathlib import Path
from typing import List

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models import Asset
from schemas import AssetUpdate, AssetResponse
from services.file_service import FileService


router = APIRouter()


@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def upload_asset(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    에셋 업로드 API
    파일을 저장하고 메타데이터를 데이터베이스에 기록
    """
    # 파일 확장자 검증
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"허용되지 않는 파일 형식입니다. 허용: {settings.ALLOWED_EXTENSIONS}"
        )
    
    # 파일 크기 검증
    file_service = FileService()
    file_size = await file_service.get_file_size(file)
    
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"파일 크기가 너무 큽니다. 최대: {settings.MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # 고유 파일명 생성 및 저장
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = await file_service.save_file(file, unique_filename)
    
    # GLB/GLTF 파일인 경우 기본 메타데이터 추출 시도
    asset_metadata = {}
    if file_ext in [".glb", ".gltf"]:
        asset_metadata = await file_service.extract_gltf_metadata(file_path)
    
    # 데이터베이스에 저장
    asset = Asset(
        name=Path(file.filename).stem,  # 확장자 제외한 파일명
        file_path=file_path,
        file_type=file_ext.lstrip("."),
        file_size=file_size,
        asset_metadata=asset_metadata,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    
    return asset


@router.get("/", response_model=List[AssetResponse])
async def get_assets(
    file_type: str = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """에셋 목록 조회 API"""
    query = select(Asset)
    
    if file_type:
        query = query.where(Asset.file_type == file_type)
    
    query = query.order_by(Asset.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """에셋 메타데이터 조회 API"""
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id)
    )
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="에셋을 찾을 수 없습니다."
        )
    
    return asset


@router.get("/{asset_id}/download")
async def download_asset(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """에셋 파일 다운로드 API"""
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id)
    )
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="에셋을 찾을 수 없습니다."
        )
    
    file_path = Path(settings.UPLOAD_DIR) / asset.file_path
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="파일을 찾을 수 없습니다."
        )
    
    return FileResponse(
        path=file_path,
        filename=f"{asset.name}.{asset.file_type}",
        media_type="application/octet-stream"
    )


@router.get("/{asset_id}/metadata", response_model=dict)
async def get_asset_metadata(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """에셋 상세 메타데이터 조회 API"""
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id)
    )
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="에셋을 찾을 수 없습니다."
        )
    
    return asset.asset_metadata


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: uuid.UUID,
    asset_data: AssetUpdate,
    db: AsyncSession = Depends(get_db)
):
    """에셋 메타데이터 수정 API"""
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id)
    )
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="에셋을 찾을 수 없습니다."
        )
    
    update_data = asset_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(asset, field, value)
    
    await db.commit()
    await db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """에셋 삭제 API (파일 포함)"""
    result = await db.execute(
        select(Asset).where(Asset.id == asset_id)
    )
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="에셋을 찾을 수 없습니다."
        )
    
    # 파일 삭제
    file_path = Path(settings.UPLOAD_DIR) / asset.file_path
    if file_path.exists():
        os.remove(file_path)
    
    # 썸네일 삭제 (있는 경우)
    if asset.thumbnail_path:
        thumbnail_path = Path(settings.UPLOAD_DIR) / asset.thumbnail_path
        if thumbnail_path.exists():
            os.remove(thumbnail_path)
    
    # 데이터베이스에서 삭제
    await db.delete(asset)
    await db.commit()
