-- 지급 요청 테이블 생성
-- 1. 프로젝트 기반 지급 요청 테이블 (선금, 잔금)
CREATE TABLE IF NOT EXISTS mj_payment_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    payment_type ENUM('advance', 'balance') NOT NULL COMMENT 'advance: 선금, balance: 잔금',
    amount DECIMAL(15,2) NOT NULL COMMENT '지급 요청 금액 (CNY)',
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '요청일시',
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending' COMMENT '처리 상태',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project_id (project_id),
    INDEX idx_payment_type (payment_type),
    INDEX idx_status (status),
    INDEX idx_request_date (request_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 기반 지급 요청 테이블';

-- 2. 배송비 지급 요청 테이블
CREATE TABLE IF NOT EXISTS mj_shipping_payment_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pl_date DATE NOT NULL COMMENT '출고일',
    total_boxes INT NOT NULL COMMENT '총 박스 수',
    total_amount DECIMAL(15,2) NOT NULL COMMENT '총 배송비 금액 (CNY)',
    packing_codes TEXT NOT NULL COMMENT '포장코드 목록 (쉼표로 구분)',
    logistic_companies TEXT NOT NULL COMMENT '물류회사 목록 (쉼표로 구분)',
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '요청일시',
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending' COMMENT '처리 상태',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pl_date (pl_date),
    INDEX idx_status (status),
    INDEX idx_request_date (request_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송비 지급 요청 테이블';

