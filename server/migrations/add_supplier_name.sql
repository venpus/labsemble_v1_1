-- supplier_name 필드를 mj_project 테이블에 추가
ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200) DEFAULT NULL COMMENT '공급자 이름'; 