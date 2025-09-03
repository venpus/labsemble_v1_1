-- MJ 프로젝트 결제 정보 테이블 생성 (JSON 형식)
-- 실행 날짜: 2025-01-15

-- 기존 테이블이 있다면 삭제 (개발 환경에서만 사용)
-- DROP TABLE IF EXISTS mj_project_payments;

-- mj_project_payments 테이블 생성 (JSON 형식)
CREATE TABLE IF NOT EXISTS mj_project_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  payment_status JSON DEFAULT NULL COMMENT '결제 상태 (advance, interim1, interim2, interim3, balance)',
  payment_dates JSON DEFAULT NULL COMMENT '결제 날짜 (advance, interim1, interim2, interim3, balance)',
  payment_amounts JSON DEFAULT NULL COMMENT '결제 금액 (advance, interim1, interim2, interim3, balance)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 외래키 제약조건
  FOREIGN KEY (project_id) REFERENCES mj_project(id) ON DELETE CASCADE,
  
  -- 유니크 제약조건 (프로젝트당 하나의 레코드만)
  UNIQUE KEY unique_project_payment (project_id),
  
  -- 인덱스 추가 (성능 최적화)
  INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='MJ 프로젝트 결제 정보 테이블 (JSON 형식)';

-- 기존 mj_project 데이터를 mj_project_payments로 마이그레이션 (JSON 형식)
INSERT IGNORE INTO mj_project_payments (project_id, payment_status, payment_dates, payment_amounts)
SELECT 
  id as project_id,
  JSON_OBJECT(
    'advance', CASE WHEN JSON_EXTRACT(payment_status, '$.advance') = true THEN true ELSE false END,
    'interim1', CASE WHEN JSON_EXTRACT(payment_status, '$.interim1') = true THEN true ELSE false END,
    'interim2', CASE WHEN JSON_EXTRACT(payment_status, '$.interim2') = true THEN true ELSE false END,
    'interim3', CASE WHEN JSON_EXTRACT(payment_status, '$.interim3') = true THEN true ELSE false END,
    'balance', CASE WHEN JSON_EXTRACT(payment_status, '$.balance') = true THEN true ELSE false END
  ) as payment_status,
  JSON_OBJECT(
    'advance', JSON_EXTRACT(payment_dates, '$.advance'),
    'interim1', JSON_EXTRACT(payment_dates, '$.interim1'),
    'interim2', JSON_EXTRACT(payment_dates, '$.interim2'),
    'interim3', JSON_EXTRACT(payment_dates, '$.interim3'),
    'balance', JSON_EXTRACT(payment_dates, '$.balance')
  ) as payment_dates,
  JSON_OBJECT(
    'advance', COALESCE(advance_payment, 0),
    'interim1', 0,
    'interim2', 0,
    'interim3', 0,
    'balance', COALESCE(balance_amount, 0)
  ) as payment_amounts
FROM mj_project 
WHERE (advance_payment IS NOT NULL AND advance_payment > 0) 
   OR (balance_amount IS NOT NULL AND balance_amount > 0)
   OR payment_status IS NOT NULL;

-- 모든 프로젝트에 대해 기본 결제 정보 레코드 생성 (데이터가 없는 경우)
INSERT IGNORE INTO mj_project_payments (project_id, payment_status, payment_dates, payment_amounts)
SELECT 
  id as project_id,
  JSON_OBJECT(
    'advance', false,
    'interim1', false,
    'interim2', false,
    'interim3', false,
    'balance', false
  ) as payment_status,
  JSON_OBJECT(
    'advance', null,
    'interim1', null,
    'interim2', null,
    'interim3', null,
    'balance', null
  ) as payment_dates,
  JSON_OBJECT(
    'advance', 0,
    'interim1', 0,
    'interim2', 0,
    'interim3', 0,
    'balance', 0
  ) as payment_amounts
FROM mj_project 
WHERE id NOT IN (SELECT project_id FROM mj_project_payments);

-- 마이그레이션 완료 로그
SELECT 
  'Migration completed' as status,
  COUNT(*) as total_records,
  COUNT(CASE WHEN JSON_EXTRACT(payment_status, '$.advance') = true THEN 1 END) as advance_paid_count,
  COUNT(CASE WHEN JSON_EXTRACT(payment_status, '$.balance') = true THEN 1 END) as balance_paid_count
FROM mj_project_payments;