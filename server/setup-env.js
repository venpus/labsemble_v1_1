const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 강력한 JWT_SECRET 생성
function generateJWTSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// 환경별 설정
const environments = {
  development: {
    NODE_ENV: 'development',
    PORT: '5000',
    JWT_SECRET: generateJWTSecret(32),
    CORS_ORIGIN: 'http://localhost:3000',
    TZ: 'Asia/Seoul',
    DB_HOST: 'labsemble.com',
    DB_USER: 'venpus',
    DB_PASSWORD: 'your-db-password-here',
    DB_NAME: 'labsemble'
  },
  production: {
    NODE_ENV: 'production',
    PORT: '5000',
    JWT_SECRET: generateJWTSecret(64),
    CORS_ORIGIN: 'https://labsemble.com',
    TZ: 'Asia/Seoul',
    DB_HOST: 'labsemble.com',
    DB_USER: 'venpus',
    DB_PASSWORD: 'your-db-password-here',
    DB_NAME: 'labsemble'
  }
};

function createEnvFile(env = 'development') {
  const config = environments[env];
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const envPath = path.join(__dirname, '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ .env 파일이 생성되었습니다 (${env} 환경)`);
    console.log(`📁 파일 위치: ${envPath}`);
    console.log(`🔑 JWT_SECRET: ${config.JWT_SECRET.substring(0, 16)}...`);
    console.log('\n⚠️  주의사항:');
    console.log('1. DB_PASSWORD를 실제 데이터베이스 비밀번호로 변경하세요');
    console.log('2. JWT_SECRET은 자동으로 생성되었습니다');
    console.log('3. 이 파일은 절대 Git에 커밋하지 마세요');
    
    return true;
  } catch (error) {
    console.error('❌ .env 파일 생성 실패:', error.message);
    return false;
  }
}

function main() {
  console.log('🚀 환경변수 설정 스크립트');
  console.log('========================\n');
  
  // 명령행 인수 확인
  const args = process.argv.slice(2);
  const env = args[0] || 'development';
  
  if (!environments[env]) {
    console.error(`❌ 지원하지 않는 환경: ${env}`);
    console.log('지원하는 환경: development, production');
    process.exit(1);
  }
  
  console.log(`🔧 ${env} 환경 설정을 시작합니다...\n`);
  
  // .env 파일 생성
  if (createEnvFile(env)) {
    console.log('\n✅ 환경변수 설정이 완료되었습니다!');
    console.log('이제 서버를 재시작하세요.');
  } else {
    console.log('\n❌ 환경변수 설정에 실패했습니다.');
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { createEnvFile, generateJWTSecret }; 