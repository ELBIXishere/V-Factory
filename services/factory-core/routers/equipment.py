"""
V-Factory - Equipment API 라우터
설비 CRUD 엔드포인트
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Equipment, Factory
from schemas import EquipmentCreate, EquipmentUpdate, EquipmentResponse
from schemas.equipment import EquipmentStatusEnum, EquipmentTypeEnum


router = APIRouter()


@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    equipment_data: EquipmentCreate,
    db: AsyncSession = Depends(get_db)
):
    """설비 생성 API"""
    # 공장 존재 여부 확인
    result = await db.execute(
        select(Factory).where(Factory.id == equipment_data.factory_id)
    )
    factory = result.scalar_one_or_none()
    
    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="공장을 찾을 수 없습니다."
        )
    
    equipment = Equipment(**equipment_data.model_dump())
    db.add(equipment)
    await db.commit()
    await db.refresh(equipment)
    return equipment


@router.get("/", response_model=List[EquipmentResponse])
async def get_equipment_list(
    factory_id: UUID = Query(None, description="공장 ID로 필터링"),
    equipment_type: EquipmentTypeEnum = Query(None, description="설비 유형으로 필터링"),
    equipment_status: EquipmentStatusEnum = Query(None, description="설비 상태로 필터링"),
    is_active: bool = Query(None, description="활성화 여부로 필터링"),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """설비 목록 조회 API"""
    query = select(Equipment)
    
    if factory_id:
        query = query.where(Equipment.factory_id == factory_id)
    if equipment_type:
        query = query.where(Equipment.type == equipment_type)
    if equipment_status:
        query = query.where(Equipment.status == equipment_status)
    if is_active is not None:
        query = query.where(Equipment.is_active == is_active)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment(
    equipment_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """설비 상세 조회 API"""
    result = await db.execute(
        select(Equipment).where(Equipment.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="설비를 찾을 수 없습니다."
        )
    
    return equipment


@router.put("/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(
    equipment_id: UUID,
    equipment_data: EquipmentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """설비 수정 API"""
    result = await db.execute(
        select(Equipment).where(Equipment.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="설비를 찾을 수 없습니다."
        )
    
    # 업데이트할 필드만 적용
    update_data = equipment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(equipment, field, value)
    
    await db.commit()
    await db.refresh(equipment)
    return equipment


@router.put("/{equipment_id}/status", response_model=EquipmentResponse)
async def update_equipment_status(
    equipment_id: UUID,
    new_status: EquipmentStatusEnum,
    db: AsyncSession = Depends(get_db)
):
    """설비 상태 변경 API"""
    result = await db.execute(
        select(Equipment).where(Equipment.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="설비를 찾을 수 없습니다."
        )
    
    equipment.status = new_status
    await db.commit()
    await db.refresh(equipment)
    return equipment


@router.delete("/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipment(
    equipment_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """설비 삭제 API"""
    result = await db.execute(
        select(Equipment).where(Equipment.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="설비를 찾을 수 없습니다."
        )
    
    await db.delete(equipment)
    await db.commit()
