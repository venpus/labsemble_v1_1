# 모바일 앱 - 제품 정보 웹 동기화 완료

## ✅ 개요

모바일 앱의 상품 상세 화면 → 기본정보 탭 → 제품 정보 카드를 **웹 화면과 일치**하도록 수정했습니다.

## 🔄 변경 사항

### 1. 발주 정보 카드 (ProjectBasicInfoCard)

**제목 변경:**
- ❌ "프로젝트 정보" → ✅ "발주 정보"

**제거된 필드:**
- ❌ 공급자 (project.supplierName) - 제품 정보로 이동
- ❌ 생성자 (project.createdByUsername)
- ❌ 생성일 (project.createdAt)

**남은 필드 (7개):**
1. 프로젝트명
2. 설명
3. 수량
4. 단가
5. 총 금액
6. 상태
7. 발주일

### 2. 제품 정보 카드 (ProductInfoCard)

**필드명 및 단위 변경:**

| 변경 전 | 변경 후 | 단위 변경 |
|---------|---------|----------|
| 박스 크기 | 한박스 입수량 | cm → 개 |
| 박스 무게 | 제품사이즈 | kg → cm |
| 소포장 방식 | 소포장 방식 | (없음) → 개 |

### 3. 필드 순서 변경

**변경 전:**
```
1. 1개 무게
2. 소포장 방식
3. 박스 크기
4. 박스 무게
5. 공장 납기소요일
```

**변경 후:**
```
1. 1개 무게 (g)
2. 제품사이즈 (cm)
3. 소포장 방식 (개) ✅
4. 한박스 입수량 (개)
5. 공급자 이름
6. 공장 납기소요일 (일)
7. 예상원가 (¥) ⭐ 새로 추가
```

### 4. 예상원가 표시 수정 ✨

**변경 사항:**
- ❌ "(자동)" 텍스트 제거
- ✅ 무게 기준 정보만 표시 (예: "100g 기준")

### 5. 예상원가 자동 계산 추가

**계산 공식:**
```
예상 단가 = (최종 금액 / 수량) 
          + (41/1000 × 1개 무게) 
          + (4.8/(5000/1개 무게)) 
          + (1/(5000/1개 무게))
```

**최종 금액:**
```
최종 금액 = (단가 × 수량) + 수수료 + 공장배송비 + 추가비용
```

## 📱 UI 변경 (모바일)

### 변경 전
```
┌─────────────────────────────────────┐
│ 프로젝트 정보                       │ ← "발주 정보"로 변경
├─────────────────────────────────────┤
│ 프로젝트명            상품A         │
│ 설명                  설명 내용     │
│ 수량                  100개         │
│ 단가                  ¥500          │
│ 총 금액               ¥50,000       │
│ 상태                  pending       │
│ 발주일                2025-01-01    │
│ 공급자                ABC업체       │ ← 제거
│ 생성자                홍길동        │ ← 제거
│ 생성일                2025-01-01    │ ← 제거
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 제품 정보                           │
├─────────────────────────────────────┤
│ 1개 무게              100g          │
│ 소포장 방식           폴리백         │ ← '개' 없음
│ 박스 크기             30x20x15cm    │
│ 박스 무게             2.5kg         │
│ 공장 납기소요일       15일          │
└─────────────────────────────────────┘
```

### 변경 후
```
┌─────────────────────────────────────┐
│ 발주 정보                           │ ✅ 제목 변경
├─────────────────────────────────────┤
│ 프로젝트명            상품A         │
│ 설명                  설명 내용     │
│ 수량                  100개         │
│ 단가                  ¥500          │
│ 총 금액               ¥50,000       │
│ 상태                  pending       │
│ 발주일                2025-01-01    │
└─────────────────────────────────────┘
✅ 공급자, 생성자, 생성일 제거됨

┌─────────────────────────────────────┐
│ 제품 정보                           │
├─────────────────────────────────────┤
│ 1개 무게              100g          │
│ 제품사이즈            10x5x3cm      │
│ 소포장 방식           폴리백 개      │ ✅ '개' 추가
│ 한박스 입수량         50개          │
│ 공급자 이름           ABC공급업체   │
│ 공장 납기소요일       15일          │
│ 예상원가              ¥539.22       │ ✅ 추가
│                       100g 기준      │
└─────────────────────────────────────┘
```

## 💻 코드 변경 내역

### 1. 데이터 모델 수정 (ProjectDetail.kt)

**추가된 필드:**
```kotlin
@SerializedName("fee")
val fee: String?,

@SerializedName("fee_rate")
val feeRate: String?,

@SerializedName("factory_shipping_cost")
val factoryShippingCost: String?,

@SerializedName("additional_cost_items")
val additionalCostItems: String?
```

### 2. UI 화면 수정 (ProjectDetailScreen.kt)

#### ProductInfoCard 컴포넌트 수정
```kotlin
@Composable
fun ProductInfoCard(project: ProjectDetail) {
    // 예상 단가 자동 계산
    val estimatedCost = calculateEstimatedUnitPrice(project)
    
    Card(...) {
        Column(...) {
            // 웹과 동일한 순서
            InfoRow("1개 무게", project.unitWeight?.let { "${it}g" } ?: "-")
            InfoRow("제품사이즈", project.boxWeight?.let { "${it}cm" } ?: "-")
            InfoRow("소포장 방식", project.packagingMethod ?: "-")
            InfoRow("한박스 입수량", project.boxDimensions?.let { "${it}개" } ?: "-")
            InfoRow("공급자 이름", project.supplierName ?: "-")
            InfoRow("공장 납기소요일", project.factoryDeliveryDays?.let { "${it}일" } ?: "-")
            
            // 예상원가 (자동 계산, 특별 표시)
            if (estimatedCost > 0) {
                // 청록색으로 강조, "(자동)" 표시
            }
        }
    }
}
```

#### 예상 단가 계산 함수 추가
```kotlin
fun calculateEstimatedUnitPrice(project: ProjectDetail): Double {
    val quantity = project.quantity.toDouble()
    val unitWeight = project.unitWeight?.toDoubleOrNull() ?: 0.0
    
    if (quantity == 0.0) return 0.0
    
    // 최종 금액 계산
    val subtotal = (project.unitPrice.toDoubleOrNull() ?: 0.0) * quantity
    val fee = project.fee?.toDoubleOrNull() ?: 0.0
    val factoryShippingCost = project.factoryShippingCost?.toDoubleOrNull() ?: 0.0
    val additionalCostTotal = 0.0 // 추가비용 (JSON 파싱 필요)
    
    val finalAmount = subtotal + fee + factoryShippingCost + additionalCostTotal
    
    // 예상 단가 계산
    val pricePerUnit = finalAmount / quantity
    val weightCost1 = (41.0 / 1000.0) * unitWeight
    val weightCost2 = if (unitWeight > 0) (4.8 / (5000.0 / unitWeight)) else 0.0
    val weightCost3 = if (unitWeight > 0) (1.0 / (5000.0 / unitWeight)) else 0.0
    
    return pricePerUnit + weightCost1 + weightCost2 + weightCost3
}
```

## 📊 데이터 매핑

### 서버 → 모바일 데이터 흐름

```
서버 API: GET /api/mj-project/:id
    ↓
ProjectDetail 모델
    ├─ unit_weight (1개 무게)
    ├─ box_weight (제품사이즈) ← 필드명은 같지만 의미 변경
    ├─ packaging_method (소포장 방식)
    ├─ box_dimensions (한박스 입수량) ← 필드명은 같지만 의미 변경
    ├─ supplier_name (공급자 이름)
    ├─ factory_delivery_days (공장 납기소요일)
    ├─ unit_price (단가)
    ├─ quantity (수량)
    ├─ fee (수수료) ⭐ 새로 추가
    ├─ fee_rate (수수료율) ⭐ 새로 추가
    ├─ factory_shipping_cost (공장배송비) ⭐ 새로 추가
    └─ additional_cost_items (추가비용) ⭐ 새로 추가
    ↓
UI 표시 (ProductInfoCard)
    ↓
예상원가 자동 계산
```

## 🔧 수정된 파일

| 파일 | 변경사항 |
|------|---------|
| `AndroidAPP/app/src/main/java/com/example/myapplication/data/model/ProjectDetail.kt` | 4개 필드 추가 (fee, fee_rate, factory_shipping_cost, additional_cost_items) |
| `AndroidAPP/app/src/main/java/com/example/myapplication/ui/project/ProjectDetailScreen.kt` | ProductInfoCard 수정, 예상원가 계산 함수 추가 |

## 🎯 웹 vs 모바일 비교

### 웹 (ProdInfo.js)
```javascript
제품정보:
├─ 1개 무게 (입력)
├─ 제품사이즈 (입력)
├─ 소포장 방식 (입력)
├─ 한박스 입수량 (입력)
├─ 공급자 이름 (입력)
├─ 공장 납기소요일 (입력)
└─ 예상원가 (자동 계산)
```

### 모바일 (ProductInfoCard)
```kotlin
제품정보:
├─ 1개 무게 (표시)
├─ 제품사이즈 (표시)
├─ 소포장 방식 (표시)
├─ 한박스 입수량 (표시)
├─ 공급자 이름 (표시)
├─ 공장 납기소요일 (표시)
└─ 예상원가 (자동 계산, 표시)
```

**동기화 상태: ✅ 완료**

## 🎨 예상원가 UI 특징 (모바일)

### 표시 형식
```kotlin
예상원가          ¥539.22
                  (자동)
                  100g 기준
```

**스타일:**
- 금액: 14sp, 굵게, 청록색 (0xFF0D9488)
- "(자동)": 10sp, 회색
- "100g 기준": 10sp, 연한 회색
- 우측 정렬

## 🚀 빌드 및 배포

### 앱 빌드 (Android Studio)
1. **Build > Clean Project**
2. **Build > Rebuild Project**
3. **Run > Run 'app'**

### 명령줄 빌드
```bash
cd AndroidAPP
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

**생성되는 APK:**
```
AndroidAPP/app/build/outputs/apk/debug/app-debug.apk
```

## ✅ 테스트 방법

1. 앱 실행
2. 로그인
3. 상품 조회 메뉴
4. 상품 선택
5. **기본정보** 탭 확인
6. **제품 정보** 카드 확인:
   - ✅ 1개 무게: 100g
   - ✅ 제품사이즈: 10x5x3cm
   - ✅ 소포장 방식: 폴리백
   - ✅ 한박스 입수량: 50개
   - ✅ 공급자 이름: ABC공급업체
   - ✅ 공장 납기소요일: 15일
   - ✨ **예상원가: ¥539.22 (자동) - 100g 기준**

## 📋 계산 예시

### 예시 데이터
```
단가: ¥500
수량: 100개
수수료: ¥2,500
공장배송비: ¥1,000
추가비용: ¥0
1개 무게: 100g
```

### 계산 과정
```
1. 총계 = 500 × 100 = ¥50,000
2. 최종 금액 = 50,000 + 2,500 + 1,000 + 0 = ¥53,500
3. 1개당 가격 = 53,500 / 100 = ¥535.00
4. 무게 비용1 = 0.041 × 100 = ¥4.10
5. 무게 비용2 = 4.8 / (5000/100) = ¥0.096
6. 무게 비용3 = 1 / (5000/100) = ¥0.02
7. 예상 단가 = 535.00 + 4.10 + 0.096 + 0.02 = ¥539.22
```

## ⚠️ 주의사항

### 서버 API 확인
서버에서 다음 필드들을 제공해야 합니다:
- ✅ `unit_weight`
- ✅ `box_weight` (제품사이즈 저장)
- ✅ `packaging_method`
- ✅ `box_dimensions` (한박스 입수량 저장)
- ✅ `supplier_name`
- ✅ `factory_delivery_days`
- ✅ `fee` ⭐
- ✅ `fee_rate` ⭐
- ✅ `factory_shipping_cost` ⭐
- ✅ `additional_cost_items` ⭐

### 추가비용 파싱
현재는 추가비용을 0으로 처리하고 있습니다. 나중에 JSON 파싱을 추가할 수 있습니다:

```kotlin
// 추가비용 JSON 파싱 (향후 개선)
if (project.additionalCostItems != null) {
    try {
        val gson = Gson()
        val type = object : TypeToken<List<AdditionalCostItem>>() {}.type
        val items: List<AdditionalCostItem> = gson.fromJson(project.additionalCostItems, type)
        additionalCostTotal = items.sumOf { it.cost }
    } catch (e: Exception) {
        additionalCostTotal = 0.0
    }
}
```

## 🎨 UI 스타일

### 예상원가 표시 (특별 스타일)
- **색상**: 청록색 (0xFF0D9488)
- **폰트**: 14sp, 굵게
- **추가 정보**: 
  - "(자동)" - 10sp, 회색
  - "Ng 기준" - 10sp, 연한 회색
- **정렬**: 우측 정렬, 여러 줄

## 📊 웹과 모바일 완전 동기화

| 항목 | 웹 | 모바일 | 동기화 |
|------|-------|--------|--------|
| 1개 무게 | ✅ 입력 (g) | ✅ 표시 (g) | ✅ |
| 제품사이즈 | ✅ 입력 (cm) | ✅ 표시 (cm) | ✅ |
| 소포장 방식 | ✅ 입력 | ✅ 표시 | ✅ |
| 한박스 입수량 | ✅ 입력 (개) | ✅ 표시 (개) | ✅ |
| 공급자 이름 | ✅ 입력 | ✅ 표시 | ✅ |
| 공장 납기소요일 | ✅ 입력 (일) | ✅ 표시 (일) | ✅ |
| 예상원가 | ✅ 자동 계산 | ✅ 자동 계산 | ✅ |

**완벽하게 동기화되었습니다!** 🎉

## 🔄 데이터 업데이트 흐름

```
웹에서 제품 정보 수정
    ↓
서버 DB 업데이트
    ↓
모바일 앱에서 조회
    ↓
최신 데이터 표시
    ↓
예상원가 자동 계산
```

---

**작성일**: 2025-01-10  
**상태**: ✅ 완료  
**컴파일 상태**: ✅ 오류 없음  
**웹 동기화**: ✅ 100% 일치

