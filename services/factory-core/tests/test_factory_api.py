"""
Factory API 단위 테스트
"""
import pytest
from httpx import AsyncClient
from uuid import UUID


@pytest.mark.asyncio
class TestFactoryAPI:
    """공장 API 테스트 클래스"""
    
    async def test_create_factory(self, client: AsyncClient):
        """공장 생성 API 테스트"""
        factory_data = {
            "name": "테스트 공장",
            "description": "테스트용 공장입니다",
            "layout_json": {"width": 100, "height": 100}
        }
        
        response = await client.post("/factories/", json=factory_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == factory_data["name"]
        assert data["description"] == factory_data["description"]
        assert "id" in data
        assert UUID(data["id"])  # UUID 형식 검증
    
    async def test_get_factories(self, client: AsyncClient):
        """공장 목록 조회 API 테스트"""
        # 먼저 공장 생성
        factory_data = {
            "name": "테스트 공장 1",
            "description": "테스트",
            "layout_json": {}
        }
        await client.post("/factories/", json=factory_data)
        
        # 목록 조회
        response = await client.get("/factories/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    async def test_get_factory_by_id(self, client: AsyncClient):
        """공장 상세 조회 API 테스트"""
        # 공장 생성
        factory_data = {
            "name": "상세 조회 테스트",
            "description": "테스트",
            "layout_json": {}
        }
        create_response = await client.post("/factories/", json=factory_data)
        factory_id = create_response.json()["id"]
        
        # 상세 조회
        response = await client.get(f"/factories/{factory_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == factory_id
        assert data["name"] == factory_data["name"]
    
    async def test_get_factory_not_found(self, client: AsyncClient):
        """존재하지 않는 공장 조회 테스트"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/factories/{fake_id}")
        
        assert response.status_code == 404
        assert "찾을 수 없습니다" in response.json()["detail"]
    
    async def test_update_factory(self, client: AsyncClient):
        """공장 수정 API 테스트"""
        # 공장 생성
        factory_data = {
            "name": "수정 전",
            "description": "원본",
            "layout_json": {}
        }
        create_response = await client.post("/factories/", json=factory_data)
        factory_id = create_response.json()["id"]
        
        # 공장 수정
        update_data = {
            "name": "수정 후",
            "description": "수정됨"
        }
        response = await client.put(f"/factories/{factory_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]
    
    async def test_update_factory_layout(self, client: AsyncClient):
        """공장 레이아웃 수정 API 테스트"""
        # 공장 생성
        factory_data = {
            "name": "레이아웃 테스트",
            "description": "테스트",
            "layout_json": {"old": "data"}
        }
        create_response = await client.post("/factories/", json=factory_data)
        factory_id = create_response.json()["id"]
        
        # 레이아웃 수정
        layout_data = {
            "layout_json": {"new": "layout", "width": 200, "height": 200}
        }
        response = await client.put(f"/factories/{factory_id}/layout", json=layout_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["layout_json"] == layout_data["layout_json"]
    
    async def test_delete_factory(self, client: AsyncClient):
        """공장 삭제 API 테스트"""
        # 공장 생성
        factory_data = {
            "name": "삭제 테스트",
            "description": "테스트",
            "layout_json": {}
        }
        create_response = await client.post("/factories/", json=factory_data)
        factory_id = create_response.json()["id"]
        
        # 공장 삭제
        response = await client.delete(f"/factories/{factory_id}")
        
        assert response.status_code == 204
        
        # 삭제 확인
        get_response = await client.get(f"/factories/{factory_id}")
        assert get_response.status_code == 404
    
    async def test_get_factory_cctv_configs(self, client: AsyncClient):
        """공장별 CCTV 설정 목록 조회 테스트"""
        # 공장 생성
        factory_data = {
            "name": "CCTV 테스트",
            "description": "테스트",
            "layout_json": {}
        }
        create_response = await client.post("/factories/", json=factory_data)
        factory_id = create_response.json()["id"]
        
        # CCTV 설정 목록 조회
        response = await client.get(f"/factories/{factory_id}/cctv-configs")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_health_check(self, client: AsyncClient):
        """헬스체크 엔드포인트 테스트"""
        response = await client.get("/health")
        
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
