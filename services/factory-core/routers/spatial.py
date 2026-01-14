"""
V-Factory - 공간 쿼리 API 라우터
R-Tree 기반 공간 인덱스 쿼리 엔드포인트
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Factory
from schemas import CCTVConfigResponse
from services.spatial_service import SpatialService
from sqlalchemy import select


router = APIRouter()


# ===== Pydantic 스키마 =====

class Position3D(BaseModel):
    """3D 좌표 스키마"""
    x: float = Field(..., description="X 좌표")
    y: float = Field(..., description="Y 좌표")
    z: float = Field(..., description="Z 좌표")


class CCTVWithDistance(BaseModel):
    """CCTV와 거리 정보 응답 스키마"""
    cctv: CCTVConfigResponse
    distance: float = Field(..., description="기준점으로부터의 거리")
    
    class Config:
        from_attributes = True


class NearestCCTVRequest(BaseModel):
    """가장 가까운 CCTV 검색 요청 스키마"""
    factory_id: UUID = Field(..., description="공장 ID")
    position: Position3D = Field(..., description="검색 기준 위치")
    limit: int = Field(default=5, ge=1, le=20, description="반환할 CCTV 수")
    max_distance: Optional[float] = Field(None, ge=0, description="최대 검색 거리")


class BoundingBoxRequest(BaseModel):
    """Bounding Box 내 CCTV 검색 요청 스키마"""
    factory_id: UUID = Field(..., description="공장 ID")
    min_point: Position3D = Field(..., description="영역 최소 좌표")
    max_point: Position3D = Field(..., description="영역 최대 좌표")


# ===== API 엔드포인트 =====

@router.post("/nearest-cctvs", response_model=List[CCTVWithDistance])
async def find_nearest_cctvs(
    request: NearestCCTVRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    특정 위치에서 가장 가까운 CCTV들을 찾는 API
    사고 발생 시 가장 가까운 CCTV를 빠르게 찾기 위해 사용
    """
    # 공장 존재 여부 확인
    result = await db.execute(
        select(Factory).where(Factory.id == request.factory_id)
    )
    factory = result.scalar_one_or_none()
    
    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="공장을 찾을 수 없습니다."
        )
    
    # 공간 검색 서비스 호출
    spatial_service = SpatialService(db)
    position = (request.position.x, request.position.y, request.position.z)
    
    cctv_distances = await spatial_service.find_nearest_cctvs(
        factory_id=request.factory_id,
        position=position,
        limit=request.limit,
        max_distance=request.max_distance
    )
    
    # 응답 형식으로 변환
    return [
        CCTVWithDistance(
            cctv=CCTVConfigResponse.model_validate(cctv),
            distance=distance
        )
        for cctv, distance in cctv_distances
    ]


@router.post("/covering-cctvs", response_model=List[CCTVWithDistance])
async def find_cctvs_covering_point(
    factory_id: UUID,
    position: Position3D,
    max_distance: float = Query(default=50.0, ge=0, description="최대 감지 거리"),
    db: AsyncSession = Depends(get_db)
):
    """
    특정 위치를 시야각 내에서 볼 수 있는 CCTV들을 찾는 API
    사고 발생 시 해당 지점을 촬영 중인 CCTV를 찾기 위해 사용
    """
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
    
    # 공간 검색 서비스 호출
    spatial_service = SpatialService(db)
    pos = (position.x, position.y, position.z)
    
    cctv_distances = await spatial_service.find_cctvs_covering_point(
        factory_id=factory_id,
        position=pos,
        max_distance=max_distance
    )
    
    # 응답 형식으로 변환
    return [
        CCTVWithDistance(
            cctv=CCTVConfigResponse.model_validate(cctv),
            distance=distance
        )
        for cctv, distance in cctv_distances
    ]


@router.post("/cctvs-in-area", response_model=List[CCTVConfigResponse])
async def find_cctvs_in_bounding_box(
    request: BoundingBoxRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    특정 영역(Bounding Box) 내에 있는 CCTV들을 찾는 API
    특정 구역 내 CCTV를 일괄 조회할 때 사용
    """
    # 공장 존재 여부 확인
    result = await db.execute(
        select(Factory).where(Factory.id == request.factory_id)
    )
    factory = result.scalar_one_or_none()
    
    if not factory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="공장을 찾을 수 없습니다."
        )
    
    # 공간 검색 서비스 호출
    spatial_service = SpatialService(db)
    min_point = (request.min_point.x, request.min_point.y, request.min_point.z)
    max_point = (request.max_point.x, request.max_point.y, request.max_point.z)
    
    cctvs = await spatial_service.find_cctvs_in_bounding_box(
        factory_id=request.factory_id,
        min_point=min_point,
        max_point=max_point
    )
    
    return cctvs
