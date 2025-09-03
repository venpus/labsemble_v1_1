# 📦 Box No Migration Guide

## 개요
`logistic_payment` 테이블에 `box_no` 필드를 추가하여 각 박스별로 고유한 식별자를 제공합니다.

## 🆕 추가된 필드

### `box_no`
- **타입**: `INT`
- **제약조건**: `NOT NULL`
- **기본값**: `1`
- **설명**: 박스 번호 (1부터 시작)
- **용도**: 동일한 `packing_code` 내에서 개별 박스를 구분

## 🗄️ 테이블 구조

### 기존 구조
```sql
CREATE TABLE logistic_payment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mj_packing_list_id INT NOT NULL,
  packing_code VARCHAR(255) NOT NULL,
  logistic_company VARCHAR(255),
  tracking_number VARCHAR(255),
  logistic_fee DECIMAL(10,2) DEFAULT 0.00,
  is_paid BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 새로운 구조
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🔑 인덱스 구조

### 기존 인덱스
- `idx_packing_code` (packing_code)
- `idx_logistic_company` (logistic_company)
- `idx_packing_code_list_id` (packing_code, mj_packing_list_id)
- `idx_company_packing_code` (logistic_company, packing_code)

### 새로 추가된 인덱스
- `idx_box_no` (box_no)
- `idx_packing_code_box_no` (packing_code, box_no)
- `idx_list_id_box_no` (mj_packing_list_id, box_no)

## 🚀 마이그레이션 실행

### 1. 자동 마이그레이션 (권장)
서버 재시작 시 자동으로 실행됩니다.

### 2. 수동 마이그레이션
```bash
cd server
node run-box-no-migration.js
```

## 📋 마이그레이션 단계

### 1단계: 컬럼 추가
```sql
ALTER TABLE logistic_payment 
ADD COLUMN box_no INT NOT NULL DEFAULT 1 COMMENT '박스 번호 (1부터 시작)';
```

### 2단계: 기존 데이터 업데이트
```sql
UPDATE logistic_payment SET box_no = 1 WHERE box_no IS NULL;
```

### 3단계: 인덱스 생성
```sql
-- 박스 번호 단일 인덱스
CREATE INDEX idx_box_no ON logistic_payment(box_no);

-- 포장코드와 박스번호 복합 인덱스
CREATE INDEX idx_packing_code_box_no ON logistic_payment(packing_code, box_no);

-- 리스트 ID와 박스번호 복합 인덱스
CREATE INDEX idx_list_id_box_no ON logistic_payment(mj_packing_list_id, box_no);
```

## 🔍 데이터 식별 방식

### 기존 방식
- `packing_code` + `mj_packing_list_id`로 고유 식별

### 새로운 방식
- `packing_code` + `mj_packing_list_id` + `box_no`로 고유 식별
- 동일한 포장코드 내에서 여러 박스를 구분 가능

## 📊 사용 예시

### 데이터 저장
```javascript
const saveData = {
  mj_packing_list_id: 1,
  packing_code: "PK001",
  logistic_company: "비전",
  box_no: 1,           // 첫 번째 박스
  tracking_number: "TN123",
  logistic_fee: 4100.00,
  is_paid: true,
  description: "인어공주키티 프로젝트"
};
```

### 데이터 조회
```sql
-- 특정 포장코드의 모든 박스 조회
SELECT * FROM logistic_payment 
WHERE packing_code = 'PK001' 
ORDER BY box_no;

-- 특정 박스만 조회
SELECT * FROM logistic_payment 
WHERE packing_code = 'PK001' AND box_no = 2;
```

## 🔄 API 변경사항

### PUT /api/logistic-payment/update
**요청 본문에 `box_no` 필드 추가**
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

### 데이터 검증
- `box_no`는 반드시 1 이상의 정수여야 함
- `packing_code` + `mj_packing_list_id` + `box_no` 조합으로 고유 식별

## ⚠️ 주의사항

### 1. 기존 데이터
- 기존 데이터의 `box_no`는 모두 `1`로 설정됨
- 기존 데이터와의 호환성 유지

### 2. 데이터 무결성
- `box_no`는 `NOT NULL` 제약조건
- 기본값 `1`로 설정되어 있어 기존 데이터에 영향 없음

### 3. 인덱스 중복
- 이미 존재하는 인덱스는 무시됨
- `ER_DUP_KEYNAME` 오류 발생 시 자동으로 처리

## 🧪 테스트

### 마이그레이션 확인
```sql
-- 테이블 구조 확인
DESCRIBE logistic_payment;

-- 인덱스 확인
SHOW INDEX FROM logistic_payment;

-- box_no 필드 확인
SELECT packing_code, box_no, COUNT(*) 
FROM logistic_payment 
GROUP BY packing_code, box_no;
```

### 데이터 저장 테스트
1. 클라이언트에서 `box_no`가 포함된 데이터 저장
2. 서버 로그에서 저장 성공 메시지 확인
3. 데이터베이스에서 저장된 데이터 확인

## 📈 성능 영향

### 인덱스 효과
- `box_no` 단일 인덱스: 박스 번호별 빠른 조회
- 복합 인덱스: 포장코드 + 박스번호 조합으로 최적화된 검색
- 기존 인덱스와 함께 사용하여 다양한 쿼리 패턴 지원

### 저장 성능
- 트랜잭션 기반 저장으로 데이터 일관성 보장
- 배치 처리로 대량 데이터 저장 시 성능 향상

## 🔮 향후 계획

### 1. 박스별 상세 정보
- 각 박스의 개별 물류 정보 관리
- 박스별 송장번호, 배송비, 결제상태 추적

### 2. 통계 및 리포트
- 박스별 물류 비용 분석
- 회사별 박스 수량 통계

### 3. 사용자 인터페이스
- 박스 번호별 데이터 편집
- 박스별 상태 관리

---

**마이그레이션 완료 후**: `logistic_payment` 테이블에서 각 박스를 개별적으로 관리할 수 있으며, 동일한 포장코드 내에서 여러 박스를 구분하여 처리할 수 있습니다. 