-- 제품 정보 필드들을 mj_project 테이블에 추가

-- 1개 무게 (g)
ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS unit_weight DECIMAL(10,2) DEFAULT NULL COMMENT '제품 1개 무게 (g)';

-- 소포장 방식
ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS packaging_method VARCHAR(200) DEFAULT NULL COMMENT '소포장 방식 (예: 비닐, 종이, 폴리백)';

-- 한박스 입수량
ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS box_dimensions VARCHAR(100) DEFAULT NULL COMMENT '한박스 입수량 (개)';

-- 제품사이즈 (cm)
ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS box_weight VARCHAR(50) DEFAULT NULL COMMENT '제품사이즈 (cm)';

-- 공장 납기소요일
ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS factory_delivery_days INT DEFAULT NULL COMMENT '공장 납기 소요일';

