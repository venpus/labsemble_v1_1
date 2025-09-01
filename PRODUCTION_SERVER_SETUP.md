# 상용서버 설정 가이드

## 🚀 상용서버 배포 시 필수 설정사항

### 1. 환경 변수 설정

상용서버에서 `.env` 파일을 생성하고 다음 설정을 추가하세요:

```bash
# 서버 환경 설정
NODE_ENV=production
PORT=5000

# JWT 보안 설정 (반드시 강력한 비밀키 사용)
JWT_SECRET=your-super-strong-jwt-secret-key-here-minimum-32-characters

# CORS 설정
CORS_ORIGIN=https://labsemble.com

# 시간대 설정
TZ=Asia/Seoul

# 데이터베이스 설정
DB_HOST=labsemble.com
DB_USER=venpus
DB_PASSWORD=your-actual-db-password-here
DB_NAME=labsemble

# 로깅 설정
NODE_ENV=production
```

### 2. 보안 설정 확인사항

#### A. JWT_SECRET
- **최소 32자 이상**의 강력한 비밀키 사용
- **예측 불가능한** 랜덤 문자열 사용
- **절대 Git에 커밋하지 마세요**

#### B. 데이터베이스 비밀번호
- **강력한 비밀번호** 사용
- **특수문자, 숫자, 대소문자** 포함
- **정기적으로 변경**

### 3. 서버 시작 전 체크리스트

- [ ] `.env` 파일이 올바르게 설정됨
- [ ] `NODE_ENV=production` 설정됨
- [ ] `JWT_SECRET`이 강력한 비밀키로 설정됨
- [ ] 데이터베이스 연결 정보가 정확함
- [ ] 데이터베이스 서버가 실행 중임
- [ ] 방화벽에서 포트 5000이 열려있음

### 4. 서버 시작 명령어

```bash
# 상용서버 시작
cd server
npm start

# 또는 PM2 사용 (권장)
pm2 start ecosystem.config.js --env production
```

### 5. 로그 확인 방법

#### A. 서버 시작 로그
```bash
🌍 서버 환경: production (상용)
✅ 데이터베이스 연결 성공
🚀 Manufacturing API 서버가 포트 5000에서 실행 중입니다.
```

#### B. 로그인 시도 로그
```bash
🔐 [auth] 로그인 시도: { username: 'venpus' }
🔍 [auth] 사용자 검색 시작: venpus
✅ [auth] 사용자 찾음: { id: 3, username: 'venpus', isAdmin: 1 }
✅ [auth] 비밀번호 확인 완료
✅ [auth] JWT 토큰 생성 완료: { userId: 3, username: 'venpus' }
✅ [auth] 로그인 성공: { userId: 3, username: 'venpus' }
```

### 6. 문제 해결 가이드

#### A. 500 에러 발생 시

1. **JWT_SECRET 문제**
   ```bash
   ❌ [auth] JWT_SECRET 환경변수가 설정되지 않음
   ```
   - `.env` 파일에 `JWT_SECRET` 추가
   - 서버 재시작

2. **데이터베이스 연결 문제**
   ```bash
   ❌ [auth] 데이터베이스 풀이 초기화되지 않음
   ```
   - 데이터베이스 서버 상태 확인
   - `.env` 파일의 DB 설정 확인
   - 방화벽 설정 확인

3. **CORS 문제**
   ```bash
   🚫 CORS 차단된 origin: http://localhost:5000/
   ```
   - 클라이언트에서 올바른 도메인으로 요청
   - 상용서버에서는 `https://labsemble.com` 사용

#### B. 로그인 실패 시

1. **사용자명/비밀번호 불일치**
   ```bash
   ❌ [auth] 사용자를 찾을 수 없음: username
   ❌ [auth] 비밀번호 불일치: username
   ```
   - 사용자명과 비밀번호 확인
   - 데이터베이스에 사용자 존재 여부 확인

2. **데이터베이스 오류**
   ```bash
   ❌ [auth] 로그인 오류: { code: 'ECONNREFUSED', ... }
   ```
   - 데이터베이스 서버 상태 확인
   - 네트워크 연결 확인

### 7. 모니터링 및 유지보수

#### A. 정기 점검사항
- [ ] 서버 로그 모니터링
- [ ] 데이터베이스 연결 상태 확인
- [ ] JWT 토큰 만료 시간 확인
- [ ] 보안 업데이트 적용

#### B. 백업 및 복구
- [ ] 데이터베이스 정기 백업
- [ ] 환경 설정 파일 백업
- [ ] 로그 파일 아카이빙

### 8. 성능 최적화

#### A. 프로덕션 환경 설정
```bash
# Node.js 성능 최적화
NODE_OPTIONS="--max-old-space-size=2048"

# PM2 클러스터 모드
pm2 start ecosystem.config.js -i max
```

#### B. 데이터베이스 최적화
- 인덱스 최적화
- 쿼리 성능 모니터링
- 연결 풀 설정 조정

### 9. 긴급 상황 대응

#### A. 서버 다운 시
1. 서버 상태 확인
2. 로그 분석
3. 데이터베이스 연결 확인
4. 서비스 재시작

#### B. 보안 침해 시
1. 즉시 서비스 중단
2. 로그 분석
3. JWT_SECRET 변경
4. 보안 패치 적용

### 10. 연락처 및 지원

- **시스템 관리자**: [관리자 연락처]
- **데이터베이스 관리자**: [DB 관리자 연락처]
- **긴급 상황**: [긴급 연락처]

---

**⚠️ 주의사항**
- 이 문서의 설정은 상용서버 전용입니다
- 개발환경에서는 `NODE_ENV=development`를 사용하세요
- 보안 관련 설정은 정기적으로 검토하고 업데이트하세요
- 모든 비밀번호와 키는 안전하게 관리하세요 