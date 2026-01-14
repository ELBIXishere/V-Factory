"""
Incident API 단위 테스트
"""
import pytest
from httpx import AsyncClient
from uuid import UUID, uuid4


@pytest.mark.asyncio
class TestIncidentAPI:
    """사고 API 테스트 클래스"""
    
    @pytest.fixture
    def sample_factory_id(self):
        """샘플 공장 ID"""
        return str(uuid4())
    
    async def test_create_incident(self, client: AsyncClient, sample_factory_id):
        """사고 생성 API 테스트"""
        incident_data = {
            "factory_id": sample_factory_id,
            "type": "ENTANGLEMENT",
            "severity": 3,
            "description": "테스트 사고",
            "position_x": 10.0,
            "position_y": 5.0,
            "position_z": 2.0
        }
        
        response = await client.post("/incidents/", json=incident_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == incident_data["type"]
        assert data["severity"] == incident_data["severity"]
        assert data["position_x"] == incident_data["position_x"]
        assert "id" in data
        assert UUID(data["id"])
        assert data["is_resolved"] is False
    
    async def test_get_incidents(self, client: AsyncClient, sample_factory_id):
        """사고 목록 조회 API 테스트"""
        # 사고 생성
        incident_data = {
            "factory_id": sample_factory_id,
            "type": "FALL",
            "severity": 2,
            "description": "테스트",
            "position_x": 0.0,
            "position_y": 0.0,
            "position_z": 0.0
        }
        await client.post("/incidents/", json=incident_data)
        
        # 목록 조회
        response = await client.get("/incidents/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    async def test_get_incidents_with_filters(self, client: AsyncClient, sample_factory_id):
        """필터링된 사고 목록 조회 테스트"""
        # 사고 생성
        incident_data = {
            "factory_id": sample_factory_id,
            "type": "COLLISION",
            "severity": 4,
            "description": "필터 테스트",
            "position_x": 0.0,
            "position_y": 0.0,
            "position_z": 0.0
        }
        await client.post("/incidents/", json=incident_data)
        
        # 공장 ID로 필터링
        response = await client.get(f"/incidents/?factory_id={sample_factory_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # 모든 사고가 해당 공장 ID를 가져야 함
        for incident in data:
            assert incident["factory_id"] == sample_factory_id
    
    async def test_get_incident_by_id(self, client: AsyncClient, sample_factory_id):
        """사고 상세 조회 API 테스트"""
        # 사고 생성
        incident_data = {
            "factory_id": sample_factory_id,
            "type": "FIRE",
            "severity": 5,
            "description": "상세 조회 테스트",
            "position_x": 15.0,
            "position_y": 20.0,
            "position_z": 5.0
        }
        create_response = await client.post("/incidents/", json=incident_data)
        incident_id = create_response.json()["id"]
        
        # 상세 조회
        response = await client.get(f"/incidents/{incident_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == incident_id
        assert data["type"] == incident_data["type"]
        assert data["severity"] == incident_data["severity"]
    
    async def test_get_incident_not_found(self, client: AsyncClient):
        """존재하지 않는 사고 조회 테스트"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/incidents/{fake_id}")
        
        assert response.status_code == 404
        assert "찾을 수 없습니다" in response.json()["detail"]
    
    async def test_update_incident(self, client: AsyncClient, sample_factory_id):
        """사고 수정 API 테스트"""
        # 사고 생성
        incident_data = {
            "factory_id": sample_factory_id,
            "type": "ELECTRIC_SHOCK",
            "severity": 3,
            "description": "수정 전",
            "position_x": 0.0,
            "position_y": 0.0,
            "position_z": 0.0
        }
        create_response = await client.post("/incidents/", json=incident_data)
        incident_id = create_response.json()["id"]
        
        # 사고 수정 (해결 처리)
        update_data = {
            "is_resolved": True,
            "description": "수정 후 - 해결됨"
        }
        response = await client.put(f"/incidents/{incident_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_resolved"] is True
        assert data["description"] == update_data["description"]
        assert data["resolved_at"] is not None
    
    async def test_delete_incident(self, client: AsyncClient, sample_factory_id):
        """사고 삭제 API 테스트"""
        # 사고 생성
        incident_data = {
            "factory_id": sample_factory_id,
            "type": "OTHER",
            "severity": 1,
            "description": "삭제 테스트",
            "position_x": 0.0,
            "position_y": 0.0,
            "position_z": 0.0
        }
        create_response = await client.post("/incidents/", json=incident_data)
        incident_id = create_response.json()["id"]
        
        # 사고 삭제
        response = await client.delete(f"/incidents/{incident_id}")
        
        assert response.status_code == 204
        
        # 삭제 확인
        get_response = await client.get(f"/incidents/{incident_id}")
        assert get_response.status_code == 404
    
    async def test_health_check(self, client: AsyncClient):
        """헬스체크 엔드포인트 테스트"""
        response = await client.get("/health")
        
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
