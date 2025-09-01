-- mj_packingList 테이블 생성
CREATE TABLE IF NOT EXISTS mj_packing_list (
  id INT AUTO_INCREMENT PRIMARY KEY,
  packing_code VARCHAR(50) NOT NULL COMMENT '포장코드',
  box_count INT NOT NULL DEFAULT 0 COMMENT '박스수',
  product_name VARCHAR(255) NOT NULL COMMENT '상품명',
  product_sku VARCHAR(100) COMMENT '상품 SKU',
  product_image VARCHAR(500) COMMENT '상품사진 URL',
  packaging_method INT NOT NULL DEFAULT 0 COMMENT '소포장 구성',
  packaging_count INT NOT NULL DEFAULT 0 COMMENT '포장수',
  quantity_per_box INT NOT NULL DEFAULT 0 COMMENT '한박스내 수량',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  INDEX idx_packing_code (packing_code),
  INDEX idx_product_name (product_name),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MJ 패킹리스트 테이블'; 