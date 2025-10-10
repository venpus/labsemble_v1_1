# 🔔 앱 업데이트 배지 기능

## ✅ 개요

메인 메뉴 화면에서 서버에 새로운 업데이트 버전이 있는지 자동으로 체크하고, 업데이트가 있을 경우 **"앱 업데이트" 메뉴 아이콘에 빨간색 배지**를 표시하여 사용자에게 알림을 제공합니다.

## 🎯 주요 기능

1. **자동 버전 체크**: 앱이 메인 화면에 진입할 때 자동으로 서버와 버전 비교
2. **시각적 알림**: 새 버전이 있을 경우 "앱 업데이트" 메뉴에 빨간색 배지 표시
3. **실시간 업데이트**: 상태 변경 시 즉시 UI 반영

## 🔄 작동 방식

### 1. 버전 체크 프로세스

```
앱 시작 (HomeScreen)
    ↓
현재 앱 버전 확인
(versionCode, versionName)
    ↓
서버 API 호출
(/api/app/check-update)
    ↓
버전 비교
    ↓
새 버전 있음? → YES → 배지 표시 ✅
              ↓
             NO → 배지 숨김
```

### 2. 버전 비교 로직

```kotlin
isUpdateNeeded = latestVersionCode > currentVersionCode
```

- **currentVersionCode**: 현재 설치된 앱의 버전 코드
- **latestVersionCode**: 서버에 등록된 최신 버전 코드
- 버전 코드가 더 높으면 업데이트가 필요한 것으로 판단

## 📱 UI 표시

### 배지 없음 (업데이트 없음)
```
┌─────────────┐
│  앱 업데이트  │
│     📱      │
│  SystemUpdate│
└─────────────┘
```

### 배지 있음 (업데이트 있음)
```
┌─────────────┐
│  앱 업데이트  │
│     📱 🔴   │ ← 빨간색 배지
│  SystemUpdate│
└─────────────┘
```

**배지 디자인:**
- 크기: 16dp (외부), 12dp (내부)
- 색상: 빨간색 (#FF3D00)
- 모양: 원형 (CircleShape)
- 테두리: 흰색 (2dp)
- 위치: 아이콘 우측 상단

## 💻 코드 구현

### 1. 데이터 모델 수정

**`MenuItem` 데이터 클래스:**
```kotlin
data class MenuItem(
    val id: Int,
    val title: String,
    val icon: ImageVector,
    val color: Color,
    val showBadge: Boolean = false // ✅ 추가
)
```

### 2. 상태 관리 (HomeViewModel)

**기존 코드 (이미 구현되어 있음):**
```kotlin
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val appUpdateRepository: AppUpdateRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()
    
    fun checkForAppUpdate(context: Context) {
        viewModelScope.launch {
            try {
                val packageInfo = getPackageInfo(context)
                appUpdateRepository.checkForUpdates(
                    versionCode = packageInfo.versionCode,
                    versionName = packageInfo.versionName
                )
                    .onSuccess { response ->
                        val needsUpdate = response.needsUpdate || isUpdateNeeded(
                            currentVersionCode = packageInfo.versionCode,
                            latestVersionCode = response.latestVersion.versionCode
                        )
                        _uiState.value = _uiState.value.copy(hasAppUpdate = needsUpdate)
                    }
                    .onFailure { 
                        _uiState.value = _uiState.value.copy(hasAppUpdate = false)
                    }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(hasAppUpdate = false)
            }
        }
    }
}

data class HomeUiState(
    val user: User? = null,
    val hasAppUpdate: Boolean = false // ✅ 업데이트 여부
)
```

### 3. UI 구현 (HomeScreen)

**앱 업데이트 체크:**
```kotlin
@Composable
fun HomeScreen(...) {
    val homeViewModel = hiltViewModel<HomeViewModel>()
    val uiState by homeViewModel.uiState.collectAsStateWithLifecycle()
    
    // 앱 업데이트 체크
    LaunchedEffect(Unit) {
        homeViewModel.checkForAppUpdate(context)
    }
    
    // 메뉴 아이템 생성
    val menuItems = buildList {
        add(MenuItem(
            id = 11,
            title = "앱 업데이트",
            icon = Icons.Default.SystemUpdate,
            color = Color(0xFF607D8B),
            showBadge = uiState.hasAppUpdate // ✅ 상태 전달
        ))
    }
}
```

**배지 표시 (MenuCard 컴포넌트):**
```kotlin
@Composable
fun MenuCard(
    item: MenuItem,
    onClick: () -> Unit
) {
    Card(...) {
        Column(...) {
            Box(contentAlignment = Alignment.Center) {
                // 메뉴 아이콘
                Box(...) {
                    Icon(...)
                }
                
                // 배지 표시 ✅
                if (item.showBadge) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = 6.dp, y = (-6).dp)
                    ) {
                        // 외부 테두리 (흰색)
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .clip(CircleShape)
                                .background(Color.White)
                        )
                        // 내부 원형 (빨간색)
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .padding(2.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFFF3D00))
                        )
                    }
                }
            }
        }
    }
}
```

## 🔍 서버 API

### 엔드포인트

```
POST /api/app/check-update
```

### 요청 파라미터

```json
{
  "versionCode": 1,
  "versionName": "1.0.0"
}
```

### 응답 형식

```json
{
  "success": true,
  "needsUpdate": true,
  "currentVersion": {
    "versionCode": 1,
    "versionName": "1.0.0"
  },
  "latestVersion": {
    "versionCode": 2,
    "versionName": "2.0.0",
    "downloadUrl": "http://server/apk/v2.apk",
    "releaseNotes": "새로운 기능 추가",
    "forceUpdate": false,
    "releaseDate": "2025-10-10"
  }
}
```

## 📊 데이터 흐름

```
┌──────────────────┐
│   HomeScreen     │
│  (UI Layer)      │
└────────┬─────────┘
         │ checkForAppUpdate()
         ↓
┌──────────────────┐
│  HomeViewModel   │
│ (ViewModel)      │
└────────┬─────────┘
         │ checkForUpdates()
         ↓
┌──────────────────┐
│AppUpdateRepository│
│ (Repository)     │
└────────┬─────────┘
         │ API Call
         ↓
┌──────────────────┐
│   ApiService     │
│  (Network)       │
└────────┬─────────┘
         │ HTTP Request
         ↓
┌──────────────────┐
│   Server API     │
│                  │
└──────────────────┘
```

## 🎨 배지 스타일링 상세

### 위치 계산
```kotlin
.align(Alignment.TopEnd)      // 부모 Box의 우측 상단
.offset(x = 6.dp, y = (-6).dp) // 아이콘 밖으로 살짝 이동
```

### 레이어 구조
```
┌─────────────────┐  ← 외부 Box (16dp, 흰색 테두리)
│  ┌───────────┐  │
│  │  ●●●●●●●  │  │  ← 내부 Box (12dp, 빨간색)
│  │  ●●●●●●●  │  │
│  │  ●●●●●●●  │  │
│  └───────────┘  │
└─────────────────┘
```

### 색상 선택
- **배경**: `Color.White` - 명확한 구분
- **배지**: `Color(0xFFFF3D00)` - 강렬한 주황빨강 (주목도 높음)

## ✅ 테스트 시나리오

### 1. 업데이트 있음
1. 서버에 새 버전 등록 (versionCode: 2)
2. 현재 앱 버전: 1
3. 앱 실행 → 메인 화면 진입
4. **결과**: "앱 업데이트" 메뉴에 빨간색 배지 표시 ✅

### 2. 업데이트 없음
1. 서버 버전: 1
2. 현재 앱 버전: 1
3. 앱 실행 → 메인 화면 진입
4. **결과**: 배지 표시 안 됨 ✅

### 3. 네트워크 오류
1. 서버 연결 실패
2. 앱 실행 → 메인 화면 진입
3. **결과**: 배지 표시 안 됨 (false로 처리) ✅

### 4. 버전 다운그레이드
1. 서버 버전: 1
2. 현재 앱 버전: 2 (개발 중)
3. 앱 실행 → 메인 화면 진입
4. **결과**: 배지 표시 안 됨 (latestVersionCode > currentVersionCode 조건) ✅

## 🚀 확장 가능성

### 1. 다른 메뉴에도 배지 적용
```kotlin
// 예시: 새 알림이 있을 때
add(MenuItem(
    id = 3,
    title = "알림",
    icon = Icons.Default.Notifications,
    color = Color(0xFFFFA500),
    showBadge = uiState.hasNewNotifications
))
```

### 2. 배지 카운트 표시
```kotlin
data class MenuItem(
    val id: Int,
    val title: String,
    val icon: ImageVector,
    val color: Color,
    val badgeCount: Int? = null // null이면 숫자 없이 점만 표시
)
```

### 3. 배지 색상 커스터마이징
```kotlin
data class MenuItem(
    val id: Int,
    val title: String,
    val icon: ImageVector,
    val color: Color,
    val showBadge: Boolean = false,
    val badgeColor: Color = Color.Red // 배지 색상 지정
)
```

## 📁 수정된 파일

### 주요 파일
- ✅ `AndroidAPP/app/src/main/java/com/example/myapplication/ui/home/HomeScreen.kt`

### 기존 파일 (사용됨)
- `AndroidAPP/app/src/main/java/com/example/myapplication/ui/home/HomeViewModel.kt`
- `AndroidAPP/app/src/main/java/com/example/myapplication/data/repository/AppUpdateRepository.kt`
- `AndroidAPP/app/src/main/java/com/example/myapplication/data/model/AppUpdate.kt`
- `AndroidAPP/app/src/main/java/com/example/myapplication/data/api/ApiService.kt`

## 🔧 기술 스택

- **UI Framework**: Jetpack Compose
- **상태 관리**: StateFlow
- **의존성 주입**: Hilt
- **네트워크**: Retrofit + OkHttp
- **비동기 처리**: Kotlin Coroutines

## 📝 참고사항

### 버전 코드 관리

**build.gradle.kts:**
```kotlin
android {
    defaultConfig {
        versionCode = 1     // 정수형, 앱 업데이트 판단 기준
        versionName = "1.0" // 문자열, 사용자에게 표시
    }
}
```

### 업데이트 체크 타이밍

- **앱 시작 시**: `LaunchedEffect(Unit)` 블록에서 한 번 실행
- **메인 화면 재진입 시**: 자동 재체크 (필요 시 구현 가능)

### 에러 처리

```kotlin
.onFailure { 
    // 오류 발생 시 배지 표시 안 함
    _uiState.value = _uiState.value.copy(hasAppUpdate = false)
}
```

**이유**: 네트워크 오류나 서버 문제로 인해 잘못된 배지가 표시되는 것을 방지

## 🎯 사용자 경험

### Before (변경 전)
- 사용자가 직접 "앱 업데이트" 메뉴에 들어가서 확인해야 함
- 업데이트 유무를 모르고 지나칠 수 있음

### After (변경 후)
- 메인 화면에서 즉시 업데이트 알림 확인 ✅
- 빨간색 배지로 시각적 주목도 향상 ✅
- 사용자가 직접 확인할 필요 없음 ✅

## 📊 예상 효과

1. **업데이트 설치율 증가**: 시각적 알림으로 사용자 인지도 향상
2. **최신 버전 유지**: 더 많은 사용자가 최신 기능 사용
3. **버그 수정 빠른 배포**: 중요 업데이트 빠르게 전파

---

**작성일**: 2025-10-10  
**작성자**: AI Assistant  
**버전**: 1.0

