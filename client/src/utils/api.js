// API 유틸리티 함수들
import config from '../config/environment-loader';

// API 기본 URL 설정 (환경별 설정 사용)
const getApiBaseUrl = () => {
  return config.API_BASE_URL;
};

// API URL 생성 함수
export const getApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// 타임아웃 설정
const DEFAULT_TIMEOUT = 30000; // 30초
const RETRY_ATTEMPTS = 3; // 재시도 횟수
const RETRY_DELAY = 1000; // 재시도 간격 (1초)

// 타임아웃이 있는 fetch 함수
const fetchWithTimeout = (url, options, timeout = DEFAULT_TIMEOUT) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
};

// 재시도 로직이 포함된 fetch 함수
const fetchWithRetry = async (url, options, retries = RETRY_ATTEMPTS) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      // HTTP 에러 상태 체크
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.warn(`API 요청 실패 (시도 ${i + 1}/${retries}):`, error.message);
      
      // 마지막 시도인 경우 에러 던지기
      if (i === retries - 1) {
        throw error;
      }
      
      // 재시도 전 대기
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
    }
  }
};

// 인증 헤더가 포함된 fetch 함수
export const apiRequest = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  
  try {
    return await fetchWithRetry(url, finalOptions);
  } catch (error) {
    // 네트워크 오류 상세 정보 추가
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
    }
    throw error;
  }
};

// GET 요청 헬퍼
export const apiGet = (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'GET' });
};

// POST 요청 헬퍼
export const apiPost = (endpoint, data, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// PUT 요청 헬퍼
export const apiPut = (endpoint, data, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// DELETE 요청 헬퍼
export const apiDelete = (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
};

export default {
  getApiUrl,
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
};
