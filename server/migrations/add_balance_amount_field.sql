-- mj_project 테이블에 balanceAmount 필드 추가
ALTER TABLE mj_project 
ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(15,2) DEFAULT 0 
COMMENT '잔금 총액 (수수료 + 배송비 + 추가비용)';

-- 기존 데이터에 대한 balance_amount 계산 및 업데이트
UPDATE mj_project 
SET balance_amount = COALESCE(fee, 0) + COALESCE(factory_shipping_cost, 0) + 
    CASE 
        WHEN additional_cost_items IS NOT NULL AND additional_cost_items != '[]' 
        THEN (
            SELECT COALESCE(SUM(CAST(JSON_EXTRACT(value, '$.cost') AS DECIMAL(15,2))), 0)
            FROM JSON_TABLE(additional_cost_items, '$[*]' COLUMNS (value JSON PATH '$')) AS jt
        )
        ELSE 0 
    END
WHERE balance_amount IS NULL OR balance_amount = 0;

-- balance_amount 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_balance_amount ON mj_project(balance_amount); 