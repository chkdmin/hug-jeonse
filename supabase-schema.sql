-- 허그 든든전세 매물 테이블
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  announcement_no VARCHAR(50) UNIQUE NOT NULL,
  property_name VARCHAR(200) NOT NULL,
  address VARCHAR(300) NOT NULL,
  building_type VARCHAR(50),
  area_m2 DECIMAL(10,2),
  deposit BIGINT,
  applicant_count INT DEFAULT 0,
  recruitment_count INT DEFAULT 1,
  competition_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN recruitment_count > 0
    THEN applicant_count::DECIMAL / recruitment_count
    ELSE 0 END
  ) STORED,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  sido VARCHAR(20),
  gugun VARCHAR(20),
  detail_url VARCHAR(500),
  images TEXT[] DEFAULT '{}',
  application_start DATE,
  application_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_properties_sido ON properties(sido);
CREATE INDEX IF NOT EXISTS idx_properties_gugun ON properties(gugun);
CREATE INDEX IF NOT EXISTS idx_properties_deposit ON properties(deposit);
CREATE INDEX IF NOT EXISTS idx_properties_area ON properties(area_m2);
CREATE INDEX IF NOT EXISTS idx_properties_competition_rate ON properties(competition_rate);
CREATE INDEX IF NOT EXISTS idx_properties_coords ON properties(latitude, longitude);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 설정
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Allow public read access" ON properties
    FOR SELECT USING (true);

-- service_role만 쓰기 가능 (크롤러용)
CREATE POLICY "Allow service role full access" ON properties
    FOR ALL USING (auth.role() = 'service_role');
