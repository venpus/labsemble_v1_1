-- mj_packing_list 테이블에 client_product_id 필드 추가
ALTER TABLE mj_packing_list 
ADD COLUMN client_product_id VARCHAR(50) COMMENT '클라이언트 상품 ID (React 컴포넌트에서 생성된 고유 ID)';

-- client_product_id에 인덱스 추가 (검색 성능 향상)
CREATE INDEX idx_client_product_id ON mj_packing_list(client_product_id);

-- 기존 데이터의 client_product_id를 product_sku와 동일하게 설정 (하위 호환성)
UPDATE mj_packing_list 
SET client_product_id = product_sku 
WHERE client_product_id IS NULL; 