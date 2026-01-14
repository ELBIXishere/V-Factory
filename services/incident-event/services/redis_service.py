"""
V-Factory - Redis Pub/Sub 서비스
실시간 사고 알림 발행/구독
"""
import json
from typing import AsyncGenerator

import redis.asyncio as redis

from config import settings


class RedisService:
    """Redis Pub/Sub 서비스 클래스"""
    
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self.channel = settings.REDIS_CHANNEL
        self._client = None
    
    async def _get_client(self) -> redis.Redis:
        """Redis 클라이언트 가져오기 (지연 초기화)"""
        if self._client is None:
            self._client = redis.from_url(self.redis_url)
        return self._client
    
    async def publish_incident(self, incident) -> None:
        """
        사고 알림 Redis 채널로 발행
        
        Args:
            incident: Incident ORM 모델 인스턴스
        """
        client = await self._get_client()
        
        # 사고 데이터를 JSON으로 직렬화
        incident_data = {
            "id": str(incident.id),
            "factory_id": str(incident.factory_id),
            "type": incident.type.value,
            "severity": incident.severity,
            "description": incident.description,
            "position": {
                "x": incident.position_x,
                "y": incident.position_y,
                "z": incident.position_z,
            },
            "timestamp": incident.timestamp.isoformat(),
        }
        
        await client.publish(self.channel, json.dumps(incident_data))
    
    async def subscribe_incidents(self) -> AsyncGenerator[str, None]:
        """
        사고 알림 Redis 채널 구독
        
        Yields:
            사고 데이터 JSON 문자열
        """
        client = await self._get_client()
        pubsub = client.pubsub()
        await pubsub.subscribe(self.channel)
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield message["data"].decode("utf-8")
        finally:
            await pubsub.unsubscribe(self.channel)
            await pubsub.close()
    
    async def close(self) -> None:
        """Redis 연결 종료"""
        if self._client:
            await self._client.close()
            self._client = None
