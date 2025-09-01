-- finance_incoming 테이블에 화폐 단위별 금액 필드 추가
ALTER TABLE finance_incoming 
ADD COLUMN amount_krw DECIMAL(15,2) DEFAULT 0.00 COMMENT '원화 금액',
ADD COLUMN amount_usd DECIMAL(15,2) DEFAULT 0.00 COMMENT '달러 금액',
ADD COLUMN amount_cny DECIMAL(15,2) DEFAULT 0.00 COMMENT '위안 금액';

-- 기존 데이터에 대한 기본값 설정
UPDATE finance_incoming 
SET 
  amount_krw = CASE 
    WHEN currency = 'KRW' THEN amount 
    WHEN currency = 'USD' THEN amount * exchange_rate 
    WHEN currency = 'CNY' THEN amount * exchange_rate 
    ELSE 0 
  END,
  amount_usd = CASE 
    WHEN currency = 'KRW' THEN amount / 1350 
    WHEN currency = 'USD' THEN amount 
    WHEN currency = 'CNY' THEN amount * exchange_rate / 1350 
    ELSE 0 
  END,
  amount_cny = CASE 
    WHEN currency = 'KRW' THEN amount / 193 
    WHEN currency = 'USD' THEN amount * exchange_rate / 193 
    WHEN currency = 'CNY' THEN amount 
    ELSE 0 
  END;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_amount_krw ON finance_incoming(amount_krw);
CREATE INDEX IF NOT EXISTS idx_amount_usd ON finance_incoming(amount_usd);
CREATE INDEX IF NOT EXISTS idx_amount_cny ON finance_incoming(amount_cny);

-- 테이블 설명 업데이트
ALTER TABLE finance_incoming COMMENT = '입금 내역 테이블 (모든 화폐 단위별 금액 포함)'; 