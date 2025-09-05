# 버전 업데이트 가이드

## 📋 개요
새로운 코드를 서버에 적용할 때마다 버전 정보를 업데이트하는 방법을 안내합니다.

## 🔧 버전 업데이트 방법

### 1. 버전 정보 파일 수정
`client/src/config/version.js` 파일을 열어서 다음 정보를 업데이트하세요:

```javascript
export const APP_VERSION = 'V1.0.4';  // 새 버전 번호
export const VERSION_DATE = '2025-01-16';  // 업데이트 날짜
export const VERSION_DESCRIPTION = '새로운 기능 설명';  // 변경 사항 설명
```

### 2. 버전 번호 규칙
- **Major Version**: 큰 기능 변경이나 구조적 변경 (V1.0.0 → V2.0.0)
- **Minor Version**: 새로운 기능 추가 (V1.0.0 → V1.1.0)
- **Patch Version**: 버그 수정이나 작은 개선 (V1.0.0 → V1.0.1)

### 3. 업데이트 예시

#### 버그 수정
```javascript
export const APP_VERSION = 'V1.0.4';
export const VERSION_DATE = '2025-01-16';
export const VERSION_DESCRIPTION = '로그인 오류 수정 및 성능 개선';
```

#### 새로운 기능 추가
```javascript
export const APP_VERSION = 'V1.1.0';
export const VERSION_DATE = '2025-01-20';
export const VERSION_DESCRIPTION = '사용자 대시보드 개선 및 알림 기능 추가';
```

#### 주요 업데이트
```javascript
export const APP_VERSION = 'V2.0.0';
export const VERSION_DATE = '2025-02-01';
export const VERSION_DESCRIPTION = '전체 UI/UX 개편 및 새로운 모듈 추가';
```

## 📍 버전 정보 표시 위치
- **위치**: Admin 대시보드의 Sidebar 하단
- **표시 대상**: 관리자(Admin) 권한 사용자만
- **표시 내용**: 
  - 버전 번호 (V1.0.3)
  - 업데이트 날짜 (2025-01-15)
  - 변경 사항 설명
  - 빌드 번호 (개발 환경이 아닌 경우)

## 🚀 배포 시 주의사항

1. **버전 업데이트**: 코드 변경 후 반드시 `version.js` 파일 업데이트
2. **테스트**: 버전 정보가 올바르게 표시되는지 확인
3. **문서화**: 변경 사항을 이 가이드에 기록
4. **백업**: 이전 버전 정보를 백업으로 보관

## 📝 변경 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|-----------|
| V1.0.3 | 2025-01-15 | MJ 프로젝트 등록 후 상세 페이지 자동 이동 기능 추가 |
| V1.0.2 | 2025-01-10 | 물류 결제 관리 배송비 CNY 표시 기능 추가 |
| V1.0.1 | 2025-01-05 | 패킹리스트 packing_code unique 처리 개선 |
| V1.0.0 | 2025-01-01 | 초기 버전 릴리스 |

## 🔍 버전 확인 방법

1. Admin 계정으로 로그인
2. 대시보드 Sidebar 하단의 "시스템 버전" 섹션 확인
3. 현재 버전, 날짜, 변경 사항을 확인할 수 있음

## ⚠️ 주의사항

- 버전 정보는 관리자만 볼 수 있도록 설정되어 있습니다
- 일반 사용자에게는 버전 정보가 표시되지 않습니다
- 버전 업데이트 시 기존 사용자 세션에 영향을 주지 않습니다
