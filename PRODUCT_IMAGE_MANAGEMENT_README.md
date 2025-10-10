# 상품 이미지 관리 기능 추가 완료

## ✅ 기능 개요

MJ 프로젝트 상세 페이지의 기본정보 탭에서 **상품 이미지**를 추가, 변경, 삭제할 수 있는 기능이 추가되었습니다.

## 🎯 주요 기능

### 1. 상품 이미지 추가
- Admin 권한이 있는 사용자만 이미지 추가 가능
- 여러 이미지 동시 업로드 가능
- 이미지 파일만 허용 (JPG, PNG, GIF 등)
- 업로드 진행 중 로딩 상태 표시

### 2. 상품 이미지 변경 ✨ **NEW**
- Admin 권한이 있는 사용자만 변경 가능
- 기존 이미지를 새 이미지로 교체
- 이미지 위에 마우스 오버 시 변경 버튼(🔄) 표시
- 기존 이미지는 자동으로 삭제되고 새 이미지로 대체

### 3. 상품 이미지 삭제
- Admin 권한이 있는 사용자만 삭제 가능
- 이미지 위에 마우스 오버 시 삭제 버튼(❌) 표시
- 삭제 전 확인 메시지
- 파일 시스템 및 데이터베이스에서 완전 삭제

### 4. 권한 제어
- ✅ Admin: 이미지 추가/변경/삭제 가능
- ❌ 일반 사용자: 읽기 전용 모드 (안내 메시지 표시)

## 🎨 UI 구성

### 상품 이미지 섹션

```
┌─────────────────────────────────────────────────────┐
│ 📷 상품 이미지 (3개)             [+ 이미지 추가]    │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────┐  ┌──────┐  ┌──────┐                      │
│  │🔄  ❌│  │🔄  ❌│  │🔄  ❌│                      │
│  │ 📷   │  │ 📷   │  │ 📷   │                      │
│  │이미지│  │이미지│  │이미지│                      │
│  └──────┘  └──────┘  └──────┘                      │
│                                                       │
│  * 마우스 오버 시 변경(🔄), 삭제(❌) 버튼 표시      │
│  * 클릭하면 이미지 확대                               │
└─────────────────────────────────────────────────────┘
```

**버튼 위치:**
- 🔄 **변경 버튼**: 좌측 상단 (파란색)
- ❌ **삭제 버튼**: 우측 상단 (빨간색)

### 이미지가 없을 때

```
┌─────────────────────────────────────────────────────┐
│ 📷 상품 이미지 (0개)             [+ 이미지 추가]    │
├─────────────────────────────────────────────────────┤
│                                                       │
│                    📷                                 │
│         아직 상품 이미지가 없습니다.                  │
│            [이미지 추가하기]                          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## 📡 API 엔드포인트

### 1. 상품 이미지 추가
```http
POST /api/mj-project/:id/product-images
Content-Type: multipart/form-data
Authorization: Bearer {token}

Form Data:
  images: [File, File, ...]
```

**응답 예시:**
```json
{
  "success": true,
  "message": "상품 이미지가 성공적으로 추가되었습니다.",
  "images": [
    {
      "id": 123,
      "file_name": "mj-project-1234567890-123.jpg",
      "original_name": "product.jpg",
      "url": "/api/warehouse/image/mj-project-1234567890-123.jpg",
      "fallback_url": "/uploads/project/mj/registImage/mj-project-1234567890-123.jpg"
    }
  ]
}
```

### 2. 상품 이미지 변경 ✨ **NEW**
```http
PATCH /api/mj-project/:id/product-images/:imageId
Content-Type: multipart/form-data
Authorization: Bearer {token}

Form Data:
  images: File (1개만)
```

**응답 예시:**
```json
{
  "success": true,
  "message": "상품 이미지가 성공적으로 변경되었습니다.",
  "image": {
    "id": 123,
    "file_name": "mj-project-9876543210-456.jpg",
    "original_name": "new-product.jpg",
    "url": "/api/warehouse/image/mj-project-9876543210-456.jpg",
    "fallback_url": "/uploads/project/mj/registImage/mj-project-9876543210-456.jpg"
  }
}
```

**처리 과정:**
1. 기존 이미지 파일 삭제 (파일 시스템)
2. 새 이미지 파일 저장
3. DB 레코드 업데이트 (file_name, file_path, original_name)
4. 업데이트된 이미지 정보 반환

### 3. 상품 이미지 삭제
```http
DELETE /api/mj-project/:id/product-images/:imageId
Authorization: Bearer {token}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "상품 이미지가 성공적으로 삭제되었습니다."
}
```

## 🔐 권한 제어

### Admin 사용자
- ✅ 이미지 추가 버튼 표시
- ✅ 각 이미지에 변경 버튼(🔄) 표시
- ✅ 각 이미지에 삭제 버튼(❌) 표시
- ✅ 모든 이미지 관리 기능 사용 가능

### 일반 사용자
- ❌ 이미지 추가 버튼 숨김
- ❌ 변경/삭제 버튼 숨김
- ✅ 이미지 보기만 가능 (클릭하여 확대)
- ℹ️ 노란색 안내 메시지: "상품 이미지 추가/삭제는 admin 권한이 필요합니다."

## 💻 코드 변경 사항

### 서버 측 (server/routes/mj-project.js)

#### 1. 상품 이미지 추가 API
```javascript
router.post('/:id/product-images', authMiddleware, handleMulterError, async (req, res) => {
  // Admin 권한 확인
  // 이미지 파일 업로드
  // DB에 이미지 정보 저장
  // 업로드된 이미지 정보 반환
});
```

#### 2. 상품 이미지 변경 API ✨ **NEW**
```javascript
router.patch('/:id/product-images/:imageId', authMiddleware, handleMulterError, async (req, res) => {
  // Admin 권한 확인
  // 기존 이미지 정보 조회
  // 기존 파일 삭제 (파일 시스템)
  // 새 이미지 파일 저장
  // DB 레코드 업데이트
  // 업데이트된 이미지 정보 반환
});
```

#### 3. 상품 이미지 삭제 API
```javascript
router.delete('/:id/product-images/:imageId', authMiddleware, async (req, res) => {
  // Admin 권한 확인
  // DB에서 이미지 정보 조회
  // 파일 시스템에서 파일 삭제
  // DB에서 이미지 정보 삭제
});
```

### 클라이언트 측 (client/src/components/Project/MJ/ProjectDetails.js)

#### 1. 새로운 State 추가
```javascript
const [isAdmin, setIsAdmin] = useState(false);
const [isUploadingImage, setIsUploadingImage] = useState(false);
const [replacingImageId, setReplacingImageId] = useState(null); // ✨ NEW
const productImageInputRef = useRef(null);
const replaceImageInputRef = useRef(null); // ✨ NEW
```

#### 2. Admin 권한 확인
```javascript
useEffect(() => {
  const checkAdminStatus = async () => {
    const response = await axios.get('/api/users/me');
    setIsAdmin(response.data.is_admin || false);
  };
  checkAdminStatus();
}, []);
```

#### 3. 이미지 추가 함수
```javascript
const handleProductImageUpload = async (event) => {
  // Admin 권한 확인
  // 파일 선택 확인
  // FormData 생성
  // 서버에 업로드
  // 프로젝트 정보 새로고침
};
```

#### 4. 이미지 변경 함수 ✨ **NEW**
```javascript
const handleProductImageReplaceClick = (imageId) => {
  // Admin 권한 확인
  // 변경할 이미지 ID 저장
  // 파일 선택 다이얼로그 열기
};

const handleProductImageReplace = async (event) => {
  // Admin 권한 확인
  // 파일 선택 확인
  // FormData 생성
  // 서버에 변경 요청
  // 프로젝트 정보 새로고침
};
```

#### 5. 이미지 삭제 함수
```javascript
const handleProductImageDelete = async (imageId) => {
  // Admin 권한 확인
  // 삭제 확인 메시지
  // 서버에 삭제 요청
  // 프로젝트 정보 새로고침
};
```

## 🎯 사용 방법

### 이미지 추가
1. Admin 계정으로 로그인
2. MJ 프로젝트 상세 페이지 → 기본정보 탭
3. 상품 이미지 섹션 우측 상단의 **[+ 이미지 추가]** 버튼 클릭
4. 이미지 파일 선택 (여러 개 선택 가능)
5. 자동 업로드 및 새로고침
6. 성공 메시지: `✅ N개 이미지가 성공적으로 추가되었습니다.`

### 이미지 변경 ✨ **NEW**
1. Admin 계정으로 로그인
2. 변경할 이미지 위에 마우스 오버
3. 좌측 상단에 나타나는 **🔄** 버튼 클릭
4. 새 이미지 파일 선택 (1개만)
5. 자동 변경 및 새로고침
6. 성공 메시지: `✅ 이미지가 성공적으로 변경되었습니다.`

**변경 과정:**
- 기존 이미지 자동 삭제
- 새 이미지로 즉시 대체
- 이미지 ID 유지 (순서 유지)

### 이미지 삭제
1. Admin 계정으로 로그인
2. 삭제할 이미지 위에 마우스 오버
3. 우측 상단에 나타나는 **❌** 버튼 클릭
4. 확인 메시지: "이 이미지를 삭제하시겠습니까?"
5. 확인 클릭
6. 자동 삭제 및 새로고침
7. 성공 메시지: `✅ 이미지가 성공적으로 삭제되었습니다.`

## 📋 파일 저장 위치

```
server/uploads/project/mj/registImage/
  ├── mj-project-1234567890-123.jpg
  ├── mj-project-1234567890-456.png
  └── mj-project-1234567890-789.gif
```

## 🔧 데이터베이스

### 테이블: `mj_project_images`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INT (PK, AI) | 이미지 ID |
| project_id | INT | 프로젝트 ID |
| file_name | VARCHAR(255) | 저장된 파일명 |
| file_path | VARCHAR(255) | 파일 경로 |
| original_name | VARCHAR(255) | 원본 파일명 |
| created_at | TIMESTAMP | 생성일 |

## ⚠️ 주의사항

### 파일 크기 제한
- 최대 파일 크기: **10MB** (서버 설정)
- 크기 초과 시 오류 메시지 표시

### 파일 형식
- 허용: 이미지 파일만 (`image/*`)
- 차단: 동영상, 문서 등

### 변경 시 참고
- 변경하면 **기존 이미지는 복구 불가능**
- 새 이미지로 완전히 대체됨
- 이미지 ID와 순서는 유지됨

### 삭제 시 주의
- 삭제된 이미지는 **복구 불가능**
- 파일 시스템과 데이터베이스에서 완전 삭제
- 삭제 전 반드시 확인 필요

## 🎨 UI 특징

### 반응형 그리드
- **모바일**: 2열
- **태블릿**: 3열
- **데스크톱**: 4열
- **대형 화면**: 5열

### 인터랙션
- **마우스 오버**: 어두운 오버레이 + "클릭하여 확대" 메시지
- **클릭**: 새 탭에서 이미지 확대
- **변경 버튼(🔄)**: 마우스 오버 시에만 표시 (좌측 상단, 파란색)
- **삭제 버튼(❌)**: 마우스 오버 시에만 표시 (우측 상단, 빨간색)
- **애니메이션**: opacity 트랜지션으로 부드러운 표시/숨김

### 로딩 상태
- 업로드/변경 중: 스피너 애니메이션 + "업로드 중..." 텍스트
- 버튼 비활성화로 중복 클릭 방지

## 📊 사용 흐름

### **이미지 추가:**
```
사용자 → [+ 이미지 추가] 클릭 
     → 파일 선택 (여러 개)
     → 자동 업로드 
     → 새로고침 
     → 성공 메시지
```

### **이미지 변경:** ✨
```
사용자 → 이미지에 마우스 오버
     → 🔄 버튼 클릭 (좌측 상단)
     → 새 파일 선택 (1개)
     → 기존 삭제 + 새 이미지 저장
     → 새로고침
     → 성공 메시지
```

### **이미지 삭제:**
```
사용자 → 이미지에 마우스 오버 
     → ❌ 버튼 클릭 (우측 상단)
     → 확인 
     → 삭제 
     → 새로고침 
     → 성공 메시지
```

## 📊 코드 변경 요약

| 파일 | 변경사항 |
|------|---------|
| `server/routes/mj-project.js` | 상품 이미지 추가/변경/삭제 API 3개 추가 |
| `client/src/components/Project/MJ/ProjectDetails.js` | 이미지 관리 UI 및 기능 추가 (추가/변경/삭제) |

### API 엔드포인트 총 3개

1. ✅ `POST /api/mj-project/:id/product-images` - 이미지 추가
2. ✨ `PATCH /api/mj-project/:id/product-images/:imageId` - 이미지 변경 (NEW)
3. ✅ `DELETE /api/mj-project/:id/product-images/:imageId` - 이미지 삭제

## ✨ 추가 기능

- ✅ **이미지 교체**: 기존 이미지를 새 이미지로 변경 (NEW)
- ✅ 자동 새로고침: 이미지 추가/변경/삭제 후 프로젝트 정보 자동 갱신
- ✅ Toast 알림: 성공/실패 시 사용자 친화적 메시지
- ✅ 상세 로깅: 서버 콘솔에서 모든 작업 추적 가능
- ✅ 에러 처리: 권한 없음, 파일 없음 등 모든 경우 처리
- ✅ 시각적 피드백: 호버 시 버튼 표시, 클릭 시 확대

## 🔄 이미지 변경의 장점

기존에는 이미지를 변경하려면:
1. ❌ 기존 이미지 삭제
2. ➕ 새 이미지 추가
3. ⚠️ 순서가 바뀔 수 있음

**이제는:**
1. ✅ 🔄 버튼 한 번 클릭
2. ✅ 순서 유지됨
3. ✅ 더 빠르고 편리함

---

**작성일**: 2025-01-10  
**기능 상태**: ✅ 완료 (추가/변경/삭제)  
**서버 재시작**: ⚠️ 필요 (새 변경 API 적용을 위해)

