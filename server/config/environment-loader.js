// 환경 설정 로더
const path = require('path');

// 환경 변수에서 NODE_ENV 가져오기 (기본값: development)
const environment = process.env.NODE_ENV || 'development';

console.log(`🔧 환경 설정 로딩: ${environment}`);

// 환경별 설정 파일 로드
let config;
try {
  config = require(`./environments/${environment}.js`);
  console.log(`✅ ${environment} 환경 설정 로드 완료`);
} catch (error) {
  console.error(`❌ ${environment} 환경 설정 파일을 찾을 수 없습니다.`);
  console.error('사용 가능한 환경: development, production');
  process.exit(1);
}

// 환경 변수로 설정 오버라이드 (환경 변수가 있으면 우선 적용)
const finalConfig = {
  ...config,
  // 환경 변수가 있으면 덮어쓰기
  NODE_ENV: process.env.NODE_ENV || config.NODE_ENV,
  PORT: process.env.PORT || config.PORT,
  JWT_SECRET: process.env.JWT_SECRET || config.JWT_SECRET,
  CORS_ORIGIN: process.env.CORS_ORIGIN || config.CORS_ORIGIN,
  TZ: process.env.TZ || config.TZ,
  DB_HOST: process.env.DB_HOST || config.DB_HOST,
  DB_USER: process.env.DB_USER || config.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD || config.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME || config.DB_NAME,
  SERVER_HOST: process.env.SERVER_HOST || config.SERVER_HOST,
  LOG_LEVEL: process.env.LOG_LEVEL || config.LOG_LEVEL,
};

// 설정 정보 출력 (보안상 민감한 정보는 마스킹)
console.log('📋 현재 환경 설정:');
console.log(`   NODE_ENV: ${finalConfig.NODE_ENV}`);
console.log(`   PORT: ${finalConfig.PORT}`);
console.log(`   DB_HOST: ${finalConfig.DB_HOST}`);
console.log(`   DB_NAME: ${finalConfig.DB_NAME}`);
console.log(`   CORS_ORIGIN: ${finalConfig.CORS_ORIGIN}`);
console.log(`   LOG_LEVEL: ${finalConfig.LOG_LEVEL}`);
console.log(`   JWT_SECRET: ${finalConfig.JWT_SECRET ? '설정됨' : '❌ 설정되지 않음'}`);

module.exports = finalConfig;
