-- V-Factory 데이터베이스 초기화 스크립트
-- PostgreSQL 컨테이너 최초 실행 시 자동 실행됨

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PostGIS 확장 (공간 인덱싱용, 선택사항)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- 테이블 생성
-- ============================================

-- 공장 테이블
CREATE TABLE IF NOT EXISTS factories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout_json JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 사고 유형 ENUM
CREATE TYPE incident_type AS ENUM (
    'ENTANGLEMENT',   -- 끼임
    'FALL',           -- 전도/넘어짐
    'COLLISION',      -- 충돌
    'FIRE',           -- 화재
    'ELECTRIC_SHOCK', -- 감전
    'OTHER'           -- 기타
);

-- 설비 유형 ENUM
CREATE TYPE equipment_type AS ENUM (
    'CONVEYOR_BELT',     -- 컨베이어 벨트
    'ROBOT_ARM',         -- 로봇 팔
    'PRESS_MACHINE',     -- 프레스 기계
    'CNC_MACHINE',       -- CNC 기계
    'PACKAGING_MACHINE', -- 포장 기계
    'FORKLIFT',          -- 지게차
    'CRANE',             -- 크레인
    'TANK',              -- 탱크/저장고
    'GENERATOR',         -- 발전기
    'CONTROL_PANEL',     -- 제어 패널
    'OTHER'              -- 기타
);

-- 설비 상태 ENUM
CREATE TYPE equipment_status AS ENUM (
    'RUNNING',      -- 가동 중
    'IDLE',         -- 대기 중
    'MAINTENANCE',  -- 점검 중
    'ERROR',        -- 오류
    'OFFLINE'       -- 오프라인
);

-- 사고 기록 테이블
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    type incident_type NOT NULL,
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    position_z FLOAT NOT NULL,
    description TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- CCTV 설정 테이블
CREATE TABLE IF NOT EXISTS cctv_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    position_z FLOAT NOT NULL,
    rotation_x FLOAT DEFAULT 0,
    rotation_y FLOAT DEFAULT 0,
    rotation_z FLOAT DEFAULT 0,
    fov FLOAT DEFAULT 75.0 CHECK (fov >= 30 AND fov <= 120),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 에셋 테이블
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    asset_metadata JSONB DEFAULT '{}',
    thumbnail_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 설비 테이블
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type equipment_type NOT NULL,
    status equipment_status DEFAULT 'IDLE',
    position_x FLOAT NOT NULL DEFAULT 0,
    position_y FLOAT NOT NULL DEFAULT 0,
    position_z FLOAT NOT NULL DEFAULT 0,
    rotation_x FLOAT DEFAULT 0,
    rotation_y FLOAT DEFAULT 0,
    rotation_z FLOAT DEFAULT 0,
    scale_x FLOAT DEFAULT 1,
    scale_y FLOAT DEFAULT 1,
    scale_z FLOAT DEFAULT 1,
    asset_id UUID,
    properties JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 인덱스 생성
-- ============================================

-- 사고 기록 인덱스
CREATE INDEX IF NOT EXISTS idx_incidents_factory_id ON incidents(factory_id);
CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_position ON incidents(position_x, position_y, position_z);

-- CCTV 인덱스
CREATE INDEX IF NOT EXISTS idx_cctv_factory_id ON cctv_configs(factory_id);
CREATE INDEX IF NOT EXISTS idx_cctv_position ON cctv_configs(position_x, position_y, position_z);

-- 에셋 인덱스
CREATE INDEX IF NOT EXISTS idx_assets_file_type ON assets(file_type);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);

-- 설비 인덱스
CREATE INDEX IF NOT EXISTS idx_equipment_factory_id ON equipment(factory_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(type);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_position ON equipment(position_x, position_y, position_z);

-- ============================================
-- 트리거 함수: updated_at 자동 갱신
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
CREATE TRIGGER update_factories_updated_at
    BEFORE UPDATE ON factories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cctv_configs_updated_at
    BEFORE UPDATE ON cctv_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at
    BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 초기 샘플 데이터 (개발용)
-- ============================================

-- 샘플 공장 데이터
INSERT INTO factories (id, name, description, layout_json) VALUES
    ('11111111-1111-1111-1111-111111111111', 
     '메인 생산 공장', 
     'V-Factory 메인 시뮬레이션 공장',
     '{"width": 100, "height": 50, "depth": 80, "conveyors": [], "equipment": []}')
ON CONFLICT (id) DO NOTHING;

-- 샘플 CCTV 설정
INSERT INTO cctv_configs (factory_id, name, position_x, position_y, position_z, fov) VALUES
    ('11111111-1111-1111-1111-111111111111', 'CAM-01 입구', 0, 10, 0, 90),
    ('11111111-1111-1111-1111-111111111111', 'CAM-02 컨베이어 A', 20, 8, 10, 75),
    ('11111111-1111-1111-1111-111111111111', 'CAM-03 컨베이어 B', 40, 8, 10, 75),
    ('11111111-1111-1111-1111-111111111111', 'CAM-04 출하 구역', 80, 10, 40, 90)
ON CONFLICT DO NOTHING;

-- 샘플 설비 데이터
INSERT INTO equipment (factory_id, name, description, type, status, position_x, position_y, position_z) VALUES
    ('11111111-1111-1111-1111-111111111111', '컨베이어 A', '주 생산 라인 컨베이어 벨트', 'CONVEYOR_BELT', 'RUNNING', 20, 0, 10),
    ('11111111-1111-1111-1111-111111111111', '컨베이어 B', '보조 생산 라인 컨베이어 벨트', 'CONVEYOR_BELT', 'RUNNING', 40, 0, 10),
    ('11111111-1111-1111-1111-111111111111', '로봇 팔 #1', '조립 라인 로봇 팔', 'ROBOT_ARM', 'IDLE', 30, 0, 15),
    ('11111111-1111-1111-1111-111111111111', '프레스 기계', '금속 프레스 가공기', 'PRESS_MACHINE', 'MAINTENANCE', 50, 0, 20)
ON CONFLICT DO NOTHING;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ V-Factory 데이터베이스 초기화 완료!';
END $$;
