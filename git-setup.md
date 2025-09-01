# 🚀 LABSEMBLE Git 저장소 설정 가이드

## 📋 Git 초기화 및 첫 커밋

### 1. Git 저장소 초기화
```bash
git init
```

### 2. 원격 저장소 추가 (GitHub/GitLab 등)
```bash
git remote add origin <your-repository-url>
```

### 3. 파일들을 스테이징 영역에 추가
```bash
# 모든 파일 추가
git add .

# 또는 특정 파일만 추가
git add client/
git add server/
git add README.md
git add .gitignore
```

### 4. 첫 번째 커밋 생성
```bash
git commit -m "🎉 Initial commit: LABSEMBLE manufacturing website

- React + Node.js 풀스택 애플리케이션
- 제조 서비스 웹사이트 (SMT, 회로도, 3D 목업, 부품 구매, MJ 유통)
- Tailwind CSS 기반 모던 UI
- JWT 인증 시스템
- RESTful API 구조"
```

### 5. 원격 저장소에 푸시
```bash
git push -u origin main
# 또는
git push -u origin master
```

## 🔍 커밋 전 확인사항

### ✅ 포함되어야 할 파일들
- `client/src/` - React 소스 코드
- `server/` - Node.js 서버 코드
- `README.md` - 프로젝트 문서
- `.gitignore` - Git 제외 파일 목록
- `package.json` - 프로젝트 설정

### ❌ 제외되는 파일들 (자동)
- `node_modules/` - 의존성 패키지
- `.env` - 환경 변수
- `client/build/` - 빌드 결과물
- `*.log` - 로그 파일들
- `convert-logo.js` - 임시 변환 스크립트

## 🎯 권장 커밋 메시지 형식

```
🎉 Initial commit: LABSEMBLE manufacturing website

✨ Features:
- React frontend with Tailwind CSS
- Node.js backend with Express
- JWT authentication system
- Manufacturing services showcase
- Responsive design

🔧 Tech Stack:
- Frontend: React 18, Tailwind CSS, Lucide React
- Backend: Node.js, Express, JWT, bcryptjs
- Database: Ready for MongoDB integration
```

## 📁 프로젝트 구조 요약

```
LABSEMBLE-V2/
├── client/                 # React 클라이언트
│   ├── src/
│   │   ├── components/    # 재사용 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   └── ...
│   └── public/            # 정적 파일
├── server/                 # Node.js 서버
│   ├── routes/            # API 라우트
│   └── ...
├── README.md              # 프로젝트 문서
├── .gitignore             # Git 제외 파일
└── package.json           # 프로젝트 설정
```

## 🚀 다음 단계

1. **Git 저장소 초기화** 완료
2. **첫 커밋** 생성
3. **원격 저장소**에 푸시
4. **팀 협업** 시작
5. **지속적 개발** 진행

---

**LABSEMBLE** - 혁신적인 제조 솔루션으로 아이디어를 현실로 만들어드립니다! 🎨✨ 