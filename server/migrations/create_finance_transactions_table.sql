-- 금융 거래 테이블 생성
CREATE TABLE IF NOT EXISTS finance_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  transaction_date DATE NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'KRW',
  exchange_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
  amount DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 외래 키 제약 조건
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- 인덱스 추가
  INDEX idx_user_id (user_id),
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_currency (currency),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 설명 추가
ALTER TABLE finance_transactions COMMENT = '금융 거래 내역 테이블'; 