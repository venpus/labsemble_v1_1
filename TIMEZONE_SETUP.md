# 🕐 프로젝트 시간대 설정 가이드

## 📋 개요

이 프로젝트는 모든 시간 처리를 **한국 시간대(KST, UTC+9)** 기준으로 통일하여 일관된 시간 처리를 보장합니다.

## 🌍 시간대 설정

### **데이터베이스 (MySQL)**
- **설정**: `timezone: '+09:00'`
- **파일**: `server/config/database.js`
- **효과**: 모든 날짜/시간 데이터가 KST 기준으로 저장

### **서버 (Node.js)**
- **환경 변수**: `process.env.TZ = 'Asia/Seoul'`
- **파일**: `server/index.js`
- **효과**: 서버의 기본 시간대를 KST로 설정

### **프론트엔드 (React)**
- **유틸리티**: `client/src/utils/timezone.js`
- **효과**: 모든 클라이언트 시간 처리를 KST 기준으로 통일

## 🛠️ 구현된 유틸리티 함수들

### **서버 유틸리티** (`server/utils/timezone.js`)

```javascript
const { 
  getCurrentKST,           // 현재 한국 시간 (Date 객체)
  getCurrentKSTString,      // 현재 한국 시간 (YYYY-MM-DD)
  getCurrentKSTDateTimeString, // 현재 한국 시간 (YYYY-MM-DD HH:mm:ss)
  convertUTCToKST,         // UTC → KST 변환
  convertKSTToUTC,         // KST → UTC 변환
  formatDate,              // 날짜 포맷팅 (YYYY-MM-DD)
  formatDateTime,          // 날짜시간 포맷팅 (YYYY-MM-DD HH:mm:ss)
  calculateDateDifference, // 두 날짜 간 차이 계산
  isValidDate              // 날짜 유효성 검사
} = require('../utils/timezone');
```

### **프론트엔드 유틸리티** (`client/src/utils/timezone.js`)

```javascript
import { 
  getCurrentKST,           // 현재 한국 시간 (Date 객체)
  getCurrentKSTString,      // 현재 한국 시간 (YYYY-MM-DD)
  getCurrentKSTDateTimeString, // 현재 한국 시간 (YYYY-MM-DD HH:mm:ss)
  convertUTCToKST,         // UTC → KST 변환
  convertKSTToUTC,         // KST → UTC 변환
  formatDate,              // 날짜 포맷팅 (YYYY-MM-DD)
  formatDateTime,          // 날짜시간 포맷팅 (YYYY-MM-DD HH:mm:ss)
  calculateDateDifference, // 두 날짜 간 차이 계산
  isValidDate              // 날짜 유효성 검사
} from '../../utils/timezone';
```

## 📅 시간대 처리 흐름

```
1. 클라이언트 (브라우저)
   ↓ (현지 시간)
2. 프론트엔드 유틸리티 (KST 변환)
   ↓ (KST 기준)
3. API 요청 (KST 데이터)
   ↓ (KST 전송)
4. 서버 (Node.js + KST 설정)
   ↓ (KST 처리)
5. 데이터베이스 (MySQL + KST 설정)
   ↓ (KST 저장)
6. 저장된 데이터 (KST 기준)
```

## 🔧 사용 예시

### **서버에서 현재 KST 시간 가져오기**
```javascript
const { getCurrentKSTString } = require('../utils/timezone');

// 현재 한국 시간을 YYYY-MM-DD 형식으로
const today = getCurrentKSTString();
console.log(today); // 예: "2024-01-15"
```

### **프론트엔드에서 날짜 포맷팅**
```javascript
import { formatDate } from '../../utils/timezone';

// 날짜를 YYYY-MM-DD 형식으로
const formattedDate = formatDate('2024-01-15T00:00:00.000Z');
console.log(formattedDate); // "2024-01-15"
```

### **UTC를 KST로 변환**
```javascript
import { convertUTCToKST } from '../../utils/timezone';

const utcDate = '2024-01-15T00:00:00.000Z';
const kstDate = convertUTCToKST(utcDate);
console.log(kstDate); // KST 기준 Date 객체
```

## ⚠️ 주의사항

### **1. 시간대 변환 시점**
- **입력**: 사용자 입력 시점에 KST로 변환
- **저장**: 데이터베이스에 KST 기준으로 저장
- **표시**: 프론트엔드에서 KST 기준으로 표시

### **2. 날짜 비교**
- 모든 날짜 비교는 KST 기준으로 수행
- 시간대 차이로 인한 오류 방지

### **3. API 통신**
- 클라이언트 ↔ 서버 간 날짜 데이터는 KST 기준
- ISO 문자열 사용 시 KST 변환 후 전송

## 🚀 성능 최적화

### **1. 유틸리티 함수 재사용**
- 중복 코드 제거
- 일관된 시간 처리 로직

### **2. 메모리 효율성**
- 불필요한 Date 객체 생성 최소화
- 문자열 기반 날짜 처리

### **3. 번들 크기 최적화**
- 필요한 함수만 import
- Tree shaking 지원

## 🔍 디버깅

### **콘솔 로그 확인**
```javascript
// 서버 콘솔
console.log('현재 서버 시간대:', process.env.TZ);
console.log('현재 KST 시간:', getCurrentKSTString());

// 브라우저 콘솔
console.log('현재 클라이언트 시간대:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('현재 KST 시간:', getCurrentKSTString());
```

### **시간대 불일치 문제 해결**
1. 서버 환경 변수 `TZ` 확인
2. 데이터베이스 `timezone` 설정 확인
3. 클라이언트 유틸리티 함수 사용 확인

## 📚 참고 자료

- [Node.js 시간대 설정](https://nodejs.org/api/process.html#processenvtz)
- [MySQL 시간대 설정](https://dev.mysql.com/doc/refman/8.0/en/time-zone-support.html)
- [JavaScript Date 객체](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [한국 표준시 (KST)](https://en.wikipedia.org/wiki/Korea_Standard_Time)

## ✅ 검증 방법

### **1. 서버 시간대 확인**
```bash
cd server
node -e "console.log('서버 시간대:', process.env.TZ); console.log('현재 시간:', new Date().toString());"
```

### **2. 데이터베이스 시간대 확인**
```sql
SELECT @@global.time_zone, @@session.time_zone, NOW();
```

### **3. 프론트엔드 시간대 확인**
```javascript
// 브라우저 콘솔에서
console.log('클라이언트 시간대:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('KST 유틸리티 시간:', getCurrentKSTString());
```

---

**마지막 업데이트**: 2024년 1월 15일  
**담당자**: 개발팀  
**버전**: 1.0.0 