# 🔄 자동 마이그레이션 시스템

## 📋 개요

이 프로젝트는 서버가 시작될 때 자동으로 데이터베이스 마이그레이션을 실행하는 시스템을 구현하고 있습니다. 이를 통해 개발자나 운영자가 수동으로 마이그레이션을 실행할 필요 없이 서버 재시작만으로 데이터베이스 스키마를 최신 상태로 유지할 수 있습니다.

## 🚀 자동 마이그레이션 실행 과정

### 1. 서버 시작 시
```
🚀 서버 시작 시 자동 마이그레이션을 시작합니다...
🔄 데이터베이스 연결 테스트 중...
✅ 데이터베이스 연결 성공
🔄 factory_shipping_status 마이그레이션 시작...
✅ factory_shipping_status 마이그레이션 완료
🔄 warehouse 테이블 마이그레이션 시작...
✅ warehouse 테이블 마이그레이션 완료
🔄 Payment 관련 컬럼 마이그레이션 시작...
✅ Payment 관련 컬럼 마이그레이션 완료
🔄 warehouse stock 필드 마이그레이션 시작...
✅ warehouse stock 필드 마이그레이션 완료
🎉 모든 마이그레이션이 완료되었습니다!
✅ 자동 마이그레이션이 완료되었습니다. 서버가 정상적으로 시작됩니다.
```

### 2. 마이그레이션 순서
1. **factory_shipping_status 필드** - MJ 프로젝트 공장 출고 상태
2. **warehouse 테이블** - 입고/출고 관련 테이블 생성
3. **Payment 관련 컬럼** - 결제 관련 필드들
4. **warehouse stock 필드** - 재고 및 출고 수량 관리

## 🔧 구현된 마이그레이션

### warehouse_entries 테이블 stock 필드

#### 추가된 필드
- **`stock`**: 현재 사용 가능한 재고 수량 (INT, DEFAULT 0)
- **`out_quantity`**: 출고된 수량 (INT, DEFAULT 0)

#### 제약조건
- `stock >= 0`: 재고는 음수가 될 수 없음
- `out_quantity >= 0`: 출고수량은 음수가 될 수 없음
- `out_quantity <= quantity`: 출고수량은 입고수량을 초과할 수 없음

#### 인덱스
- `idx_stock`: stock 필드 검색 성능 향상
- `idx_out_quantity`: out_quantity 필드 검색 성능 향상

#### 초기값 설정
- 기존 데이터의 `stock` = `quantity` (입고 수량)
- 기존 데이터의 `out_quantity` = 0 (출고 수량)

## 📊 마이그레이션 상태 확인

### 1. 전체 마이그레이션 상태
```bash
GET /api/migration/status
```

#### 응답 예시
```json
{
  "migration_status": {
    "has_additional_costs": true,
    "has_unit_price": true,
    "has_unit_weight": true,
    "has_packaging_method": true,
    "has_box_dimensions": true,
    "has_box_weight": true,
    "has_delivery_days": true,
    "has_actual_order_date": true,
    "has_expected_shipping_date": true,
    "has_actual_shipping_date": true,
    "has_completed_orders": true,
    "has_completed_factory_shipping": true,
    "total_projects": 25,
    "warehouse_stock": {
      "has_stock_fields": true,
      "total_entries": 15,
      "entries_with_stock": 15
    }
  }
}
```

### 2. warehouse stock 필드 상세 상태
```bash
GET /api/test/warehouse-stock
```

#### 응답 예시
```json
{
  "message": "warehouse stock 필드 상태 확인",
  "table_structure": {
    "has_stock_field": true,
    "has_out_quantity_field": true,
    "total_columns": 9
  },
  "sample_data": [
    {
      "id": 1,
      "project_id": 1,
      "quantity": 100,
      "stock": 80,
      "out_quantity": 20,
      "entry_date": "2024-01-15",
      "status": "입고완료"
    }
  ],
  "columns": [
    {
      "field": "id",
      "type": "int(11)",
      "null": "NO",
      "default": null,
      "comment": ""
    },
    {
      "field": "stock",
      "type": "int(11)",
      "null": "YES",
      "default": "0",
      "comment": "현재 재고 수량"
    }
  ]
}
```

## 🛠️ 수동 마이그레이션 실행

### 1. 전체 마이그레이션
```bash
cd server
npm run migrate
```

### 2. 특정 마이그레이션
```bash
# warehouse stock 필드만
npm run migrate:stock

# 패킹리스트 필드만
npm run migrate:packing-list
```

## 🔍 마이그레이션 로그 확인

### 1. 서버 콘솔
서버 시작 시 마이그레이션 진행 상황이 실시간으로 표시됩니다.

### 2. 로그 레벨
- ✅ **성공**: 마이그레이션 완료
- ℹ️ **정보**: 이미 존재하는 필드/테이블
- ⚠️ **경고**: 일시적 오류 (자동으로 재시도)
- ❌ **오류**: 치명적 오류 (마이그레이션 실패)

## 🚨 오류 처리

### 1. 자동 재시도
- 일부 오류는 자동으로 재시도됩니다
- 이미 존재하는 필드나 인덱스는 건너뜁니다

### 2. 서버 계속 실행
- 마이그레이션 실패 시에도 서버는 계속 실행됩니다
- 일부 기능이 제한될 수 있습니다

### 3. 수동 복구
```bash
# 데이터베이스 연결 확인
npm run test:db

# 특정 마이그레이션 재실행
npm run migrate:stock
```

## 📝 마이그레이션 추가 방법

### 1. 새로운 마이그레이션 함수 생성
```javascript
// database.js에 함수 추가
async function migrateNewFeature() {
  const connection = await pool.getConnection();
  try {
    // 마이그레이션 로직
    return { success: true, message: '마이그레이션 완료' };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}
```

### 2. initializeDatabase 함수에 추가
```javascript
// warehouse stock 필드 마이그레이션 실행
console.log('🔄 새로운 기능 마이그레이션 시작...');
const newFeatureResult = await migrateNewFeature();
if (newFeatureResult.success) {
  console.log('✅ 새로운 기능 마이그레이션 완료:', newFeatureResult.message);
} else {
  console.error('❌ 새로운 기능 마이그레이션 실패:', newFeatureResult.error);
}
```

### 3. 상태 확인 엔드포인트에 추가
```javascript
// migration status에 새로운 상태 추가
new_feature: {
  has_new_field: true,
  total_items: 10
}
```

## 🎯 장점

### 1. 자동화
- 서버 재시작 시 자동 실행
- 수동 개입 불필요

### 2. 안전성
- 이미 존재하는 필드는 건너뜀
- 오류 발생 시에도 서버 계속 실행

### 3. 모니터링
- 실시간 진행 상황 확인
- 상세한 상태 정보 제공

### 4. 확장성
- 새로운 마이그레이션 쉽게 추가
- 모듈화된 구조

## 🔮 향후 계획

### 1. 마이그레이션 버전 관리
- 마이그레이션 히스토리 추적
- 롤백 기능 구현

### 2. 백업 및 복구
- 마이그레이션 전 자동 백업
- 실패 시 자동 복구

### 3. 성능 최적화
- 대용량 테이블 배치 처리
- 비동기 마이그레이션

---

## 📞 지원

마이그레이션 관련 문제가 발생하면 다음을 확인하세요:

1. **로그 확인**: 서버 콘솔의 마이그레이션 로그
2. **상태 확인**: `/api/migration/status` 엔드포인트
3. **수동 실행**: `npm run migrate:stock` 등
4. **데이터베이스 연결**: `npm run test:db`

자동 마이그레이션 시스템으로 데이터베이스 관리가 훨씬 간편해졌습니다! 🎉✨ 