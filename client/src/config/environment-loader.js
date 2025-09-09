// 클라이언트 환경 설정 로더
const environment = process.env.NODE_ENV || 'development';

console.log(`🔧 클라이언트 환경 설정 로딩: ${environment}`);

// 환경별 설정 파일 로드
let config;
try {
  if (environment === 'development') {
    config = require('./environments/development.js').config;
  } else if (environment === 'production') {
    config = require('./environments/production.js').config;
  } else {
    // 기본값은 development
    config = require('./environments/development.js').config;
  }
  
  console.log(`✅ 클라이언트 ${environment} 환경 설정 로드 완료`);
} catch (error) {
  console.error(`❌ 클라이언트 ${environment} 환경 설정 파일을 찾을 수 없습니다.`);
  console.error('사용 가능한 환경: development, production');
  // 기본 설정으로 폴백
  config = {
    NODE_ENV: 'development',
    API_BASE_URL: 'http://localhost:5000',
    APP_NAME: 'Labsemble Manufacturing',
    VERSION: '1.0.0',
    DEBUG: true,
    LOG_LEVEL: 'debug',
    API_TIMEOUT: 30000,
    API_RETRY_ATTEMPTS: 3,
    FEATURES: {
      ENABLE_DEBUG_PANEL: true,
      ENABLE_MOCK_DATA: false,
      ENABLE_ANALYTICS: false,
    }
  };
}

// 환경 변수로 설정 오버라이드 (환경 변수가 있으면 우선 적용)
const finalConfig = {
  ...config,
  // 환경 변수가 있으면 덮어쓰기
  NODE_ENV: process.env.NODE_ENV || config.NODE_ENV,
  API_BASE_URL: process.env.REACT_APP_API_URL || config.API_BASE_URL,
  APP_NAME: process.env.REACT_APP_NAME || config.APP_NAME,
  VERSION: process.env.REACT_APP_VERSION || config.VERSION,
  DEBUG: process.env.REACT_APP_DEBUG === 'true' || config.DEBUG,
  LOG_LEVEL: process.env.REACT_APP_LOG_LEVEL || config.LOG_LEVEL,
};

// 설정 정보 출력 (개발 환경에서만)
if (finalConfig.DEBUG) {
  console.log('📋 현재 클라이언트 환경 설정:');
  console.log(`   NODE_ENV: ${finalConfig.NODE_ENV}`);
  console.log(`   API_BASE_URL: ${finalConfig.API_BASE_URL}`);
  console.log(`   APP_NAME: ${finalConfig.APP_NAME}`);
  console.log(`   VERSION: ${finalConfig.VERSION}`);
  console.log(`   DEBUG: ${finalConfig.DEBUG}`);
  console.log(`   LOG_LEVEL: ${finalConfig.LOG_LEVEL}`);
}

export default finalConfig;


