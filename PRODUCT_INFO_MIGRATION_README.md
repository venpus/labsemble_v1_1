# 제품 정보 필드 마이그레이션 - 자동 실행 설정 완료

## ✅ 자동 마이그레이션 설정 완료

제품 정보 관련 필드들이 **서버 시작 시 자동으로 추가**되도록 설정되었습니다.

## 📋 추가되는 필드

| 필드명 | 데이터 타입 | 설명 |
|--------|------------|------|
| `unit_weight` | DECIMAL(10,2) | 제품 1개 무게 (g) |
| `packaging_method` | VARCHAR(200) | 소포장 방식 (예: 비닐, 종이, 폴리백) |
| `box_dimensions` | VARCHAR(100) | 한박스 입수량 (개) |
| `box_weight` | VARCHAR(50) | 제품사이즈 (cm) |
| `factory_delivery_days` | INT(11) | 공장 납기 소요일 |
| `supplier_name` | VARCHAR(200) | 공급자 이름 |

**참고:** 예상원가는 별도 필드가 아닌 자동 계산 값입니다 (단가 + 수수료)

## 🔄 자동 마이그레이션 작동 방식

서버가 시작될 때 다음 순서로 실행됩니다:

1. **데이터베이스 연결 확인**
2. **모든 마이그레이션 자동 실행** (`runAllMigrations`)
   - 기존 마이그레이션들
   - ✨ **제품 정보 필드 마이그레이션** (새로 추가됨)
3. **서버 시작**

### 마이그레이션 로그 확인

서버 콘솔에서 다음과 같은 로그를 확인할 수 있습니다:

```
🔄 제품 정보 필드 마이그레이션 시작...
ℹ️  unit_weight 필드가 이미 존재합니다.
ℹ️  packaging_method 필드가 이미 존재합니다.
✅ 제품 정보 필드 마이그레이션 완료 (추가: 0, 기존: 5)
```

## 🚀 서버 재시작 방법

### Windows (PowerShell)

**현재 위치에서 서버 재시작:**
```powershell
# 1. 서버 중지 (Ctrl + C)

# 2. 서버 디렉토리로 이동 (현재 root에서)
cd server

# 3. 서버 재시작
npm start
# 또는
node index.js
```

**또는 이미 server 디렉토리에 있다면:**
```powershell
# 1. 서버 중지 (Ctrl + C)

# 2. 서버 재시작
npm start
# 또는  
node index.js
```

### 프로덕션 서버 (PM2 사용 시)
```bash
# PM2로 관리되는 서버 재시작
pm2 restart labsemble-server

# 또는 모든 PM2 프로세스 재시작
pm2 restart all

# 로그 확인
pm2 logs labsemble-server
```

## 📊 마이그레이션 상태 확인

서버 시작 후 콘솔에서 다음 메시지를 확인하세요:

```
🔧 데이터베이스 마이그레이션 실행 중...
🚀 모든 마이그레이션 실행 시작...
🔄 제품 정보 필드 마이그레이션 시작...
✅ unit_weight 필드 추가 완료
✅ packaging_method 필드 추가 완료
✅ box_dimensions 필드 추가 완료
✅ box_weight 필드 추가 완료
✅ factory_delivery_days 필드 추가 완료
✅ 제품 정보 필드 마이그레이션 완료 (추가: 5, 기존: 0)
✅ 모든 마이그레이션이 성공적으로 완료되었습니다!
✅ 데이터베이스 초기화 완료!
🚀 Manufacturing API 서버가 포트 5000에서 실행 중입니다.
```

## 🎯 테스트 방법

서버 재시작 후:
1. MJ 프로젝트 상세 페이지 접속
2. 기본정보 탭의 제품정보 섹션에서 값 입력:
   - 1개 무게: `100` (g)
   - 제품사이즈: `10x5x3` (cm)
   - 소포장 방식: `폴리백`
   - 한박스 입수량: `50` (개)
   - 공급자 이름: `ABC공급업체`
   - 공장 납기소요일: `15` (일)
   - 예상원가: **자동 계산됨** (단가 + 수수료)
3. **저장** 버튼 클릭
4. 성공 메시지 확인: "제품 정보가 성공적으로 저장되었습니다."

## 📝 관련 파일

### 마이그레이션 관련
- **자동 마이그레이션 함수**: `server/config/database.js` → `migrateProductInfoFields()`
- **마이그레이션 SQL**: `server/migrations/add_product_info_fields.sql`
- **수동 실행 스크립트**: `server/run-product-info-migration.js`

### 클라이언트 관련
- **제품정보 컴포넌트**: `client/src/components/Project/MJ/Details/ProdInfo.js`

### 서버 관련
- **API 라우트**: `server/routes/mj-project.js` → `PATCH /api/mj-project/:id`

## ✨ 기능

- ✅ **서버 재시작 시 자동 마이그레이션**
- ✅ Admin 사용자만 제품 정보 입력/수정 가능
- ✅ 변경사항 자동 감지
- ✅ 저장 버튼으로 명시적 저장
- ✅ 데이터 타입 자동 변환 (숫자/텍스트)
- ✅ 빈 값 → NULL 자동 처리
- ✅ 성공/실패 토스트 알림
- ✅ 상세한 서버 로깅

## 🔍 트러블슈팅

### 문제: "Unknown column 'unit_weight' in 'SET'" 오류 발생

**원인**: 데이터베이스에 필드가 없거나 서버가 오래된 연결을 사용 중

**해결방법**:
1. 서버 완전 종료 (Ctrl + C)
2. 서버 재시작
3. 콘솔에서 마이그레이션 로그 확인
4. "✅ 제품 정보 필드 마이그레이션 완료" 메시지 확인

### 문제: 마이그레이션이 실행되지 않음

**확인사항**:
1. 서버 콘솔에서 "🔧 데이터베이스 마이그레이션 실행 중..." 메시지 확인
2. 데이터베이스 연결 설정 확인 (`server/config/environments/production.js`)
3. 데이터베이스 계정 권한 확인 (ALTER TABLE 권한 필요)

### 수동 마이그레이션 실행

자동 마이그레이션이 실패하면 수동으로 실행:

```bash
cd server
node run-product-info-migration.js
```

## 📊 코드 변경 요약

| 파일 | 변경사항 |
|------|---------|
| `server/config/database.js` | `migrateProductInfoFields()` 함수 추가, `runAllMigrations()`에 포함 |
| `client/src/components/Project/MJ/Details/ProdInfo.js` | 저장 버튼 추가, 데이터 타입 처리 개선 |
| `server/routes/mj-project.js` | 상세 로깅 추가 |

---

**작성일**: 2025-01-10  
**마이그레이션 상태**: ✅ 자동 실행 설정 완료  
**서버 재시작**: 🔄 필요

