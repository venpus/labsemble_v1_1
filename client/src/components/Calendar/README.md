# MJ Calendar Component

MJ 프로젝트의 주문 및 물류 일정을 관리하는 캘린더 컴포넌트입니다.

## 🚀 주요 기능

### 1. **실시간 데이터 연동**
- **주문 달력**: `mj_project` 테이블의 `actual_order_date` 기반 발주 일정 표시
- **물류 달력**: `expected_factory_shipping_date`, `actual_factory_shipping_date` 기반 출고 일정 표시
- JWT 인증을 통한 보안된 데이터 접근
- 자동 새로고침 및 에러 처리

### 2. **스마트 상태 표시**
- **발주 완료**: ✅ 아이콘과 녹색 배경으로 표시
- **출고 완료**: 🚚 아이콘과 파란색 배경으로 표시
- **진행 중**: 기본 회색 배경으로 표시

### 3. **직관적인 UI/UX**
- 월별 네비게이션 (이전/다음/오늘)
- 탭 기반 주문/물류 전환
- 반응형 그리드 레이아웃
- 로딩 상태 및 에러 메시지 표시

## 📁 파일 구조

```
Calendar/
├── MJCalendar.js              # 메인 캘린더 컴포넌트
├── CalendarHeader.js           # 월 네비게이션 헤더
├── CalendarGrid.js            # 7x7 캘린더 그리드
├── CalendarDay.js             # 개별 날짜 셀
├── TabNavigation.js           # 주문/물류 탭 전환
├── EventModal.js              # 새 일정 추가 모달
├── hooks/                     # 커스텀 훅들
│   ├── useCalendarData.js     # 데이터 관리 및 API 연동
│   ├── useCalendarNavigation.js # 날짜 네비게이션
│   └── useEventForm.js        # 이벤트 폼 관리
├── index.js                   # 컴포넌트 내보내기
└── README.md                  # 이 문서
```

## 🔧 API 엔드포인트

### 발주 일정 조회
```
GET /api/mj-project/calendar/order-events
```
- `actual_order_date`가 있는 프로젝트들 조회
- 발주 완료 여부, 수량, 목표가, 공급자 정보 포함

### 물류 일정 조회
```
GET /api/mj-project/calendar/logistics-events
```
- `expected_factory_shipping_date` 또는 `actual_factory_shipping_date`가 있는 프로젝트들 조회
- 출고 완료 여부, 수량, 잔여 수량, 출고 상태 포함

## 💡 사용법

### 기본 사용
```javascript
import { MJCalendar } from './components/Calendar';

function Dashboard() {
  return <MJCalendar />;
}
```

### 개별 컴포넌트 사용
```javascript
import { 
  CalendarHeader, 
  CalendarGrid, 
  TabNavigation 
} from './components/Calendar';

function CustomCalendar() {
  return (
    <div>
      <CalendarHeader />
      <TabNavigation />
      <CalendarGrid />
    </div>
  );
}
```

## 🎨 커스텀 훅

### useCalendarData
- API에서 일정 데이터 가져오기
- 로딩 상태 및 에러 관리
- 데이터 새로고침 기능

### useCalendarNavigation
- 월별 날짜 네비게이션
- 날짜 선택 및 오늘 이동
- 캘린더 그리드 생성

### useEventForm
- 새 일정 추가 모달 관리
- 폼 상태 및 유효성 검사
- 이벤트 추가 처리

## 🔄 데이터 흐름

1. **컴포넌트 마운트**: `useCalendarData` 훅이 활성 탭에 따라 적절한 API 호출
2. **탭 변경**: 새로운 탭 선택 시 해당하는 데이터 자동 로드
3. **데이터 표시**: API 응답을 캘린더 이벤트 형식으로 변환하여 표시
4. **상태 업데이트**: 발주/출고 완료 상태에 따른 시각적 피드백
5. **새로고침**: 사용자가 수동으로 데이터 새로고침 가능

## 🎯 이벤트 데이터 구조

```javascript
{
  id: "프로젝트 ID",
  title: "프로젝트명",
  date: "2024-01-15", // YYYY-MM-DD 형식
  time: "09:00",
  location: "공급자명",
  description: "상세 설명",
  assignee: "담당자명",
  productName: "상품명",
  quantity: 100,
  unit: "개",
  
  // 추가 정보
  isOrderCompleted: true/false,        // 발주 완료 여부
  isFactoryShippingCompleted: true/false, // 출고 완료 여부
  factoryShippingStatus: "상태값",
  entryQuantity: 100,                  // 입고 수량
  exportQuantity: 50,                  // 출고 수량
  remainQuantity: 50,                  // 잔여 수량
  representativeImage: "이미지 경로"
}
```

## 🚨 에러 처리

- **인증 오류**: JWT 토큰 만료 또는 누락 시 적절한 에러 메시지
- **네트워크 오류**: API 호출 실패 시 사용자 친화적 에러 표시
- **데이터 오류**: 잘못된 데이터 형식 시 기본값으로 대체

## 🔒 보안

- JWT 토큰 기반 인증
- 사용자별 데이터 접근 제한
- SQL 인젝션 방지를 위한 prepared statements 사용

## 📱 반응형 디자인

- Tailwind CSS를 활용한 모바일 친화적 레이아웃
- 다양한 화면 크기에 최적화된 그리드 시스템
- 터치 기반 인터페이스 지원

## 🚀 향후 개선 계획

- [ ] 드래그 앤 드롭으로 일정 이동
- [ ] 일정 편집 및 삭제 기능
- [ ] 캘린더 뷰 전환 (월/주/일)
- [ ] 일정 알림 및 알림 설정
- [ ] 일정 내보내기 (PDF, Excel)
- [ ] 팀 일정 공유 기능 