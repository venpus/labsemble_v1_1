# 패킹 리스트 도착 상태 관리 API

## 개요
패킹 리스트의 도착 상태를 관리하는 API입니다. `is_arrived`와 `arrived_date` 필드를 통해 도착 여부와 도착 날짜를 추적할 수 있습니다.

## API 엔드포인트

### 1. 개별 패킹 리스트 도착 상태 업데이트

**엔드포인트:** `PUT /api/packing-list/:id/arrival`

**설명:** 특정 패킹 리스트의 도착 상태를 업데이트합니다.

**인증:** JWT 토큰 필요

**요청 파라미터:**
- `id` (path): 패킹 리스트 ID

**요청 본문:**
```json
{
  "is_arrived": true,
  "arrived_date": "2025-09-12"
}
```

**응답 (성공):**
```json
{
  "success": true,
  "message": "도착 상태가 성공적으로 업데이트되었습니다.",
  "data": {
    "id": 123,
    "is_arrived": true,
    "arrived_date": "2025-09-12"
  }
}
```

**응답 (오류):**
```json
{
  "success": false,
  "error": "패킹 리스트를 찾을 수 없습니다."
}
```

### 2. 일괄 패킹 리스트 도착 상태 업데이트

**엔드포인트:** `PUT /api/packing-list/batch-arrival`

**설명:** 여러 패킹 리스트의 도착 상태를 일괄 업데이트합니다.

**인증:** JWT 토큰 필요

**요청 본문:**
```json
{
  "packing_list_ids": [123, 124, 125],
  "is_arrived": true,
  "arrived_date": "2025-09-12"
}
```

**응답 (성공):**
```json
{
  "success": true,
  "message": "3개의 패킹 리스트 도착 상태가 성공적으로 업데이트되었습니다.",
  "data": {
    "updated_count": 3,
    "is_arrived": true,
    "arrived_date": "2025-09-12"
  }
}
```

**응답 (오류):**
```json
{
  "success": false,
  "error": "패킹 리스트 ID 목록이 필요합니다."
}
```

## 데이터베이스 필드

### mj_packing_list 테이블 추가 필드

| 필드명 | 타입 | 기본값 | 설명 |
|--------|------|--------|------|
| `is_arrived` | BOOLEAN | FALSE | 도착 여부 |
| `arrived_date` | DATE | NULL | 도착 날짜 |

### 인덱스

- `idx_mj_packing_list_is_arrived`: `is_arrived` 필드 인덱스
- `idx_mj_packing_list_arrived_date`: `arrived_date` 필드 인덱스  
- `idx_mj_packing_list_arrival_status`: `(is_arrived, arrived_date)` 복합 인덱스

## 재고 조회 API 업데이트

재고 조회 API (`GET /api/inventory/product-inventory-status`)에 `arrived_quantity` 필드가 추가되었습니다.

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "project_id": 3,
      "project_name": "몬치치 토끼",
      "total_quantity": 2000,
      "scheduled_entry_quantity": 2000,
      "completed_entry_quantity": 0,
      "shipping_quantity": 8740,
      "delivered_quantity": 0,
      "arrived_quantity": 0,
      "current_status": "입고예정"
    }
  ]
}
```

## 사용 예시

### 1. 개별 도착 상태 업데이트
```javascript
const response = await fetch('/api/packing-list/123/arrival', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    is_arrived: true,
    arrived_date: '2025-09-12'
  })
});
```

### 2. 일괄 도착 상태 업데이트
```javascript
const response = await fetch('/api/packing-list/batch-arrival', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    packing_list_ids: [123, 124, 125],
    is_arrived: true,
    arrived_date: '2025-09-12'
  })
});
```

## 주의사항

1. **날짜 형식**: `arrived_date`는 `YYYY-MM-DD` 형식으로 전송해야 합니다.
2. **권한**: 모든 API는 인증된 사용자만 접근 가능합니다.
3. **데이터 검증**: 패킹 리스트 ID가 존재하지 않으면 404 오류를 반환합니다.
4. **일괄 업데이트**: 일괄 업데이트 시 모든 패킹 리스트 ID가 유효해야 합니다.
