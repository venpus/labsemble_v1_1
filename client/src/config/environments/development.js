// 개발 환경 설정
export const config = {
  NODE_ENV: 'development',
  API_BASE_URL: 'http://localhost:5000',
  APP_NAME: 'Labsemble Manufacturing (Dev)',
  VERSION: '1.0.0-dev',
  
  // 개발용 설정
  DEBUG: true,
  LOG_LEVEL: 'debug',
  
  // API 설정
  API_TIMEOUT: 30000,
  API_RETRY_ATTEMPTS: 3,
  
  // 기능 플래그 (개발용)
  FEATURES: {
    ENABLE_DEBUG_PANEL: true,
    ENABLE_MOCK_DATA: false,
    ENABLE_ANALYTICS: false,
  }
};

export default config;


