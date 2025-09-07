-- 앱 버전 관리 테이블 생성
CREATE TABLE IF NOT EXISTS app_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    version_code INT NOT NULL UNIQUE,
    version_name VARCHAR(50) NOT NULL,
    download_url VARCHAR(500) NOT NULL,
    release_notes TEXT,
    force_update BOOLEAN DEFAULT FALSE,
    min_sdk INT DEFAULT 33,
    target_sdk INT DEFAULT 36,
    file_size BIGINT,
    checksum VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_version_code (version_code),
    INDEX idx_is_active (is_active)
);

-- APK 업로드 디렉토리 생성 (서버 시작 시 자동 생성)
-- mkdir -p uploads/apk

-- 초기 데이터 삽입 (현재 버전)
INSERT INTO app_versions (
    version_code, 
    version_name, 
    download_url, 
    release_notes, 
    force_update,
    min_sdk,
    target_sdk,
    file_size,
    checksum
) VALUES (
    1, 
    '1.0', 
    'v1.apk', 
    'MJ유통 매니저 첫 번째 버전\n- 기본 기능 구현\n- 상품 조회 기능\n- 결제 조회 기능\n- 달력 기능', 
    FALSE,
    33,
    36,
    0,
    ''
) ON DUPLICATE KEY UPDATE 
    version_name = VALUES(version_name),
    release_notes = VALUES(release_notes);
