// 애플리케이션 버전 정보
// 새로운 코드를 서버에 적용할 때마다 이 버전을 업데이트하세요

export const APP_VERSION = 'V1.0.5TEST';
export const VERSION_DATE = '2025-09-05';
export const VERSION_DESCRIPTION = 'MJ 프로젝트 등록 후 상세 페이지 자동 이동 기능 추가';

// 버전 정보 객체
export const versionInfo = {
  version: APP_VERSION,
  date: VERSION_DATE,
  description: VERSION_DESCRIPTION,
  build: process.env.REACT_APP_BUILD_NUMBER || 'dev'
};

export default versionInfo;
