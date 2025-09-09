// 상용 환경 설정
module.exports = {
  NODE_ENV: 'production',
  PORT: 5000,
  JWT_SECRET: 'ed6857e1988bbf16ebe2d0a07e837991',
  CORS_ORIGIN: 'http://labsesmble.com',
  
  // 시간대 설정
  TZ: 'Asia/Seoul',
  
  // 상용 데이터베이스 설정
  DB_HOST: 'labsemble.com',
  DB_USER: 'venpus',
  DB_PASSWORD: 'TianXian007!',
  DB_NAME: 'labsemble',
  
  // 서버 네트워크 설정
  SERVER_HOST: 'labsemble.com',
  
  // 로깅 설정 (상용용 - 에러 로그만 출력)
  LOG_LEVEL: 'error'
};
