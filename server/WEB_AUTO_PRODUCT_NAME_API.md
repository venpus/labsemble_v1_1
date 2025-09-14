# 웹용 자동 상품명 생성 API 문서

## API 엔드포인트
```
GET /api/mj-project/generate-product-name
```

## 설명
웹 애플리케이션을 위한 자동 상품명 생성 API입니다. 오늘 날짜를 기준으로 YYMMDD#N 형식의 자동 상품명을 생성합니다.
- YY: 연도 (2자리)
- MM: 월 (2자리)
- DD: 일 (2자리)
- N: 오늘 등록된 프로젝트 순번 (1부터 시작)

## 인증
- JWT 토큰이 필요합니다.
- 헤더: `Authorization: Bearer {token}`

## 요청
```http
GET /api/mj-project/generate-product-name
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 응답

### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "productName": "250131#3",
    "dateString": "250131",
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

## 사용 예시

### 2025년 1월 31일에 첫 번째 프로젝트 등록
**요청:**
```http
GET /api/mj-project/generate-product-name
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답:**
```json
{
  "success": true,
  "data": {
    "productName": "250131#1",
    "dateString": "250131",
    "todayCount": 0,
    "nextNumber": 1
  }
}
```

### 2025년 1월 31일에 세 번째 프로젝트 등록
**응답:**
```json
{
  "success": true,
  "data": {
    "productName": "250131#3",
    "dateString": "250131",
    "todayCount": 2,
    "nextNumber": 3
  }
}
```

## 프론트엔드 사용법

### React 컴포넌트에서 사용
```javascript
const generateProductName = async () => {
  setIsGeneratingName(true);
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/mj-project/generate-product-name', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        projectName: data.data.productName
      }));
    }
  } catch (error) {
    console.error('상품명 생성 오류:', error);
  } finally {
    setIsGeneratingName(false);
  }
};
```

## 참고사항

- 날짜는 한국 시간(KST, UTC+9) 기준으로 계산됩니다.
- 프로젝트 개수는 `mj_project` 테이블의 `created_at` 필드를 기준으로 계산됩니다.
- 순번은 1부터 시작하며, 매일 자정에 초기화됩니다.
- 생성된 상품명은 프로젝트 등록 시 사용할 수 있습니다.
- 웹용 API와 모바일용 API는 동일한 로직을 사용하지만 별도의 엔드포인트로 분리되어 있습니다.

## 관련 API

- **모바일용**: `GET /api/mj-project/mobile/generate-product-name`
- **프로젝트 등록**: `POST /api/mj-project/register`
- **모바일 프로젝트 등록**: `POST /api/mj-project/mobile/register`
