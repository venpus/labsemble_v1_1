-- 제품 테이블 생성
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '상품명',
    description TEXT COMMENT '상품 설명',
    price DECIMAL(10, 2) NOT NULL COMMENT '단가',
    stock_quantity INT NOT NULL DEFAULT 0 COMMENT '재고 수량',
    specification VARCHAR(500) COMMENT '규격',
    image_url VARCHAR(500) COMMENT '제품 이미지 URL',
    category VARCHAR(100) COMMENT '카테고리',
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 상태',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_created_at ON products(created_at);
