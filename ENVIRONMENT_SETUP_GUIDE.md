# 환경별 설정 가이드

이 문서는 Labsemble Manufacturing 프로젝트의 개발 환경과 상용 환경을 분리하여 관리하는 방법을 설명합니다.

## 📁 프로젝트 구조

```
labsemble2-0831/
├── server/
│   ├── config/
│   │   ├── environments/
│   │   │   ├── development.js    # 개발 환경 설정
│   │   │   └── production.js     # 상용 환경 설정
│   │   ├── environment-loader.js # 환경 설정 로더
│   │   └── database.js          # 데이터베이스 설정
│   └── package.json
├── client/
│   ├── src/
│   │   ├── config/
│   │   │   ├── environments/
│   │   │   │   ├── development.js    # 개발 환경 설정
│   │   │   │   └── production.js     # 상용 환경 설정
│   │   │   └── environment-loader.js # 환경 설정 로더
│   │   └── utils/
│   │       └── api.js           # API 유틸리티
│   └── package.json
└── ENVIRONMENT_SETUP_GUIDE.md
```

## 🔧 환경 설정

### 서버 환경 설정

#### 개발 환경 (development)
- **데이터베이스**: localhost MySQL
- **포트**: 5000
- **CORS**: http://localhost:3000
- **로그 레벨**: debug

#### 상용 환경 (production)
- **데이터베이스**: labsemble.com MySQL
- **포트**: 5000
- **CORS**: https://your-domain.com
- **로그 레벨**: error

### 클라이언트 환경 설정

#### 개발 환경 (development)
- **API URL**: http://localhost:5000
- **디버그 모드**: 활성화
- **로그 레벨**: debug

#### 상용 환경 (production)
- **API URL**: 상대 경로 (같은 도메인)
- **디버그 모드**: 비활성화
- **로그 레벨**: error

## 🚀 실행 방법

### 개발 환경에서 실행

#### 서버 실행
```bash
# 서버 디렉토리로 이동
cd server

# 개발 환경으로 서버 실행
npm run dev

# 또는
npm run start:dev
```

#### 클라이언트 실행
```bash
# 클라이언트 디렉토리로 이동
cd client

# 개발 환경으로 클라이언트 실행
npm start

# 또는
npm run start:dev
```

### 상용 환경에서 실행

#### 서버 실행
```bash
# 서버 디렉토리로 이동
cd server

# 상용 환경으로 서버 실행
npm run start:prod
```

#### 클라이언트 빌드 및 실행
```bash
# 클라이언트 디렉토리로 이동
cd client

# 상용 환경으로 빌드
npm run build:prod

# 빌드된 파일을 웹 서버에 배포
```

## 🗄️ 데이터베이스 설정

### 개발 환경 데이터베이스 설정

1. **MySQL 설치 및 실행**
   ```bash
   # MySQL 서버 시작
   sudo service mysql start
   # 또는
   brew services start mysql
   ```

2. **개발용 데이터베이스 생성**
   ```sql
   CREATE DATABASE labsemble_dev;
   CREATE USER 'dev_user'@'localhost' IDENTIFIED BY 'dev_password';
   GRANT ALL PRIVILEGES ON labsemble_dev.* TO 'dev_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. **환경 설정 파일 수정**
   ```javascript
   // server/config/environments/development.js
   DB_HOST: 'localhost',
   DB_USER: 'dev_user',
   DB_PASSWORD: 'dev_password',
   DB_NAME: 'labsemble_dev',
   ```

### 상용 환경 데이터베이스 설정

1. **상용 데이터베이스 정보 확인**
   ```javascript
   // server/config/environments/production.js
   DB_HOST: 'labsemble.com',
   DB_USER: 'venpus',
   DB_PASSWORD: 'your-production-password',
   DB_NAME: 'labsemble',
   ```

## 🔄 마이그레이션 실행

### 개발 환경 마이그레이션
```bash
cd server
npm run migrate:dev
```

### 상용 환경 마이그레이션
```bash
cd server
npm run migrate:prod
```

## 🌐 환경 변수 오버라이드

환경 설정 파일의 값은 환경 변수로 오버라이드할 수 있습니다.

### 서버 환경 변수
```bash
# 개발 환경으로 서버 실행하면서 특정 설정 오버라이드
NODE_ENV=development DB_HOST=192.168.1.100 npm run dev
```

### 클라이언트 환경 변수
```bash
# 개발 환경으로 클라이언트 실행하면서 특정 설정 오버라이드
NODE_ENV=development REACT_APP_API_URL=http://192.168.1.100:5000 npm start
```

## 📝 환경별 설정 파일 수정

### 서버 설정 수정
```javascript
// server/config/environments/development.js
module.exports = {
  NODE_ENV: 'development',
  PORT: 5000,
  JWT_SECRET: 'your-dev-secret',
  CORS_ORIGIN: 'http://localhost:3000',
  DB_HOST: 'localhost',
  DB_USER: 'your-dev-user',
  DB_PASSWORD: 'your-dev-password',
  DB_NAME: 'labsemble_dev',
  // ... 기타 설정
};
```

### 클라이언트 설정 수정
```javascript
// client/src/config/environments/development.js
export const config = {
  NODE_ENV: 'development',
  API_BASE_URL: 'http://localhost:5000',
  APP_NAME: 'Labsemble Manufacturing (Dev)',
  DEBUG: true,
  // ... 기타 설정
};
```

## 🔍 문제 해결

### 일반적인 문제들

1. **데이터베이스 연결 실패**
   - 데이터베이스 서버가 실행 중인지 확인
   - 연결 정보가 올바른지 확인
   - 방화벽 설정 확인

2. **CORS 오류**
   - CORS_ORIGIN 설정이 올바른지 확인
   - 클라이언트와 서버의 포트가 일치하는지 확인

3. **환경 설정이 적용되지 않음**
   - NODE_ENV 환경 변수가 올바르게 설정되었는지 확인
   - 설정 파일의 경로가 올바른지 확인

### 로그 확인

개발 환경에서는 상세한 로그가 출력됩니다:
```bash
🔧 환경 설정 로딩: development
✅ development 환경 설정 로드 완료
📋 현재 환경 설정:
   NODE_ENV: development
   PORT: 5000
   DB_HOST: localhost
   DB_NAME: labsemble_dev
   CORS_ORIGIN: http://localhost:3000
   LOG_LEVEL: debug
```

## 📚 추가 정보

- 환경 설정은 `environment-loader.js`에서 자동으로 로드됩니다
- 환경 변수가 설정 파일보다 우선순위가 높습니다
- 개발 환경에서는 디버그 정보가 출력됩니다
- 상용 환경에서는 보안을 위해 민감한 정보가 마스킹됩니다


