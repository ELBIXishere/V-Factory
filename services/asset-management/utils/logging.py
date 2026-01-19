"""
V-Factory - Asset Management Service 로깅 설정
구조화된 JSON 로깅 구성
"""
import logging
import sys
from pythonjsonlogger import jsonlogger
from config import settings


def setup_logging():
    """구조화된 JSON 로깅 설정"""
    # 로그 레벨 매핑
    log_level_map = {
        "debug": logging.DEBUG,
        "info": logging.INFO,
        "warning": logging.WARNING,
        "error": logging.ERROR,
        "critical": logging.CRITICAL,
    }
    
    # 설정에서 로그 레벨 가져오기
    log_level = log_level_map.get(settings.LOG_LEVEL.lower(), logging.INFO)
    
    # JSON 포맷터 생성
    json_formatter = jsonlogger.JsonFormatter(
        "%(timestamp)s %(level)s %(name)s %(message)s",
        timestamp=True,
    )
    
    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # 기존 핸들러 제거
    root_logger.handlers = []
    
    # 콘솔 핸들러 추가
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(json_formatter)
    root_logger.addHandler(console_handler)
    
    # 서비스별 로거 설정
    logger = logging.getLogger("asset-management")
    logger.setLevel(log_level)
    
    return logger


# 전역 로거 인스턴스
logger = setup_logging()
