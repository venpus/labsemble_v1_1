# Factory Shipping Status & Warehouse Tables 마이그레이션 가이드

## 개요
이 가이드는 다음 마이그레이션을 포함합니다:
- `factory_shipping_status` 필드: 공장 출고 상태를 저장하는 새로운 데이터베이스 필드
- `warehouse_entries` 테이블: 입고 기록을 저장하는 새로운 테이블
- `warehouse_images` 테이블: 입고 이미지를 저장하는 새로운 테이블

## 마이그레이션 방법

### 방법 1: 서버 시작 시 자동 실행 (권장)
서버를 시작하면 `database.js`에서 자동으로 마이그레이션이 실행됩니다.

```bash
npm start
# 또는
node server/index.js
```

**콘솔 출력 예시:**
```
🔄 데이터베이스 연결 테스트 중...
✅ 데이터베이스 연결 성공
🔄 factory_shipping_status 마이그레이션 시작...
✅ factory_shipping_status 필드 추가 완료
✅ 기존 데이터 기본값 설정 완료
✅ factory_shipping_status 마이그레이션 완료: factory_shipping_status 필드 마이그레이션이 완료되었습니다.
🔄 warehouse 테이블 마이그레이션 시작...
✅ warehouse_entries 테이블 생성 완료
✅ warehouse_images 테이블 생성 완료
✅ warehouse 테이블 마이그레이션 완료: warehouse 관련 테이블 마이그레이션이 완료되었습니다.
🎉 모든 마이그레이션이 완료되었습니다!
```

### 방법 2: 수동 스크립트 실행
별도로 마이그레이션을 실행하려면:

```bash
# 개별 마이그레이션
node -e "const { migrateFactoryShippingStatus, migrateWarehouseTables } = require('./config/database'); Promise.all([migrateFactoryShippingStatus(), migrateWarehouseTables()]).then(console.log).catch(console.error)"

# 또는 전체 마이그레이션
npm run migrate
```

**콘솔 출력 예시:**
```
🔄 factory_shipping_status 필드 마이그레이션 시작...
✅ 마이그레이션 결과: factory_shipping_status 필드 마이그레이션이 완료되었습니다.
🆕 새 필드가 추가되었습니다.
```

## 데이터베이스 스키마

### 1. factory_shipping_status 필드 (mj_project 테이블)
```sql
ALTER TABLE mj_project 
ADD COLUMN factory_shipping_status VARCHAR(50) DEFAULT '출고 대기' 
COMMENT '공장 출고 상태 (정시출고, 조기출고, 출고연기, 출고 대기)';
```

### 2. warehouse_entries 테이블
```sql
CREATE TABLE warehouse_entries (
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
```

### 3. warehouse_images 테이블
```sql
CREATE TABLE warehouse_images (
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
```

### 필드 설명
- **필드명**: `factory_shipping_status`
- **타입**: `VARCHAR(50)`
- **기본값**: `'출고 대기'`
- **설명**: 공장 출고 상태를 저장하는 필드

### 저장되는 값들
1. **정시출고**: 예상일과 실제일이 일치
2. **n일 조기출고**: 실제일이 예상일보다 빠름 (예: "2일 조기출고")
3. **n일 출고연기**: 실제일이 예상일보다 늦음 (예: "3일 출고연기")
4. **출고 대기**: 아직 실제일이 설정되지 않음

## 자동 저장 기능

### 언제 자동 저장되는가?
- `actual_factory_shipping_date` (공장출고 실제일) 변경 시
- 예상일과 실제일을 비교하여 자동으로 상태 계산
- 계산된 상태가 `factory_shipping_status` 필드에 자동 저장

### 저장되는 데이터 예시
```javascript
// 실제일이 예상일보다 2일 빠른 경우
{
  actual_factory_shipping_date: '2025-08-30',
  expected_factory_shipping_date: '2025-09-01',
  factory_shipping_status: '2일 조기출고'
}

// 실제일이 예상일과 일치하는 경우
{
  actual_factory_shipping_date: '2025-09-01',
  expected_factory_shipping_date: '2025-09-01',
  factory_shipping_status: '정시출고'
}
```

## 문제 해결

### 마이그레이션이 실행되지 않는 경우
1. 데이터베이스 연결 확인
2. 서버 로그에서 오류 메시지 확인
3. 수동으로 `run-migration.js` 실행

### 필드가 이미 존재하는 경우
```
ℹ️ factory_shipping_status 필드가 이미 존재합니다.
✅ 마이그레이션 완료: factory_shipping_status 필드가 이미 존재합니다.
```

### 오류가 발생하는 경우
```
❌ factory_shipping_status 마이그레이션 오류: [오류 내용]
❌ 마이그레이션 실패: [오류 메시지]
```

## 환경 변수 설정

### .env 파일 생성
```bash
# server/.env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=labsemble
```

### 환경 변수 확인
- `DB_HOST`: 데이터베이스 호스트
- `DB_USER`: 데이터베이스 사용자명
- `DB_PASSWORD`: 데이터베이스 비밀번호
- `DB_NAME`: 데이터베이스 이름

## 주의사항

1. **권한**: 데이터베이스에 ALTER TABLE 권한이 필요합니다
2. **백업**: 마이그레이션 전 데이터베이스 백업 권장
3. **테스트**: 개발 환경에서 먼저 테스트 후 운영 환경 적용
4. **모니터링**: 마이그레이션 후 로그 확인하여 성공 여부 확인 