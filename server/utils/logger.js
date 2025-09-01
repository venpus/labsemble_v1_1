/**
 * 환경변수에 따른 로그 제어 유틸리티
 * NODE_ENV=production일 때는 디버깅 로그 비활성화
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// 개발 환경에서만 로그 출력
const devLog = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

// 개발 환경에서만 로그 출력 (이모지 포함)
const devLogWithEmoji = (emoji, ...args) => {
  if (isDevelopment) {
    console.log(emoji, ...args);
  }
};

// 에러 로그는 항상 출력 (상용 환경에서도)
const errorLog = (...args) => {
  console.error(...args);
};

// 경고 로그는 개발 환경에서만 출력
const warnLog = (...args) => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

// 정보 로그는 개발 환경에서만 출력
const infoLog = (...args) => {
  if (isDevelopment) {
    console.info(...args);
  }
};

module.exports = {
  devLog,
  devLogWithEmoji,
  errorLog,
  warnLog,
  infoLog,
  isProduction,
  isDevelopment
}; 