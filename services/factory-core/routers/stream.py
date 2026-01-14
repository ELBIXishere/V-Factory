"""
V-Factory - Factory Core SSE 스트림 라우터
실시간 이벤트 스트림 엔드포인트
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from services import RedisService


router = APIRouter()


@router.get("/factory")
async def stream_factory_events():
    """
    공장 이벤트 SSE 스트림 엔드포인트
    공장 생성/수정/삭제 및 레이아웃 변경 이벤트 실시간 수신
    """
    async def event_generator():
        redis_service = RedisService()
        async for message in redis_service.subscribe_factory_events():
            yield f"data: {message}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/cctv")
async def stream_cctv_events():
    """
    CCTV 이벤트 SSE 스트림 엔드포인트
    CCTV 생성/수정/삭제 이벤트 실시간 수신
    """
    async def event_generator():
        redis_service = RedisService()
        async for message in redis_service.subscribe_cctv_events():
            yield f"data: {message}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/all")
async def stream_all_events():
    """
    모든 이벤트 SSE 스트림 엔드포인트
    공장 및 CCTV 관련 모든 이벤트 실시간 수신
    """
    async def event_generator():
        redis_service = RedisService()
        async for message in redis_service.subscribe_all_events():
            yield f"data: {message}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
