"""
V-Factory - Incident API 라우터
사고 CRUD 및 실시간 스트림 엔드포인트
"""
import json
from datetime import datetime
from typing import List, Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models import Incident
from schemas import IncidentCreate, IncidentUpdate, IncidentResponse
from services.redis_service import RedisService


router = APIRouter()


@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    incident_data: IncidentCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    사고 발생 트리거 API
    사고 생성 후 Factory Core Service에서 가까운 CCTV 찾기
    Redis Pub/Sub으로 실시간 알림 발행
    """
    # Factory Core Service에서 factory_id 존재 여부 확인
    factory_exists = False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.FACTORY_CORE_URL}/factories/{incident_data.factory_id}"
            )
            factory_exists = response.status_code == 200
    except Exception as e:
        print(f"[Incident] Factory 존재 확인 실패: {e}")
    
    # Factory가 존재하지 않으면 에러 반환
    if not factory_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Factory with ID {incident_data.factory_id} does not exist. Please create a factory first."
        )
    
    incident = Incident(
        factory_id=incident_data.factory_id,
        type=incident_data.type,
        severity=incident_data.severity,
        description=incident_data.description,
        position_x=incident_data.position_x,
        position_y=incident_data.position_y,
        position_z=incident_data.position_z,
        npc_id=incident_data.npc_id,  # NPC ID 저장
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    
    # Factory Core Service에서 가까운 CCTV 찾기
    detected_cctv_ids: List[UUID] = []
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Factory Core Service의 spatial API 호출
            # factory_id는 query parameter, position은 body로 전송
            response = await client.post(
                f"{settings.FACTORY_CORE_URL}/spatial/covering-cctvs",
                params={
                    "factory_id": str(incident_data.factory_id),
                    "max_distance": 50.0
                },
                json={
                    "x": incident_data.position_x,
                    "y": incident_data.position_y,
                    "z": incident_data.position_z
                }
            )
            
            if response.status_code == 200:
                cctv_data = response.json()
                # 응답 형식: [{"cctv": {...}, "distance": ...}, ...]
                detected_cctv_ids = [UUID(item["cctv"]["id"]) for item in cctv_data]
                print(f"[Incident] 감지된 CCTV: {len(detected_cctv_ids)}개 - {[str(id) for id in detected_cctv_ids]}")
            else:
                print(f"[Incident] CCTV 매칭 실패: {response.status_code} - {response.text}")
    except Exception as e:
        # Factory Core Service 연결 실패해도 DB 저장은 유지
        print(f"[Incident] Factory Core Service 호출 실패: {e}")
    
    # Redis로 사고 알림 발행
    try:
        redis_service = RedisService()
        await redis_service.publish_incident(incident)
    except Exception as e:
        # Redis 연결 실패해도 DB 저장은 유지
        print(f"[Incident] Redis 발행 실패: {e}")
    
    # 응답에 detected_cctv_ids 포함
    response_data = IncidentResponse.model_validate(incident)
    response_data.detected_cctv_ids = detected_cctv_ids
    return response_data


@router.get("/", response_model=List[IncidentResponse])
async def get_incidents(
    factory_id: UUID = None,
    is_resolved: bool = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """사고 목록 조회 API"""
    query = select(Incident)
    
    if factory_id:
        query = query.where(Incident.factory_id == factory_id)
    if is_resolved is not None:
        query = query.where(Incident.is_resolved == is_resolved)
    
    query = query.order_by(Incident.timestamp.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stream")
async def stream_incidents():
    """
    SSE (Server-Sent Events) 스트림 엔드포인트
    실시간 사고 알림을 클라이언트에 푸시
    """
    async def event_generator():
        redis_service = RedisService()
        async for message in redis_service.subscribe_incidents():
            yield f"data: {message}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """사고 상세 조회 API"""
    result = await db.execute(
        select(Incident).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사고 기록을 찾을 수 없습니다."
        )
    
    return incident


@router.put("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: UUID,
    incident_data: IncidentUpdate,
    db: AsyncSession = Depends(get_db)
):
    """사고 수정 API (해결 처리 등)"""
    result = await db.execute(
        select(Incident).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사고 기록을 찾을 수 없습니다."
        )
    
    update_data = incident_data.model_dump(exclude_unset=True)
    
    # 해결 처리 시 resolved_at 타임스탬프 설정
    if update_data.get("is_resolved") and not incident.is_resolved:
        incident.resolved_at = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(incident, field, value)
    
    await db.commit()
    await db.refresh(incident)
    return incident


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident(
    incident_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """사고 삭제 API"""
    result = await db.execute(
        select(Incident).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사고 기록을 찾을 수 없습니다."
        )
    
    await db.delete(incident)
    await db.commit()
