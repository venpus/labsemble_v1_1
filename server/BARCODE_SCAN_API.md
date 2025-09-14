# 바코드 스캔 API 문서

## 개요
바코드 스캔을 통한 입고 확인을 위한 3개의 API를 제공합니다.

---

## 1. 바코드 스캔 및 입고 확인 통합 API

### `POST /api/logistic-payment/scan-barcode`

**설명**: 바코드 번호를 입력받아 해당 물류 정보를 찾고, 자동으로 입고 확인을 처리합니다.

**인증**: Bearer Token 필요

**요청 본문**:
```json
{
  "barcode_number": "string (필수)",
  "arrived_by": "string (선택)"
}
```

**응답**:

**성공 (200)**:
```json
{
  "success": true,
  "message": "입고 확인이 완료되었습니다.",
  "data": {
    "id": 123,
    "packing_code": "PC001",
    "box_no": 1,
    "barcode_number": "BC123456",
    "tracking_number": "TN789012",
    "logistic_company": "CJ대한통운",
    "product_name": "상품명",
    "is_arrived": true,
    "arrived_date": "2024-01-15",
    "arrived_by": "바코드스캔"
  }
}
```

**바코드 없음 (404)**:
```json
{
  "success": false,
  "error": "해당 바코드 번호와 일치하는 물류 정보를 찾을 수 없습니다.",
  "barcode_number": "BC123456"
}
```

**이미 입고 확인됨 (409)**:
```json
{
  "success": false,
  "error": "이미 입고 확인된 바코드입니다.",
  "data": {
    "packing_code": "PC001",
    "box_no": 1,
    "arrived_date": "2024-01-15",
    "arrived_by": "바코드스캔"
  }
}
```

---

## 2. 바코드 유효성 검증 API

### `POST /api/logistic-payment/validate-barcode`

**설명**: 바코드 번호의 유효성을 검증하고 해당 물류 정보를 반환합니다. 입고 확인은 하지 않습니다.

**인증**: Bearer Token 필요

**요청 본문**:
```json
{
  "barcode_number": "string (필수)"
}
```

**응답**:

**성공 (200)**:
```json
{
  "success": true,
  "message": "바코드가 일치합니다.",
  "data": {
    "id": 123,
    "packing_code": "PC001",
    "box_no": 1,
    "barcode_number": "BC123456",
    "tracking_number": "TN789012",
    "logistic_company": "CJ대한통운",
    "product_name": "상품명",
    "is_arrived": false,
    "arrived_date": null,
    "arrived_by": null
  }
}
```

**바코드 없음 (404)**:
```json
{
  "success": false,
  "error": "해당 바코드 번호와 일치하는 물류 정보를 찾을 수 없습니다.",
  "barcode_number": "BC123456"
}
```

---

## 3. 바코드로 입고 확인 업데이트 API

### `POST /api/logistic-payment/update-arrival-by-barcode`

**설명**: 바코드 번호가 일치하는 경우에만 입고 확인을 업데이트합니다.

**인증**: Bearer Token 필요

**요청 본문**:
```json
{
  "barcode_number": "string (필수)",
  "arrived_by": "string (선택)"
}
```

**응답**:

**성공 (200)**:
```json
{
  "success": true,
  "message": "입고 확인이 성공적으로 업데이트되었습니다.",
  "data": {
    "id": 123,
    "packing_code": "PC001",
    "box_no": 1,
    "barcode_number": "BC123456",
    "is_arrived": true,
    "arrived_date": "2024-01-15",
    "arrived_by": "바코드스캔"
  }
}
```

**바코드 없음 (404)**:
```json
{
  "success": false,
  "error": "해당 바코드 번호와 일치하는 물류 정보를 찾을 수 없습니다.",
  "barcode_number": "BC123456"
}
```

**이미 입고 확인됨 (409)**:
```json
{
  "success": false,
  "error": "이미 입고 확인된 바코드입니다.",
  "data": {
    "packing_code": "PC001",
    "box_no": 1
  }
}
```

---

## 공통 에러 응답

**잘못된 요청 (400)**:
```json
{
  "success": false,
  "error": "바코드 번호를 입력해주세요."
}
```

**서버 오류 (500)**:
```json
{
  "success": false,
  "error": "바코드 스캔 처리 중 오류가 발생했습니다."
}
```

---

## 사용 예시

### JavaScript (Fetch API)

```javascript
// 1. 바코드 스캔 및 입고 확인
const scanBarcode = async (barcodeNumber, arrivedBy) => {
  try {
    const response = await fetch('/api/logistic-payment/scan-barcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        barcode_number: barcodeNumber,
        arrived_by: arrivedBy
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('입고 확인 완료:', result.data);
      return result.data;
    } else {
      console.error('입고 확인 실패:', result.error);
      return null;
    }
  } catch (error) {
    console.error('API 호출 오류:', error);
    return null;
  }
};

// 2. 바코드 유효성 검증
const validateBarcode = async (barcodeNumber) => {
  try {
    const response = await fetch('/api/logistic-payment/validate-barcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        barcode_number: barcodeNumber
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API 호출 오류:', error);
    return { success: false, error: error.message };
  }
};

// 3. 바코드로 입고 확인 업데이트
const updateArrivalByBarcode = async (barcodeNumber, arrivedBy) => {
  try {
    const response = await fetch('/api/logistic-payment/update-arrival-by-barcode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        barcode_number: barcodeNumber,
        arrived_by: arrivedBy
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API 호출 오류:', error);
    return { success: false, error: error.message };
  }
};
```

---

## 4. 개별 항목 입고 확인 업데이트 API (체크박스용)

### `PUT /api/logistic-payment/:id/arrival`

**설명**: 특정 물류 결제 항목의 입고 확인 상태를 개별적으로 업데이트합니다. 프론트엔드 체크박스에서 사용됩니다.

**인증**: Bearer Token 필요

**URL 파라미터**:
- `id`: 물류 결제 항목 ID (필수)

**요청 본문**:
```json
{
  "is_arrived": "boolean (필수)",
  "arrived_date": "string (선택, YYYY-MM-DD 형식)",
  "arrived_by": "string (선택)"
}
```

**응답**:

**성공 (200)**:
```json
{
  "success": true,
  "message": "입고 확인 상태가 성공적으로 업데이트되었습니다.",
  "data": {
    "id": 123,
    "packing_code": "PC001",
    "box_no": 1,
    "is_arrived": true,
    "arrived_date": "2024-01-15",
    "arrived_by": "체크박스입력"
  }
}
```

**항목 없음 (404)**:
```json
{
  "success": false,
  "error": "해당 물류 결제 정보를 찾을 수 없습니다."
}
```

---

## 주의사항

1. **인증**: 모든 API는 Bearer Token 인증이 필요합니다.
2. **바코드 중복**: 동일한 바코드로 중복 입고 확인을 시도하면 409 에러가 반환됩니다.
3. **날짜 형식**: `arrived_date`는 YYYY-MM-DD 형식으로 자동 설정됩니다.
4. **담당자**: `arrived_by`가 제공되지 않으면 사용자명 또는 '바코드스캔'/'체크박스입력'으로 설정됩니다.
5. **로깅**: 모든 바코드 스캔 활동은 서버 로그에 기록됩니다.
6. **자동 저장**: 프론트엔드 체크박스 변경 시 즉시 서버에 자동 저장됩니다.
