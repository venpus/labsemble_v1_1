# 모바일 프로젝트 등록 API 문서

## 개요
Android 앱을 위한 확장된 MJ 프로젝트 등록 API입니다. 기존 웹용 API보다 더 많은 필드를 지원합니다.

## 엔드포인트
```
POST /api/mj-project/mobile/register
```

## 인증
- Bearer Token 필요
- JWT 토큰을 Authorization 헤더에 포함

## 요청 형식
- Content-Type: `multipart/form-data`
- 이미지 파일과 텍스트 데이터를 함께 전송

## 요청 파라미터

### 필수 필드
| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `projectName` | String | 제품품명 | "iPhone 15 Pro" |
| `quantity` | Integer | 수량 | 100 |

### 선택 필드
| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `description` | String | 기타 사항 | "고급 스마트폰" |
| `targetPrice` | Decimal | 목표단가 (원) | 1200000.00 |
| `unitPrice` | Decimal | 실제 단가 (원) | 1100000.00 |
| `supplierName` | String | 공급사 이름 | "Apple Inc." |
| `factoryDeliveryDays` | Integer | 공장납기 소요일 (일) | 30 |
| `factoryShippingCost` | Decimal | 공장 배송비 (원) | 50000.00 |
| `packingMethod` | String | 소포장 방식 | "개별 패킹" |
| `referenceLinks` | JSON String | 참고링크 배열 | `[{"id":1,"url":"https://example.com"}]` |
| `selectedUserId` | Integer | 선택된 사용자 ID (Admin만) | 123 |
| `images` | File[] | 이미지 파일들 | multipart 파일 |

## 응답 형식

### 성공 응답 (200)
```json
{
  "success": true,
  "message": "모바일 프로젝트가 성공적으로 등록되었습니다.",
  "projectId": 123,
  "data": {
    "id": 123,
    "projectName": "iPhone 15 Pro",
    "description": "고급 스마트폰",
    "quantity": 100,
    "targetPrice": 1200000.00,
    "unitPrice": 1100000.00,
    "supplierName": "Apple Inc.",
    "factoryDeliveryDays": 30,
    "factoryShippingCost": 50000.00,
    "packingMethod": "개별 패킹",
    "referenceLinks": [
      {"id": 1, "url": "https://example.com"}
    ],
    "imageCount": 3
  }
}
```

### 에러 응답

#### 400 Bad Request
```json
{
  "error": "프로젝트명과 수량은 필수입니다."
}
```

#### 401 Unauthorized
```json
{
  "error": "사용자 인증이 필요합니다."
}
```

#### 500 Internal Server Error
```json
{
  "error": "모바일 프로젝트 등록 중 오류가 발생했습니다.",
  "details": "구체적인 오류 메시지"
}
```

## 사용 예시

### cURL 예시
```bash
curl -X POST http://localhost:5000/api/mj-project/mobile/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "projectName=iPhone 15 Pro" \
  -F "description=고급 스마트폰" \
  -F "quantity=100" \
  -F "targetPrice=1200000" \
  -F "unitPrice=1100000" \
  -F "supplierName=Apple Inc." \
  -F "factoryDeliveryDays=30" \
  -F "factoryShippingCost=50000" \
  -F "packingMethod=개별 패킹" \
  -F "referenceLinks=[{\"id\":1,\"url\":\"https://example.com\"}]" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg"
```

### JavaScript (Fetch) 예시
```javascript
const formData = new FormData();
formData.append('projectName', 'iPhone 15 Pro');
formData.append('description', '고급 스마트폰');
formData.append('quantity', '100');
formData.append('targetPrice', '1200000');
formData.append('unitPrice', '1100000');
formData.append('supplierName', 'Apple Inc.');
formData.append('factoryDeliveryDays', '30');
formData.append('factoryShippingCost', '50000');
formData.append('packingMethod', '개별 패킹');
formData.append('referenceLinks', JSON.stringify([
  {id: 1, url: 'https://example.com'}
]));

// 이미지 파일 추가
imageFiles.forEach(file => {
  formData.append('images', file);
});

const response = await fetch('/api/mj-project/mobile/register', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
```

## 데이터베이스 저장

### mj_project 테이블에 저장되는 필드
- `project_name`: 제품품명
- `description`: 기타 사항
- `quantity`: 수량
- `target_price`: 목표단가
- `unit_price`: 실제 단가
- `supplier_name`: 공급사 이름
- `factory_delivery_days`: 공장납기 소요일
- `factory_shipping_cost`: 공장 배송비
- `packing_method`: 소포장 방식
- `reference_links`: 참고링크 (JSON)
- `user_id`: 프로젝트 소유자 ID
- `created_by`: 프로젝트 등록자 ID

### mj_project_images 테이블에 저장되는 필드
- `project_id`: 프로젝트 ID
- `file_name`: 저장된 파일명
- `file_path`: 파일 경로
- `original_name`: 원본 파일명

## 주의사항

1. **이미지 파일**: 최대 10개까지 업로드 가능
2. **파일 크기**: 각 이미지당 최대 10MB
3. **지원 형식**: 이미지 파일만 허용 (image/*)
4. **참고링크**: JSON 문자열로 전송
5. **숫자 필드**: 문자열로 전송되며 서버에서 숫자로 변환
6. **Admin 권한**: `selectedUserId`는 Admin 사용자만 사용 가능

## 로그

서버 로그에서 다음 태그로 모니터링 가능:
- `📱 [mobile-project]`: 모바일 프로젝트 등록 관련 로그
- `✅ [mobile-project]`: 성공 로그
- `❌ [mobile-project]`: 에러 로그
