"""
V-Factory - Factory Core Redis Pub/Sub 서비스
공장 및 CCTV 실시간 이벤트 발행/구독
"""
import json
from typing import AsyncGenerator, Optional, Any
from enum import Enum

import redis.asyncio as redis

from config import settings


class FactoryEventType(str, Enum):
    """공장 이벤트 유형"""
    FACTORY_CREATED = "factory_created"
    FACTORY_UPDATED = "factory_updated"
    FACTORY_DELETED = "factory_deleted"
    LAYOUT_UPDATED = "layout_updated"


class CCTVEventType(str, Enum):
    """CCTV 이벤트 유형"""
    CCTV_CREATED = "cctv_created"
    CCTV_UPDATED = "cctv_updated"
    CCTV_DELETED = "cctv_deleted"


class RedisService:
    """Factory Core Redis Pub/Sub 서비스 클래스"""
    
    # Redis 채널 정의
    FACTORY_CHANNEL = "factory:events"
    CCTV_CHANNEL = "factory:cctv:events"
    
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self._client: Optional[redis.Redis] = None
    
    async def _get_client(self) -> redis.Redis:
        """Redis 클라이언트 가져오기 (지연 초기화)"""
        if self._client is None:
            self._client = redis.from_url(self.redis_url)
        return self._client
    
    async def publish_factory_event(
        self,
        event_type: FactoryEventType,
        factory_data: dict[str, Any]
    ) -> None:
        """
        공장 이벤트 Redis 채널로 발행
        
        Args:
            event_type: 이벤트 유형
            factory_data: 공장 데이터 딕셔너리
        """
        client = await self._get_client()
        
        # 이벤트 데이터 구성
        event_data = {
            "event": event_type.value,
            "data": factory_data,
        }
        
        await client.publish(self.FACTORY_CHANNEL, json.dumps(event_data))
        print(f"[Redis] Factory 이벤트 발행: {event_type.value}")
    
    async def publish_cctv_event(
        self,
        event_type: CCTVEventType,
        cctv_data: dict[str, Any]
    ) -> None:
        """
        CCTV 이벤트 Redis 채널로 발행
        
        Args:
            event_type: 이벤트 유형
            cctv_data: CCTV 데이터 딕셔너리
        """
        client = await self._get_client()
        
        # 이벤트 데이터 구성
        event_data = {
            "event": event_type.value,
            "data": cctv_data,
        }
        
        await client.publish(self.CCTV_CHANNEL, json.dumps(event_data))
        print(f"[Redis] CCTV 이벤트 발행: {event_type.value}")
    
    async def subscribe_factory_events(self) -> AsyncGenerator[str, None]:
        """
        공장 이벤트 Redis 채널 구독
        
        Yields:
            이벤트 데이터 JSON 문자열
        """
        client = await self._get_client()
        pubsub = client.pubsub()
        await pubsub.subscribe(self.FACTORY_CHANNEL)
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield message["data"].decode("utf-8")
        finally:
            await pubsub.unsubscribe(self.FACTORY_CHANNEL)
            await pubsub.close()
    
    async def subscribe_cctv_events(self) -> AsyncGenerator[str, None]:
        """
        CCTV 이벤트 Redis 채널 구독
        
        Yields:
            이벤트 데이터 JSON 문자열
        """
        client = await self._get_client()
        pubsub = client.pubsub()
        await pubsub.subscribe(self.CCTV_CHANNEL)
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield message["data"].decode("utf-8")
        finally:
            await pubsub.unsubscribe(self.CCTV_CHANNEL)
            await pubsub.close()
    
    async def subscribe_all_events(self) -> AsyncGenerator[str, None]:
        """
        모든 Factory Core 이벤트 채널 구독
        
        Yields:
            이벤트 데이터 JSON 문자열
        """
        client = await self._get_client()
        pubsub = client.pubsub()
        await pubsub.subscribe(self.FACTORY_CHANNEL, self.CCTV_CHANNEL)
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield message["data"].decode("utf-8")
        finally:
            await pubsub.unsubscribe(self.FACTORY_CHANNEL, self.CCTV_CHANNEL)
            await pubsub.close()
    
    async def close(self) -> None:
        """Redis 연결 종료"""
        if self._client:
            await self._client.close()
            self._client = None


def factory_to_dict(factory) -> dict[str, Any]:
    """Factory ORM 모델을 딕셔너리로 변환"""
    return {
        "id": str(factory.id),
        "name": factory.name,
        "description": factory.description,
        "layout_json": factory.layout_json,
        "created_at": factory.created_at.isoformat() if factory.created_at else None,
        "updated_at": factory.updated_at.isoformat() if factory.updated_at else None,
    }


def cctv_to_dict(cctv) -> dict[str, Any]:
    """CCTVConfig ORM 모델을 딕셔너리로 변환"""
    return {
        "id": str(cctv.id),
        "factory_id": str(cctv.factory_id),
        "name": cctv.name,
        "position_x": cctv.position_x,
        "position_y": cctv.position_y,
        "position_z": cctv.position_z,
        "rotation_x": cctv.rotation_x,
        "rotation_y": cctv.rotation_y,
        "rotation_z": cctv.rotation_z,
        "fov": cctv.fov,
        "is_active": cctv.is_active,
        "created_at": cctv.created_at.isoformat() if cctv.created_at else None,
        "updated_at": cctv.updated_at.isoformat() if cctv.updated_at else None,
    }
