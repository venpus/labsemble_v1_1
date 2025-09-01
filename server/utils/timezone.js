/**
 * 시간대 유틸리티 함수들
 * 모든 시간 처리를 한국 시간대(KST, UTC+9) 기준으로 통일
 */

// 한국 시간대 상수
const KST_OFFSET = 9 * 60 * 60 * 1000; // UTC+9 (밀리초)
const KST_TIMEZONE = 'Asia/Seoul';

/**
 * 현재 한국 시간을 Date 객체로 반환
 * @returns {Date} 한국 시간 기준 현재 시간
 */
const getCurrentKST = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + KST_OFFSET);
};

/**
 * 현재 한국 시간을 YYYY-MM-DD 형식 문자열로 반환
 * @returns {string} YYYY-MM-DD 형식의 한국 시간
 */
const getCurrentKSTString = () => {
  const kstDate = getCurrentKST();
  return kstDate.toISOString().split('T')[0];
};

/**
 * 현재 한국 시간을 YYYY-MM-DD HH:mm:ss 형식 문자열로 반환
 * @returns {string} YYYY-MM-DD HH:mm:ss 형식의 한국 시간
 */
const getCurrentKSTDateTimeString = () => {
  const kstDate = getCurrentKST();
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  const hours = String(kstDate.getHours()).padStart(2, '0');
  const minutes = String(kstDate.getMinutes()).padStart(2, '0');
  const seconds = String(kstDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * UTC 시간을 한국 시간으로 변환
 * @param {Date|string} utcDate - UTC 시간 (Date 객체 또는 ISO 문자열)
 * @returns {Date} 한국 시간으로 변환된 Date 객체
 */
const convertUTCToKST = (utcDate) => {
  if (!utcDate) return null;
  
  let date;
  if (typeof utcDate === 'string') {
    date = new Date(utcDate);
  } else if (utcDate instanceof Date) {
    date = new Date(utcDate);
  } else {
    return null;
  }
  
  if (isNaN(date.getTime())) return null;
  
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + KST_OFFSET);
};

/**
 * 한국 시간을 UTC로 변환
 * @param {Date|string} kstDate - 한국 시간 (Date 객체 또는 YYYY-MM-DD 문자열)
 * @returns {Date} UTC로 변환된 Date 객체
 */
const convertKSTToUTC = (kstDate) => {
  if (!kstDate) return null;
  
  let date;
  if (typeof kstDate === 'string') {
    date = new Date(kstDate);
  } else if (kstDate instanceof Date) {
    date = new Date(kstDate);
  } else {
    return null;
  }
  
  if (isNaN(date.getTime())) return null;
  
  const utc = date.getTime() - KST_OFFSET;
  return new Date(utc);
};

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷팅
 * @param {Date|string} date - 날짜
 * @returns {string} YYYY-MM-DD 형식 문자열
 */
const formatDate = (date) => {
  if (!date) return '';
  
  let dateObj;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return '';
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 날짜를 YYYY-MM-DD HH:mm:ss 형식으로 포맷팅
 * @param {Date|string} date - 날짜
 * @returns {string} YYYY-MM-DD HH:mm:ss 형식 문자열
 */
const formatDateTime = (date) => {
  if (!date) return '';
  
  let dateObj;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return '';
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 두 날짜 간의 차이를 일 단위로 계산
 * @param {Date|string} date1 - 첫 번째 날짜
 * @param {Date|string} date2 - 두 번째 날짜
 * @returns {number} 일 단위 차이 (절댓값)
 */
const calculateDateDifference = (date1, date2) => {
  if (!date1 || !date2) return null;
  
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  
  const timeDiff = Math.abs(d1.getTime() - d2.getTime());
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

/**
 * 날짜가 유효한지 확인
 * @param {Date|string} date - 확인할 날짜
 * @returns {boolean} 유효한 날짜인지 여부
 */
const isValidDate = (date) => {
  if (!date) return false;
  
  let dateObj;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return false;
  }
  
  return !isNaN(dateObj.getTime());
};

module.exports = {
  KST_OFFSET,
  KST_TIMEZONE,
  getCurrentKST,
  getCurrentKSTString,
  getCurrentKSTDateTimeString,
  convertUTCToKST,
  convertKSTToUTC,
  formatDate,
  formatDateTime,
  calculateDateDifference,
  isValidDate
}; 