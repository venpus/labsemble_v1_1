-- logistic_payment 테이블 생성
CREATE TABLE IF NOT EXISTS logistic_payment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mj_packing_list_id INT NOT NULL,
    packing_code VARCHAR(255) NOT NULL,
    logistic_company VARCHAR(255),
    tracking_number VARCHAR(255),
    logistic_fee DECIMAL(10,2) DEFAULT 0.00,
    is_paid BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 외래키 제약조건
    FOREIGN KEY (mj_packing_list_id) REFERENCES mj_packing_list(id) ON DELETE CASCADE,
    
    -- 인덱스 생성
    INDEX idx_mj_packing_list_id (mj_packing_list_id),
    INDEX idx_packing_code (packing_code),
    INDEX idx_logistic_company (logistic_company),
    INDEX idx_tracking_number (tracking_number),
    INDEX idx_is_paid (is_paid),
    INDEX idx_created_at (created_at),
    
    -- packing_code와 mj_packing_list_id의 복합 인덱스
    INDEX idx_packing_code_list_id (packing_code, mj_packing_list_id),
    
    -- logistic_company와 packing_code의 복합 인덱스
    INDEX idx_company_packing_code (logistic_company, packing_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 생성 확인
SELECT 'logistic_payment 테이블이 성공적으로 생성되었습니다.' AS message; 