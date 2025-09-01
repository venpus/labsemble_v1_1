# Delivery 컴포넌트

납기 일정을 관리하는 컴포넌트 모음입니다.

## 구조

```
Delivery/
├── Delivery.js          # 메인 컴포넌트 (간소화됨)
├── DeliveryHeader.js    # 헤더 컴포넌트 (상태 계산 로직 단순화)
├── WarehouseEntry.js    # 입고 기록 관리 컴포넌트
├── hooks/
│   └── useDeliveryState.js # Admin 권한 관리 Hook (간소화됨)
├── index.js            # 컴포넌트 export
└── README.md           # 이 파일
```

## 컴포넌트 설명

### Delivery.js (메인 컴포넌트)
- **간소화된 구조**: 불필요한 복잡한 로직 제거
- **명확한 책임**: 하위 컴포넌트 조합 및 상태 관리
- **Props 전달**: project 데이터와 권한 정보를 하위 컴포넌트로 전달

### DeliveryHeader.js
- **단순화된 상태 계산**: 복잡한 useEffect 제거
- **실시간 상태 표시**: project prop 변경 시 자동 업데이트
- **시각적 효과**: 상태별 아이콘, 색상, 애니메이션

### WarehouseEntry.js
- **입고 기록 관리**: 다중 입고 행 추가/삭제
- **이미지 업로드**: 최대 5개 이미지 관리
- **자동 상태 변경**: 입고 진행에 따른 납기상태 자동 업데이트

### useDeliveryState.js (Hook)
- **Admin 권한 관리**: JWT 토큰 기반 권한 확인
- **간소화된 상태**: 필요한 기능만 유지
- **에러 처리**: 권한 확인 실패 시 적절한 처리

## 주요 기능

1. **납기 상태 관리**
   - 실시간 납기 상태 표시
   - 상태별 시각적 표현 (아이콘, 색상, 애니메이션)

2. **입고 기록 관리**
   - 다중 입고 행 추가/삭제 (최대 10개)
   - 입고 날짜 및 수량 입력
   - 이미지 업로드 및 관리 (최대 5개)

3. **자동 상태 변경**
   - 첫 번째 입고 기록 완성 시 "입고중" 상태로 변경
   - 모든 입고 완료 시 "입고 완료" 상태로 변경

4. **권한 관리**
   - Admin 사용자만 수정 가능
   - 실시간 권한 확인 및 상태 관리

## 리팩토링 개선사항

### **코드 품질 향상**
- **불필요한 상태 제거**: localProject, projectRef 등 복잡한 상태 관리 제거
- **함수 단순화**: 복잡한 useCallback과 useEffect 로직 정리
- **의존성 최적화**: 불필요한 의존성 배열 정리

### **성능 최적화**
- **불필요한 리렌더링 방지**: 상태 변경 시에만 컴포넌트 업데이트
- **메모리 사용량 감소**: 사용되지 않는 상태와 함수 제거
- **번들 크기 최적화**: 불필요한 import 제거

### **유지보수성 향상**
- **명확한 책임 분리**: 각 컴포넌트의 역할 명확화
- **코드 가독성**: 복잡한 로직을 단순하고 이해하기 쉽게 정리
- **일관된 패턴**: React 모범 사례를 따르는 구조

## 사용법

```jsx
import { Delivery } from './components/Project/MJ/Details/Delivery';

// ProjectDetails.js에서 사용
<Delivery project={project} />
```

## Props

### Delivery (메인)
- `project`: 프로젝트 데이터 객체

### 하위 컴포넌트들
- `isAdmin`: 관리자 권한 여부
- `isAdminLoading`: 권한 확인 로딩 상태
- `onDeliveryStatusChange`: 납기상태 변경 콜백

## 데이터 구조

```javascript
{
  delivery_status: '발주대기',              // 납기 상태
  is_order_completed: true,                // 발주 완료 여부
  actual_order_date: '2024-01-01',         // 실제 발주일
  expected_factory_shipping_date: '2024-02-01', // 예상 공장 출고일
  changed_factory_shipping_date: '2024-02-15',  // 수동 설정 출고일
  quantity: 100                            // 총 수량
}
``` 