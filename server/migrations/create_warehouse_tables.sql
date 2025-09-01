-- Warehouse 관련 테이블 생성 마이그레이션

-- 1. 입고 기록 테이블 생성
CREATE TABLE IF NOT EXISTS warehouse_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  entry_date DATE NOT NULL COMMENT '입고 날짜',
  shipping_date DATE NOT NULL COMMENT '출고 날짜',
  quantity INT NOT NULL COMMENT '입고 수량',
  status ENUM('입고중', '입고완료') DEFAULT '입고중' COMMENT '입고 상태',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_project_id (project_id),
  INDEX idx_entry_date (entry_date),
  INDEX idx_shipping_date (shipping_date),
  INDEX idx_status (status),
  
  FOREIGN KEY (project_id) REFERENCES mj_project(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='입고 기록 테이블';

-- 2. 입고 이미지 테이블 생성
CREATE TABLE IF NOT EXISTS warehouse_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL COMMENT '프로젝트 ID',
  entry_id INT NOT NULL COMMENT '입고 기록 ID',
  original_filename VARCHAR(255) NOT NULL COMMENT '원본 파일명',
  stored_filename VARCHAR(255) NOT NULL COMMENT '저장된 파일명',
  file_path VARCHAR(500) NOT NULL COMMENT '파일 경로',
  file_size INT NOT NULL COMMENT '파일 크기 (bytes)',
  mime_type VARCHAR(100) NOT NULL COMMENT 'MIME 타입',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_project_id (project_id),
  INDEX idx_entry_id (entry_id),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (project_id) REFERENCES mj_project(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES warehouse_entries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='입고 이미지 테이블';

-- 3. 테이블 생성 확인
SHOW TABLES LIKE 'warehouse_%';

-- 4. 테이블 구조 확인
DESCRIBE warehouse_entries;
DESCRIBE warehouse_images; 