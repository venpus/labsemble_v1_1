-- mj_project 테이블에 image_url 컬럼 추가
ALTER TABLE mj_project ADD COLUMN image_url VARCHAR(500) NULL COMMENT '제품 이미지 URL';

-- 인덱스 추가 (선택사항)
CREATE INDEX idx_mj_project_image_url ON mj_project (image_url);
