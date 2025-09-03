# Payment 컴포넌트 구조

## 개요
기존의 1473줄짜리 Payment.js 파일을 여러 개의 작은 컴포넌트로 리팩토링하여 유지보수성과 가독성을 향상시켰습니다.

## 파일 구조

```
Payment/
├── index.js                    # 모든 컴포넌트와 훅을 export
├── Payment.js                  # 메인 컴포넌트 (전체 구조 관리)
├── PaymentHeader.js            # 결제 정보 헤더
├── PaymentStatus.js            # 결제 상태 정보 표시
├── PaymentTable.js             # 결제 상세 테이블
├── PaymentTableRow.js          # 테이블 행 컴포넌트 (재사용 가능)
├── AdditionalCostManager.js    # 추가 비용 항목 관리
├── PaymentSummary.js           # 결제 정보 요약 카드들
├── PaymentSummaryCard.js       # 개별 결제 요약 카드 (재사용 가능)
├── hooks/
│   ├── usePaymentData.js       # 결제 데이터 상태 관리
│   ├── usePaymentActions.js    # 결제 관련 액션들
│   └── useAutoSave.js          # 자동 저장 기능
└── README.md                   # 이 파일
```

## 주요 컴포넌트 설명

### 1. Payment.js (메인)
- 전체 Payment 컴포넌트의 구조를 관리
- admin 권한 확인
- 하위 컴포넌트들을 조합하여 렌더링

### 2. PaymentHeader.js
- 결제 정보 헤더와 저장 버튼
- admin 권한에 따른 조건부 렌더링

### 3. PaymentStatus.js
- 결제 상태 정보 표시 (선금 대기, 잔금 대기, 결제 완료)

### 4. PaymentTable.js
- 결제 상세 테이블 (단가, 총계, 배송비, 수수료 등)
- admin 권한에 따른 편집 가능/읽기 전용 모드

### 5. PaymentTableRow.js
- 테이블의 개별 행을 담당하는 재사용 가능한 컴포넌트
- 색상과 하이라이트 옵션 지원

### 6. AdditionalCostManager.js
- 추가 비용 항목 추가/삭제/편집
- 최대 5개 항목 제한

### 7. PaymentSummary.js
- 선금, 잔금, 최종 금액 요약 카드들을 관리
- 각 카드의 상태와 이벤트 핸들링

### 8. PaymentSummaryCard.js
- 개별 결제 요약 카드를 담당하는 재사용 가능한 컴포넌트
- 체크박스, 날짜 입력, 금액 표시 등

## 커스텀 훅

### 1. usePaymentData
- 모든 결제 관련 상태 관리
- 초기 데이터 로딩 및 파싱
- 자동 계산 로직

### 2. usePaymentActions
- 결제 상태 변경, 단가 변경, 수수료율 변경 등
- DB 저장 로직 포함

### 3. useAutoSave
- 데이터 변경 시 자동으로 DB에 저장
- 사용자 경험 향상을 위한 백그라운드 저장

## 사용법

```jsx
import Payment from './Payment';

// ProjectDetails.js에서 사용
<Payment project={project} />
```

## 장점

1. **가독성 향상**: 각 컴포넌트가 명확한 책임을 가짐
2. **재사용성**: PaymentTableRow, PaymentSummaryCard 등 재사용 가능
3. **유지보수성**: 특정 기능 수정 시 해당 파일만 수정하면 됨
4. **테스트 용이성**: 각 컴포넌트를 독립적으로 테스트 가능
5. **코드 분할**: 필요에 따라 lazy loading 적용 가능

## 주의사항

- 기존 import 경로가 변경되었으므로 다른 파일에서 Payment를 import하는 경우 경로를 수정해야 합니다.
- 모든 기능이 동일하게 작동하도록 테스트가 필요합니다. 