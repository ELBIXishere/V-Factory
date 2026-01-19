"""
Asset API 단위 테스트
"""
import pytest
from httpx import AsyncClient
from uuid import UUID
import io


@pytest.mark.asyncio
class TestAssetAPI:
    """에셋 API 테스트 클래스"""
    
    @pytest.fixture
    def sample_glb_file(self):
        """샘플 GLB 파일 (더미 데이터)"""
        # 실제 GLB 파일이 아닌 더미 바이너리 데이터
        dummy_data = b"dummy glb file content for testing"
        return ("test_model.glb", dummy_data, "model/gltf-binary")
    
    async def test_get_assets(self, client: AsyncClient):
        """에셋 목록 조회 API 테스트"""
        response = await client.get("/assets/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_get_asset_by_id_not_found(self, client: AsyncClient):
        """존재하지 않는 에셋 조회 테스트"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/assets/{fake_id}")
        
        assert response.status_code == 404
        assert "찾을 수 없습니다" in response.json()["detail"]
    
    async def test_get_asset_metadata_not_found(self, client: AsyncClient):
        """존재하지 않는 에셋 메타데이터 조회 테스트"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/assets/{fake_id}/metadata")
        
        assert response.status_code == 404
    
    async def test_health_check(self, client: AsyncClient):
        """향상된 헬스체크 엔드포인트 테스트"""
        response = await client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "database" in data
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
