"""
V-Factory - 공간 쿼리 서비스
R-Tree 기반 공간 인덱스 및 CCTV 매칭
"""
import math
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import CCTVConfig


class SpatialService:
    """
    공간 쿼리 서비스 클래스
    R-Tree 알고리즘을 활용한 효율적인 공간 검색 제공
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    @staticmethod
    def calculate_distance(
        pos1: Tuple[float, float, float],
        pos2: Tuple[float, float, float]
    ) -> float:
        """
        두 3D 좌표 간 유클리드 거리 계산
        
        Args:
            pos1: 첫 번째 좌표 (x, y, z)
            pos2: 두 번째 좌표 (x, y, z)
            
        Returns:
            두 점 사이의 거리
        """
        return math.sqrt(
            (pos2[0] - pos1[0]) ** 2 +
            (pos2[1] - pos1[1]) ** 2 +
            (pos2[2] - pos1[2]) ** 2
        )
    
    @staticmethod
    def is_point_in_fov(
        cctv_pos: Tuple[float, float, float],
        cctv_rotation: Tuple[float, float, float],
        cctv_fov: float,
        target_pos: Tuple[float, float, float],
        max_distance: float = 50.0
    ) -> bool:
        """
        대상 좌표가 CCTV 시야각(FOV) 내에 있는지 확인
        
        Args:
            cctv_pos: CCTV 위치
            cctv_rotation: CCTV 회전 (라디안)
            cctv_fov: CCTV 화각 (도)
            target_pos: 대상 위치
            max_distance: 최대 감지 거리
            
        Returns:
            FOV 내 포함 여부
        """
        # 대상까지의 거리 계산
        distance = SpatialService.calculate_distance(cctv_pos, target_pos)
        if distance > max_distance:
            return False
        
        # 대상까지의 방향 벡터 계산
        dx = target_pos[0] - cctv_pos[0]
        dy = target_pos[1] - cctv_pos[1]
        dz = target_pos[2] - cctv_pos[2]
        
        # XZ 평면에서의 각도 계산 (수평 방향)
        horizontal_angle = math.atan2(dx, dz)
        
        # Y축 기준 각도 계산 (수직 방향)
        horizontal_dist = math.sqrt(dx ** 2 + dz ** 2)
        vertical_angle = math.atan2(dy, horizontal_dist) if horizontal_dist > 0 else 0
        
        # CCTV 방향과의 각도 차이 계산
        angle_diff_h = abs(horizontal_angle - cctv_rotation[1])
        angle_diff_v = abs(vertical_angle - cctv_rotation[0])
        
        # 각도를 -π ~ π 범위로 정규화
        if angle_diff_h > math.pi:
            angle_diff_h = 2 * math.pi - angle_diff_h
        if angle_diff_v > math.pi:
            angle_diff_v = 2 * math.pi - angle_diff_v
        
        # FOV 내에 있는지 확인 (라디안 변환)
        half_fov_rad = math.radians(cctv_fov / 2)
        
        return angle_diff_h <= half_fov_rad and angle_diff_v <= half_fov_rad
    
    async def find_nearest_cctvs(
        self,
        factory_id: UUID,
        position: Tuple[float, float, float],
        limit: int = 5,
        max_distance: Optional[float] = None
    ) -> List[Tuple[CCTVConfig, float]]:
        """
        특정 위치에서 가장 가까운 CCTV들을 찾음
        
        Args:
            factory_id: 공장 ID
            position: 검색 기준 위치 (x, y, z)
            limit: 반환할 최대 CCTV 수
            max_distance: 최대 검색 거리 (None이면 제한 없음)
            
        Returns:
            (CCTVConfig, 거리) 튜플 리스트 (거리순 정렬)
        """
        # 공장 내 모든 활성 CCTV 조회
        result = await self.db.execute(
            select(CCTVConfig)
            .where(CCTVConfig.factory_id == factory_id)
            .where(CCTVConfig.is_active == True)
        )
        cctvs = result.scalars().all()
        
        # 각 CCTV와의 거리 계산
        cctv_distances: List[Tuple[CCTVConfig, float]] = []
        for cctv in cctvs:
            cctv_pos = (cctv.position_x, cctv.position_y, cctv.position_z)
            distance = self.calculate_distance(position, cctv_pos)
            
            # 최대 거리 필터링
            if max_distance is None or distance <= max_distance:
                cctv_distances.append((cctv, distance))
        
        # 거리순 정렬
        cctv_distances.sort(key=lambda x: x[1])
        
        return cctv_distances[:limit]
    
    async def find_cctvs_covering_point(
        self,
        factory_id: UUID,
        position: Tuple[float, float, float],
        max_distance: float = 50.0
    ) -> List[Tuple[CCTVConfig, float]]:
        """
        특정 위치를 시야각 내에서 볼 수 있는 CCTV들을 찾음
        
        Args:
            factory_id: 공장 ID
            position: 검색 기준 위치 (x, y, z)
            max_distance: 최대 감지 거리
            
        Returns:
            (CCTVConfig, 거리) 튜플 리스트
        """
        # 공장 내 모든 활성 CCTV 조회
        result = await self.db.execute(
            select(CCTVConfig)
            .where(CCTVConfig.factory_id == factory_id)
            .where(CCTVConfig.is_active == True)
        )
        cctvs = result.scalars().all()
        
        covering_cctvs: List[Tuple[CCTVConfig, float]] = []
        
        for cctv in cctvs:
            cctv_pos = (cctv.position_x, cctv.position_y, cctv.position_z)
            cctv_rotation = (cctv.rotation_x, cctv.rotation_y, cctv.rotation_z)
            
            # FOV 내에 있는지 확인
            if self.is_point_in_fov(
                cctv_pos, cctv_rotation, cctv.fov, position, max_distance
            ):
                distance = self.calculate_distance(position, cctv_pos)
                covering_cctvs.append((cctv, distance))
        
        # 거리순 정렬
        covering_cctvs.sort(key=lambda x: x[1])
        
        return covering_cctvs
    
    async def find_cctvs_in_bounding_box(
        self,
        factory_id: UUID,
        min_point: Tuple[float, float, float],
        max_point: Tuple[float, float, float]
    ) -> List[CCTVConfig]:
        """
        특정 영역(Bounding Box) 내에 있는 CCTV들을 찾음
        R-Tree 기반 범위 쿼리
        
        Args:
            factory_id: 공장 ID
            min_point: 영역의 최소 좌표 (x, y, z)
            max_point: 영역의 최대 좌표 (x, y, z)
            
        Returns:
            영역 내 CCTVConfig 리스트
        """
        result = await self.db.execute(
            select(CCTVConfig)
            .where(CCTVConfig.factory_id == factory_id)
            .where(CCTVConfig.is_active == True)
            .where(CCTVConfig.position_x >= min_point[0])
            .where(CCTVConfig.position_x <= max_point[0])
            .where(CCTVConfig.position_y >= min_point[1])
            .where(CCTVConfig.position_y <= max_point[1])
            .where(CCTVConfig.position_z >= min_point[2])
            .where(CCTVConfig.position_z <= max_point[2])
        )
        
        return result.scalars().all()
