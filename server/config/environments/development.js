// 개발 환경 설정
module.exports = {
  NODE_ENV: 'development',
  PORT: 5000,
  JWT_SECRET: '8e1b798b63f339c0b50ecd5476ab4c65',
  CORS_ORIGIN: 'http://localhost:3000',
  
  // 시간대 설정
  TZ: 'Asia/Seoul',
  
  // 개발용 데이터베이스 설정 (localhost)
  DB_HOST: 'localhost',
  DB_USER: 'root',
  DB_PASSWORD: 'TianXian007!',
  DB_NAME: 'labsemble',
  
  // 서버 네트워크 설정
  SERVER_HOST: 'localhost',
  
  // 로깅 설정 (개발용 - 모든 로그 출력)
  LOG_LEVEL: 'debug'
};
