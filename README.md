# Labsemble Manufacturing Management System

## 📋 프로젝트 개요
제조업 프로젝트 관리 및 물류 일정 관리 시스템

## 🚀 주요 기능
- MJ 프로젝트 등록 및 관리
- 캘린더 기반 일정 관리
- 물류 및 배송 일정 추적
- 이미지 업로드 및 관리
- 사용자 인증 및 권한 관리

## 🛠️ 기술 스택
- **Frontend**: React, Tailwind CSS
- **Backend**: Node.js, Express
- **Database**: MySQL
- **Authentication**: JWT

## 📁 프로젝트 구조
```
labsemble-0826/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/    # React 컴포넌트
│   │   │   ├── Calendar/  # 캘린더 관련 컴포넌트
│   │   │   ├── Logistic/  # 물류 관련 컴포넌트
│   │   │   └── Project/   # 프로젝트 관련 컴포넌트
│   │   └── pages/         # 페이지 컴포넌트
├── server/                 # Node.js 백엔드
│   ├── routes/            # API 라우트
│   ├── config/            # 설정 파일
│   ├── middleware/        # 미들웨어
│   └── utils/             # 유틸리티 함수
└── README.md
```

## 🔧 설치 및 실행

### 1. 환경 설정
```bash
# 서버 환경 설정
cd server
cp env.example .env
# .env 파일에서 데이터베이스 정보 수정
```

### 2. 의존성 설치
```bash
# 서버 의존성 설치
cd server
npm install

# 클라이언트 의존성 설치
cd client
npm install
```

### 3. 실행
```bash
# 서버 실행 (개발 모드)
cd server
npm run dev

# 클라이언트 실행
cd client
npm start
```

## 📊 로깅 시스템

### 환경변수별 로그 레벨
- **`NODE_ENV=development`**: 모든 로그 출력 (디버깅용)
- **`NODE_ENV=production`**: 에러 로그만 출력 (상용 환경)

### 로그 유형
- **디버깅 로그**: 개발 환경에서만 출력
- **에러 로그**: 모든 환경에서 출력
- **경고 로그**: 개발 환경에서만 출력
- **정보 로그**: 개발 환경에서만 출력

### 로그 제어 방법
```javascript
const { devLog, errorLog, warnLog, infoLog } = require('./utils/logger');

// 개발 환경에서만 출력
devLog('디버깅 정보');

// 모든 환경에서 출력
errorLog('에러 정보');

// 개발 환경에서만 출력
warnLog('경고 정보');
infoLog('정보 로그');
```

## 🔐 인증 시스템
- JWT 기반 인증
- 사용자 권한 관리
- API 엔드포인트 보호

## 🖼️ 이미지 관리
- 프로젝트 대표 이미지 업로드
- 이미지 프록시 시스템 (CORS 문제 해결)
- 안전한 파일 접근 제어

## 📅 캘린더 기능
- 주문 일정 관리
- 물류 일정 추적
- 이벤트 상태별 색상 구분
- 마우스 호버 상세 정보

## 🚚 물류 관리
- 입고/출고 기록
- 재고 수량 추적
- 공급자 정보 관리

## 🔍 API 엔드포인트

### 프로젝트 관리
- `POST /api/mj-projects/register` - 프로젝트 등록
- `GET /api/mj-projects` - 프로젝트 목록
- `GET /api/mj-projects/:id` - 프로젝트 상세
- `PUT /api/mj-projects/:id` - 프로젝트 수정
- `DELETE /api/mj-projects/:id` - 프로젝트 삭제

### 캘린더
- `GET /api/mj-projects/calendar/order` - 주문 일정
- `GET /api/mj-projects/calendar/logistics` - 물류 일정

### 이미지
- `GET /api/warehouse/image/:filename` - 이미지 프록시

## 🚀 배포

### 환경 설정
```bash
# 상용 환경 설정
NODE_ENV=production
```

### 로그 관리
- 상용 환경에서는 디버깅 로그 자동 비활성화
- 에러 로그는 계속 출력되어 모니터링 가능
- 로그 파일 관리 및 로테이션 권장

## 📝 개발 가이드

### 코드 스타일
- ES6+ 문법 사용
- 함수형 프로그래밍 지향
- 컴포넌트 기반 아키텍처

### 로깅 가이드라인
- 디버깅 정보는 `devLog` 사용
- 에러는 `errorLog` 사용
- 중요 정보는 `infoLog` 사용
- 경고는 `warnLog` 사용

## 🤝 기여 방법
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 라이선스
This project is licensed under the MIT License. 