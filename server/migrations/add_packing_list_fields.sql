-- MJ 프로젝트 테이블에 패킹리스트 관련 필드 추가
-- 실행 날짜: 2025-08-29

-- 패킹 방법 필드 추가
ALTER TABLE mj_project 
ADD COLUMN packing_method VARCHAR(100) DEFAULT NULL 
COMMENT '패킹 방법 (개별 패킹, 벌크 패킹, 세트 패킹 등)';

-- 박스 치수 필드 추가
ALTER TABLE mj_project 
ADD COLUMN box_dimensions VARCHAR(100) DEFAULT NULL 
COMMENT '박스 치수 (예: 30x20x10cm)';

-- 박스 무게 필드 추가
ALTER TABLE mj_project 
ADD COLUMN box_weight VARCHAR(50) DEFAULT NULL 
COMMENT '박스 무게 (예: 2.5kg)';

-- 패킹리스트 생성 여부 필드 추가
ALTER TABLE mj_project 
ADD COLUMN packing_list_created TINYINT(1) DEFAULT 0 
COMMENT '패킹리스트 생성 여부 (0: 미생성, 1: 생성됨)';

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_packing_list_created ON mj_project(packing_list_created);
CREATE INDEX idx_packing_method ON mj_project(packing_method);

-- 기존 데이터에 대한 기본값 설정
UPDATE mj_project 
SET packing_list_created = 0 
WHERE packing_list_created IS NULL;

-- 필드 추가 확인
SELECT 
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'mj_project' 
  AND COLUMN_NAME IN ('packing_method', 'box_dimensions', 'box_weight', 'packing_list_created'); 