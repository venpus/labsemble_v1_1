-- warehouse_entries 테이블에 stock과 out_quantity 필드 추가 마이그레이션

-- 1. stock 필드 추가 (현재 재고 수량)
ALTER TABLE warehouse_entries ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0 COMMENT '현재 재고 수량';

-- 2. out_quantity 필드 추가 (출고 수량)
ALTER TABLE warehouse_entries ADD COLUMN IF NOT EXISTS out_quantity INT DEFAULT 0 COMMENT '출고 수량';

-- 3. 기존 데이터에 대한 초기값 설정
-- stock = quantity (입고 수량), out_quantity = 0 (출고 수량)
UPDATE warehouse_entries SET stock = quantity WHERE stock IS NULL OR stock = 0;
UPDATE warehouse_entries SET out_quantity = 0 WHERE out_quantity IS NULL;

-- 4. 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_stock ON warehouse_entries(stock);
CREATE INDEX IF NOT EXISTS idx_out_quantity ON warehouse_entries(out_quantity);

-- 5. 제약 조건 추가 (데이터 무결성)
-- stock은 0 이상이어야 함
ALTER TABLE warehouse_entries ADD CONSTRAINT chk_stock_positive CHECK (stock >= 0);

-- out_quantity는 0 이상이어야 함
ALTER TABLE warehouse_entries ADD CONSTRAINT chk_out_quantity_positive CHECK (out_quantity >= 0);

-- out_quantity는 quantity(입고 수량)를 초과할 수 없음
ALTER TABLE warehouse_entries ADD CONSTRAINT chk_out_quantity_limit CHECK (out_quantity <= quantity);

-- 6. 테이블 구조 확인
DESCRIBE warehouse_entries;

-- 7. 인덱스 확인
SHOW INDEX FROM warehouse_entries; 