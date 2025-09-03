# 🚚 Logistic Payment Migration Guide

## 개요
`logistic_payment` 테이블을 생성하여 물류 결제 정보를 관리합니다. 이 테이블은 `mj_packing_list`와 연관되어 각 포장 리스트의 물류 비용, 결제 상태, 송장번호 등을 추적합니다.

## 🗄️ 테이블 구조

### 최종 테이블 구조
```sql
CREATE TABLE logistic_payment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mj_packing_list_id INT NOT NULL,
  packing_code VARCHAR(255) NOT NULL,
  logistic_company VARCHAR(255),
  box_no INT NOT NULL DEFAULT 1 COMMENT '박스 번호 (1부터 시작)',
  tracking_number VARCHAR(255),
  logistic_fee DECIMAL(10,2) DEFAULT 0.00,
  is_paid BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 외래키 제약조건
  FOREIGN KEY (mj_packing_list_id) REFERENCES mj_packing_list(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_packing_code (packing_code),
  INDEX idx_logistic_company (logistic_company),
  INDEX idx_box_no (box_no),
  INDEX idx_packing_code_list_id (packing_code, mj_packing_list_id),
  INDEX idx_company_packing_code (logistic_company, packing_code),
  INDEX idx_packing_code_box_no (packing_code, box_no),
  INDEX idx_list_id_box_no (mj_packing_list_id, box_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 필드 설명

| 필드명 | 타입 | 제약조건 | 기본값 | 설명 |
|--------|------|----------|--------|------|
| `id` | INT | AUTO_INCREMENT, PRIMARY KEY | - | 고유 식별자 |
| `mj_packing_list_id` | INT | NOT NULL, FOREIGN KEY | - | mj_packing_list 테이블 참조 |
| `packing_code` | VARCHAR(255) | NOT NULL | - | 포장 코드 |
| `logistic_company` | VARCHAR(255) | - | NULL | 물류 회사명 |
| `box_no` | INT | NOT NULL | 1 | 박스 번호 (1부터 시작) |
| `tracking_number` | VARCHAR(255) | - | NULL | 송장 번호 |
| `logistic_fee` | DECIMAL(10,2) | - | 0.00 | 물류 비용 |
| `is_paid` | BOOLEAN | - | FALSE | 결제 여부 |
| `description` | TEXT | - | NULL | 설명 |
| `created_at` | TIMESTAMP | - | CURRENT_TIMESTAMP | 생성 시간 |
| `updated_at` | TIMESTAMP | - | CURRENT_TIMESTAMP | 수정 시간 |

## 🔑 인덱스 구조

### 단일 컬럼 인덱스
- `idx_packing_code`: 포장코드별 빠른 조회
- `idx_logistic_company`: 물류회사별 빠른 조회
- `idx_box_no`: 박스번호별 빠른 조회

### 복합 인덱스
- `idx_packing_code_list_id`: 포장코드 + 리스트ID 조합 조회
- `idx_company_packing_code`: 물류회사 + 포장코드 조합 조회
- `idx_packing_code_box_no`: 포장코드 + 박스번호 조합 조회
- `idx_list_id_box_no`: 리스트ID + 박스번호 조합 조회

## 🚀 마이그레이션 실행

### 자동 마이그레이션 (권장)
서버 재시작 시 자동으로 실행됩니다.

### 수동 마이그레이션
```bash
cd server
node run-logistic-payment-migration.js
```

## 📋 마이그레이션 단계

### 1단계: 테이블 생성
- `logistic_payment` 테이블이 존재하지 않는 경우 새로 생성
- 모든 필드와 인덱스를 포함하여 생성

### 2단계: 기존 테이블 구조 업데이트
- 테이블이 이미 존재하는 경우 필요한 컬럼과 인덱스 추가
- 기존 데이터는 보존

### 3단계: box_no 필드 처리
- `box_no` 필드가 추가된 경우 기존 데이터를 1로 설정
- 기본값 1로 설정하여 데이터 무결성 보장

## 🔍 데이터 식별 방식

### 고유 식별자
- `packing_code` + `mj_packing_list_id` + `box_no` 조합으로 고유 식별
- 동일한 포장코드 내에서 여러 박스를 개별적으로 관리 가능

### 데이터 관계
- `mj_packing_list_id`: `mj_packing_list` 테이블과의 외래키 관계
- `packing_code`: 포장 리스트의 포장 코드 참조
- `box_no`: 개별 박스 번호 (1부터 시작)

## 📊 사용 예시

### 데이터 저장
```javascript
const saveData = {
  mj_packing_list_id: 1,
  packing_code: "PK001",
  logistic_company: "비전",
  box_no: 1,           // 첫 번째 박스
  tracking_number: "TN123456789",
  logistic_fee: 4100.00,
  is_paid: true,
  description: "인어공주키티 프로젝트"
};
```

### 데이터 조회
```sql
-- 특정 날짜의 모든 물류 결제 정보
SELECT * FROM logistic_payment lp
JOIN mj_packing_list mpl ON lp.mj_packing_list_id = mpl.id
WHERE mpl.pl_date = '2025-08-30'
ORDER BY lp.packing_code, lp.box_no;

-- 특정 포장코드의 모든 박스
SELECT * FROM logistic_payment 
WHERE packing_code = 'PK001' 
ORDER BY box_no;

-- 특정 박스만 조회
SELECT * FROM logistic_payment 
WHERE packing_code = 'PK001' AND box_no = 2;
```

## 🔄 API 엔드포인트

### PUT /api/logistic-payment/update
물류 결제 정보 저장/업데이트

**요청 본문**
```json
{
  "data": [
    {
      "mj_packing_list_id": 1,
      "packing_code": "PK001",
      "logistic_company": "비전",
      "box_no": 1,
      "tracking_number": "TN123",
      "logistic_fee": 4100.00,
      "is_paid": true,
      "description": "인어공주키티 프로젝트"
    }
  ],
  "date": "2025-08-30"
}
```

**응답**
```json
{
  "success": true,
  "message": "물류 결제 정보가 성공적으로 저장되었습니다.",
  "data": {
    "saved": 1,
    "updated": 0,
    "total": 1,
    "errors": null
  }
}
```

### GET /api/logistic-payment/by-date/:date
특정 날짜의 물류 결제 정보 조회

**응답**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "mj_packing_list_id": 1,
      "packing_code": "PK001",
      "logistic_company": "비전",
      "box_no": 1,
      "tracking_number": "TN123",
      "logistic_fee": 4100.00,
      "is_paid": true,
      "description": "인어공주키티 프로젝트",
      "created_at": "2025-08-30T10:00:00.000Z",
      "updated_at": "2025-08-30T10:00:00.000Z"
    }
  ]
}
```

### DELETE /api/logistic-payment/:id
개별 물류 결제 정보 삭제

## ⚠️ 주의사항

### 1. 데이터 무결성
- `mj_packing_list_id`는 반드시 `mj_packing_list` 테이블에 존재해야 함
- `packing_code`는 필수 필드
- `box_no`는 1 이상의 정수여야 함

### 2. 외래키 제약조건
- `ON DELETE CASCADE`: `mj_packing_list` 레코드 삭제 시 연관된 `logistic_payment` 레코드도 삭제

### 3. 인덱스 관리
- 이미 존재하는 인덱스는 무시됨
- 중복 인덱스 생성 시도 시 오류 없이 처리

## 🧪 테스트

### 마이그레이션 확인
```sql
-- 테이블 구조 확인
DESCRIBE logistic_payment;

-- 인덱스 확인
SHOW INDEX FROM logistic_payment;

-- 외래키 제약조건 확인
SELECT 
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'logistic_payment' 
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### 데이터 저장 테스트
1. 클라이언트에서 `box_no`가 포함된 데이터 저장
2. 서버 로그에서 저장 성공 메시지 확인
3. 데이터베이스에서 저장된 데이터 확인
4. 외래키 제약조건 검증

## 📈 성능 최적화

### 인덱스 전략
- 단일 컬럼 인덱스: 개별 필드별 빠른 조회
- 복합 인덱스: 자주 사용되는 조합 쿼리 최적화
- 외래키 인덱스: JOIN 성능 향상

### 쿼리 최적화
- `packing_code` + `box_no` 조합으로 박스별 빠른 조회
- `mj_packing_list_id` + `box_no` 조합으로 리스트별 박스 조회
- 날짜별 조회 시 JOIN을 통한 효율적인 데이터 접근

## 🔮 향후 계획

### 1. 박스별 상세 관리
- 각 박스의 개별 물류 정보 관리
- 박스별 송장번호, 배송비, 결제상태 추적

### 2. 통계 및 리포트
- 박스별 물류 비용 분석
- 회사별 박스 수량 통계
- 월별/분기별 물류 비용 추이

### 3. 사용자 인터페이스
- 박스 번호별 데이터 편집
- 박스별 상태 관리
- 드래그 앤 드롭으로 박스 순서 변경

---

**마이그레이션 완료 후**: `logistic_payment` 테이블에서 각 박스를 개별적으로 관리할 수 있으며, 동일한 포장코드 내에서 여러 박스를 구분하여 처리할 수 있습니다. 박스별로 송장번호, 배송비, 결제상태를 추적할 수 있어 물류 관리의 정확성과 효율성이 크게 향상됩니다. 