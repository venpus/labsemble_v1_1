-- factory_shipping_status 필드 추가 마이그레이션
-- 날짜: 2025-01-01
-- 설명: 공장 출고 상태를 저장하는 필드 추가

ALTER TABLE mj_project 
ADD COLUMN factory_shipping_status VARCHAR(50) DEFAULT '출고 대기' 
COMMENT '공장 출고 상태 (정시출고, 조기출고, 출고연기, 출고 대기)';

-- 기존 데이터에 대한 기본값 설정
UPDATE mj_project 
SET factory_shipping_status = '출고 대기' 
WHERE factory_shipping_status IS NULL; 