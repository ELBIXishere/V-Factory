"""
데이터베이스 쿼리 최적화 유틸리티
캐싱 및 쿼리 최적화 로직
"""
from functools import wraps
from typing import Any, Callable, Optional
import json
import hashlib

from services.redis_service import RedisService


def cache_query_result(ttl: int = 300):
    """
    쿼리 결과 캐싱 데코레이터
    Redis를 사용하여 쿼리 결과를 캐싱
    
    Args:
        ttl: 캐시 TTL (초), 기본값 5분
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성 (함수명 + 인자 해시)
            cache_key_parts = [func.__name__]
            cache_key_parts.extend(str(arg) for arg in args)
            cache_key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
            cache_key = f"query_cache:{hashlib.md5('|'.join(cache_key_parts).encode()).hexdigest()}"
            
            # Redis에서 캐시 확인
            try:
                redis_service = RedisService()
                cached_result = await redis_service.get(cache_key)
                if cached_result:
                    return json.loads(cached_result)
            except Exception as e:
                print(f"[Cache] 캐시 조회 실패: {e}")
            
            # 캐시 미스 - 실제 쿼리 실행
            result = await func(*args, **kwargs)
            
            # 결과 캐싱
            try:
                redis_service = RedisService()
                await redis_service.set(
                    cache_key,
                    json.dumps(result, default=str),
                    ttl=ttl
                )
            except Exception as e:
                print(f"[Cache] 캐시 저장 실패: {e}")
            
            return result
        
        return wrapper
    return decorator


def invalidate_cache_pattern(pattern: str):
    """
    캐시 무효화 (패턴 기반)
    
    Args:
        pattern: 무효화할 캐시 키 패턴
    """
    async def invalidate():
        try:
            redis_service = RedisService()
            # Redis KEYS 명령 사용 (프로덕션에서는 SCAN 사용 권장)
            keys = await redis_service.keys(f"query_cache:*{pattern}*")
            if keys:
                await redis_service.delete_many(keys)
        except Exception as e:
            print(f"[Cache] 캐시 무효화 실패: {e}")
    
    return invalidate
