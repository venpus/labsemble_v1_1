# 모바일 자동 상품명 생성 API

## API 엔드포인트
```
GET /api/mj-project/mobile/generate-product-name
```

## 설명
오늘 날짜를 기준으로 YYMMDD#N 형식의 자동 상품명을 생성합니다.
- YY: 연도 (2자리)
- MM: 월 (2자리)
- DD: 일 (2자리)
- N: 오늘 등록된 프로젝트 순번 (1부터 시작)

## 인증
- JWT 토큰이 필요합니다.
- 헤더: `Authorization: Bearer {token}`

## 요청
```http
GET /api/mj-project/mobile/generate-product-name
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 응답

### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "productName": "250109#3",
    "dateString": "250109",
    "todayCount": 2,
    "nextNumber": 3
  }
}
```

### 응답 필드 설명
- `success`: API 호출 성공 여부
- `data.productName`: 생성된 상품명 (YYMMDD#N 형식)
- `data.dateString`: 오늘 날짜 (YYMMDD 형식)
- `data.todayCount`: 오늘 등록된 프로젝트 개수
- `data.nextNumber`: 다음 순번

### 오류 응답 (401 Unauthorized)
```json
{
  "error": "인증이 필요합니다."
}
```

### 오류 응답 (500 Internal Server Error)
```json
{
  "error": "상품명 생성 중 오류가 발생했습니다.",
  "details": "Internal server error"
}
```

## 예시

### 2025년 1월 9일에 첫 번째 프로젝트 등록
**요청:**
```http
GET /api/mj-project/mobile/generate-product-name
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답:**
```json
{
  "success": true,
  "data": {
    "productName": "250109#1",
    "dateString": "250109",
    "todayCount": 0,
    "nextNumber": 1
  }
}
```

### 2025년 1월 9일에 세 번째 프로젝트 등록
**응답:**
```json
{
  "success": true,
  "data": {
    "productName": "250109#3",
    "dateString": "250109",
    "todayCount": 2,
    "nextNumber": 3
  }
}
```

## 참고사항
- 날짜는 한국 시간(KST, UTC+9) 기준으로 계산됩니다.
- 프로젝트 개수는 `mj_project` 테이블의 `created_at` 필드를 기준으로 계산됩니다.
- 순번은 1부터 시작하며, 매일 자정에 초기화됩니다.
- 생성된 상품명은 프로젝트 등록 시 사용할 수 있습니다.



