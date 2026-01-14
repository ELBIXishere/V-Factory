"""
V-Factory - Factory API 라우터
공장 CRUD 엔드포인트
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Factory, CCTVConfig, Equipment
from schemas import (
    FactoryCreate, FactoryUpdate, FactoryResponse, FactoryLayoutUpdate,
    CCTVConfigResponse, EquipmentResponse
)
from services import RedisService, FactoryEventType, factory_to_dict


router = APIRouter()


@router.post("/", response_model=FactoryResponse, status_code=status.HTTP_201_CREATED)
async def create_factory(
    factory_data: FactoryCreate,
    db: AsyncSession = Depends(get_db)
):
    """공장 생성 API"""
    factory = Factory(
        name=factory_data.name,
        description=factory_data.description,
        layout_json=factory_data.layout_json,
    )
    db.add(factory)
    await db.commit()
    await db.refresh(factory)
    
    # Redis로 공장 생성 이벤트 발행
    try:
        redis_service = RedisService()
        await redis_service.publish_factory_event(
            FactoryEventType.FACTORY_CREATED,
            factory_to_dict(factory)
        )
    except Exception as e:
        print(f"[Redis] 공장 생성 이벤트 발행 실패: {e}")
    
    return factory


@router.get("/", response_model=List[FactoryResponse])
async def get_factories(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """공장 목록 조회 API"""
    result = await db.execute(
        select(Factory).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/{factory_id}", response_model=FactoryResponse)
async def get_factory(
    factory_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """공장 상세 조회 API"""
    result = await db.execute(
        select(Factory).where(Factory.id == factory_id)
    )
    factory = result.scalar_one_or_none()
    
    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="공장을 찾을 수 없습니다."
        )
    
    return factory


@router.put("/{factory_id}", response_model=FactoryResponse)
async def update_factory(
    factory_id: UUID,
    factory_data: FactoryUpdate,
    db: AsyncSession = Depends(get_db)
):
    """공장 수정 API"""
    result = await db.execute(
        select(Factory).where(Factory.id == factory_id)
    )
    factory = result.scalar_one_or_none()
    
    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="공장을 찾을 수 없습니다."
        )
    
    # 업데이트할 필드만 적용
    update_data = factory_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(factory, field, value)
    
    await db.commit()
    await db.refresh(factory)
    
    # Redis로 공장 수정 이벤트 발행
    try:
        redis_service = RedisService()
        await redis_service.publish_factory_event(
            FactoryEventType.FACTORY_UPDATED,
            factory_to_dict(factory)
        )
    except Exception as e:
        print(f"[Redis] 공장 수정 이벤트 발행 실패: {e}")
    
    return factory


@router.put("/{factory_id}/layout", response_model=FactoryResponse)
async def update_factory_layout(
    factory_id: UUID,
    layout_data: FactoryLayoutUpdate,
    db: AsyncSession = Depends(get_db)
):
    """공장 레이아웃 수정 API"""
    result = await db.execute(
        select(Factory).where(Factory.id == factory_id)
    )
    factory = result.scalar_one_or_none()
    
    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="공장을 찾을 수 없습니다."
        )
    
    factory.layout_json = layout_data.layout_json
    await db.commit()
    await db.refresh(factory)
    
    # Redis로 레이아웃 수정 이벤트 발행
    try:
        redis_service = RedisService()
        await redis_service.publish_factory_event(
            FactoryEventType.LAYOUT_UPDATED,
            factory_to_dict(factory)
        )
    except Exception as e:
        print(f"[Redis] 레이아웃 수정 이벤트 발행 실패: {e}")
    
    return factory


@router.delete("/{factory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_factory(
    factory_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """공장 삭제 API"""
    result = await db.execute(
        select(Factory).where(Factory.id == factory_id)
    )
    factory = result.scalar_one_or_none()
    
    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="공장을 찾을 수 없습니다."
        )
    
    # 삭제 전 데이터 저장 (이벤트 발행용)
    factory_data = factory_to_dict(factory)
    
    await db.delete(factory)
    await db.commit()
    
    # Redis로 공장 삭제 이벤트 발행
    try:
        redis_service = RedisService()
        await redis_service.publish_factory_event(
            FactoryEventType.FACTORY_DELETED,
            factory_data
        )
    except Exception as e:
        print(f"[Redis] 공장 삭제 이벤트 발행 실패: {e}")


@router.get("/{factory_id}/cctv-configs", response_model=List[CCTVConfigResponse])
async def get_factory_cctv_configs(
    factory_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """공장별 CCTV 설정 목록 조회 API"""
    # 공장 존재 여부 확인
    result = await db.execute(
        select(Factory).where(Factory.id == factory_id)
    )
    factory = result.scalar_one_or_none()
    
    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="공장을 찾을 수 없습니다."
        )
    
    # CCTV 목록 조회
    result = await db.execute(
        select(CCTVConfig)
        .where(CCTVConfig.factory_id == factory_id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/{factory_id}/equipment", response_model=List[EquipmentResponse])
async def get_factory_equipment(
    factory_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """공장별 설비 목록 조회 API"""
    # 공장 존재 여부 확인
    result = await db.execute(
        select(Factory).where(Factory.id == factory_id)
    )
    factory = result.scalar_one_or_none()
    
    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="공장을 찾을 수 없습니다."
        )
    
    # 설비 목록 조회
    result = await db.execute(
        select(Equipment)
        .where(Equipment.factory_id == factory_id)
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()