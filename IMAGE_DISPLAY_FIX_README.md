# 이미지 표시 문제 해결 가이드

## 문제 상황
- **개발서버**: 이미지가 정상적으로 표시됨
- **상용서버**: 
  - SearchModal에서는 이미지가 정상 표시됨
  - 프로젝트 목록(MJProjectList)에서 이미지 404 에러
  - 프로젝트 상세 정보(ProdInfo)에서 이미지 404 에러

## 원인 분석
1. **이미지 경로 불일치**: API 엔드포인트와 실제 파일 경로가 다름
2. **이미지 정보 구조 차이**: 프로젝트 목록/상세와 SearchModal에서 다른 이미지 정보 구조 사용
3. **정적 파일 제공 설정**: 상용서버에서 `/uploads/` 경로가 제대로 설정되지 않음

## 해결 방법

### 1. 서버 측 수정사항

#### A. 프로젝트 목록 API 개선 (`server/routes/mj-project.js`)
```javascript
// 이미지 필드 변경
(SELECT file_name FROM mj_project_images WHERE project_id = p.id ORDER BY id ASC LIMIT 1) as representative_image_filename

// 이미지 정보를 SearchModal과 동일한 방식으로 구성
const projectsWithImages = projects.map(project => {
  if (project.representative_image_filename) {
    return {
      ...project,
      representative_image: {
        filename: project.representative_image_filename,
        url: `/api/warehouse/image/${project.representative_image_filename}`,
        fallback_url: `/uploads/project/mj/registImage/${project.representative_image_filename}`
      }
    };
  }
  return project;
});
```

#### B. 프로젝트 상세 API 개선
```javascript
// 이미지 정보를 SearchModal과 동일한 방식으로 구성
const imagesWithUrls = images.map(image => ({
  ...image,
  url: `/api/warehouse/image/${image.file_name}`,
  fallback_url: `/uploads/project/mj/registImage/${image.file_name}`
}));
```

### 2. 클라이언트 측 수정사항

#### A. 프로젝트 목록 컴포넌트 (`client/src/components/Project/MJ/ProjectLists.js`)
```javascript
// 이미지 소스 설정
src={project.representative_image.url || `/uploads/project/mj/registImage/${project.representative_image.filename}`}

// 이미지 로드 실패 시 대체 URL 시도
onError={(e) => {
  if (project.representative_image.fallback_url) {
    e.target.src = project.representative_image.fallback_url;
  } else if (project.representative_image.filename) {
    const fallbackUrl = `/uploads/project/mj/registImage/${project.representative_image.filename}`;
    e.target.src = fallbackUrl;
  }
  
  // 대체 URL도 실패하면 기본 아이콘 표시
  e.target.onerror = () => {
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
  };
}}
```

#### B. 프로젝트 상세 컴포넌트 (`client/src/components/Project/MJ/ProjectDetails.js`)
```javascript
// 이미지 소스 설정
src={image.url || `/uploads/project/mj/registImage/${image.file_name}`}

// 이미지 로드 실패 시 대체 URL 시도
onError={(e) => {
  if (image.fallback_url) {
    e.target.src = image.fallback_url;
  } else if (image.file_name) {
    const fallbackUrl = `/uploads/project/mj/registImage/${image.file_name}`;
    e.target.src = fallbackUrl;
  }
}}
```

### 3. 이미지 URL 우선순위

1. **1순위**: `/api/warehouse/image/${filename}` (프록시 엔드포인트)
2. **2순위**: `/uploads/project/mj/registImage/${filename}` (정적 파일)
3. **3순위**: 기본 아이콘 표시

## 적용 방법

1. **서버 재시작**: 변경사항을 적용하기 위해 서버를 재시작하세요
2. **이미지 테스트**: 프로젝트 목록과 상세 정보에서 이미지 표시 확인
3. **에러 로그 확인**: 콘솔에서 이미지 로드 관련 로그 확인

## 문제 해결 후 확인사항

- [ ] 개발서버에서 이미지 정상 표시
- [ ] 상용서버에서 이미지 정상 표시
- [ ] 프로젝트 목록에서 이미지 정상 표시
- [ ] 프로젝트 상세 정보에서 이미지 정상 표시
- [ ] SearchModal에서 이미지 정상 표시
- [ ] 이미지 로드 실패 시 대체 URL 시도
- [ ] 모든 이미지 URL에서 CORS 오류 없음
- [ ] 이미지 캐싱 정상 작동
- [ ] 에러 로그에서 이미지 관련 오류 없음

## 추가 수정사항

### 1. 프로젝트 목록 API 개선
- `representative_image` 필드를 `representative_image_filename`으로 변경
- 이미지 정보를 SearchModal과 동일한 방식으로 구성
- `url`과 `fallback_url` 제공

### 2. 프로젝트 상세 API 개선
- 이미지 정보에 `url`과 `fallback_url` 추가
- SearchModal과 동일한 이미지 URL 구조 사용

### 3. 클라이언트 이미지 로딩 개선
- 이미지 로드 실패 시 대체 URL 자동 시도
- 상세한 에러 로깅 추가
- 모든 이미지 컴포넌트에서 일관된 에러 핸들링

## 주의사항

1. **보안**: `.env` 파일은 절대 Git에 커밋하지 마세요
2. **권한**: 이미지 파일 디렉토리의 읽기 권한 확인
3. **경로**: 상용서버와 개발서버의 파일 경로 일치 확인
4. **CORS**: 허용된 도메인만 이미지 접근 가능하도록 설정

## 문제 해결 후 확인사항

- [ ] 개발서버에서 이미지 정상 표시
- [ ] 상용서버에서 이미지 정상 표시
- [ ] 프로젝트 목록에서 이미지 정상 표시
- [ ] 프로젝트 상세 정보에서 이미지 정상 표시
- [ ] SearchModal에서 이미지 정상 표시
- [ ] 이미지 로드 실패 시 대체 URL 시도
- [ ] 모든 이미지 URL에서 CORS 오류 없음
- [ ] 이미지 캐싱 정상 작동
- [ ] 에러 로그에서 이미지 관련 오류 없음 