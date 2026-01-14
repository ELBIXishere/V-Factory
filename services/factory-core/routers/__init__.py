"""
V-Factory - Factory Core API 라우터
"""
from .factory import router as factory_router
from .cctv import router as cctv_router
from .equipment import router as equipment_router
from .spatial import router as spatial_router
from .stream import router as stream_router

__all__ = [
    "factory_router",
    "cctv_router",
    "equipment_router",
    "spatial_router",
    "stream_router",
]
