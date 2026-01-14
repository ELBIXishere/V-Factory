"""
V-Factory - CCTV Config API 라우터
CCTV 설정 CRUD 엔드포인트
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import CCTVConfig, Factory
from schemas import CCTVConfigCreate, CCTVConfigUpdate, CCTVConfigResponse
from services import RedisService, CCTVEventType, cctv_to_dict


router = APIRouter()


@router.post("/", response_model=CCTVConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_cctv_config(
    cctv_data: CCTVConfigCreate,
    db: AsyncSession = Depends(get_db)
):
    """CCTV 설정 생성 API"""
    # 공장 존재 여부 확인
    result = await db.execute(
        select(Factory).where(Factory.id == cctv_data.factory_id)
    )
    factory = result.scalar_one_or_none()
    
    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="공장을 찾을 수 없습니다."
        )
    
    cctv_config = CCTVConfig(**cctv_data.model_dump())
    db.add(cctv_config)
    await db.commit()
    await db.refresh(cctv_config)
    
    # Redis로 CCTV 생성 이벤트 발행
    try:
        redis_service = RedisService()
        await redis_service.publish_cctv_event(
            CCTVEventType.CCTV_CREATED,
            cctv_to_dict(cctv_config)
        )
    except Exception as e:
        print(f"[Redis] CCTV 생성 이벤트 발행 실패: {e}")
    
    return cctv_config


@router.get("/", response_model=List[CCTVConfigResponse])
async def get_cctv_configs(
    factory_id: UUID = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """CCTV 설정 목록 조회 API"""
    query = select(CCTVConfig)
    
    if factory_id:
        query = query.where(CCTVConfig.factory_id == factory_id)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{cctv_id}", response_model=CCTVConfigResponse)
async def get_cctv_config(
    cctv_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """CCTV 설정 상세 조회 API"""
    result = await db.execute(
        select(CCTVConfig).where(CCTVConfig.id == cctv_id)
    )
    cctv_config = result.scalar_one_or_none()
    
    if not cctv_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CCTV 설정을 찾을 수 없습니다."
        )
    
    return cctv_config


@router.put("/{cctv_id}", response_model=CCTVConfigResponse)
async def update_cctv_config(
    cctv_id: UUID,
    cctv_data: CCTVConfigUpdate,
    db: AsyncSession = Depends(get_db)
):
    """CCTV 설정 수정 API"""
    result = await db.execute(
        select(CCTVConfig).where(CCTVConfig.id == cctv_id)
    )
    cctv_config = result.scalar_one_or_none()
    
    if not cctv_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CCTV 설정을 찾을 수 없습니다."
        )
    
    # 업데이트할 필드만 적용
    update_data = cctv_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cctv_config, field, value)
    
    await db.commit()
    await db.refresh(cctv_config)
    
    # Redis로 CCTV 수정 이벤트 발행
    try:
        redis_service = RedisService()
        await redis_service.publish_cctv_event(
            CCTVEventType.CCTV_UPDATED,
            cctv_to_dict(cctv_config)
        )
    except Exception as e:
        print(f"[Redis] CCTV 수정 이벤트 발행 실패: {e}")
    
    return cctv_config


@router.delete("/{cctv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cctv_config(
    cctv_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """CCTV 설정 삭제 API"""
    result = await db.execute(
        select(CCTVConfig).where(CCTVConfig.id == cctv_id)
    )
    cctv_config = result.scalar_one_or_none()
    
    if not cctv_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CCTV 설정을 찾을 수 없습니다."
        )
    
    # 삭제 전 데이터 저장 (이벤트 발행용)
    cctv_data = cctv_to_dict(cctv_config)
    
    await db.delete(cctv_config)
    await db.commit()
    
    # Redis로 CCTV 삭제 이벤트 발행
    try:
        redis_service = RedisService()
        await redis_service.publish_cctv_event(
            CCTVEventType.CCTV_DELETED,
            cctv_data
        )
    except Exception as e:
        print(f"[Redis] CCTV 삭제 이벤트 발행 실패: {e}")