// 상용 환경 설정
export const config = {
  NODE_ENV: 'production',
  API_BASE_URL: '', // 상용에서는 상대 경로 사용
  APP_NAME: 'Labsemble Manufacturing',
  VERSION: '1.0.0',
  
  // 상용용 설정
  DEBUG: false,
  LOG_LEVEL: 'error',
  
  // API 설정
  API_TIMEOUT: 30000,
  API_RETRY_ATTEMPTS: 3,
  
  // 기능 플래그 (상용용)
  FEATURES: {
    ENABLE_DEBUG_PANEL: false,
    ENABLE_MOCK_DATA: false,
    ENABLE_ANALYTICS: true,
  }
};

export default config;


