const NodeCache = require('node-cache');

// 캐시 인스턴스 생성 (TTL: 5분)
const cache = new NodeCache({ 
  stdTTL: 300, // 5분
  checkperiod: 60, // 1분마다 만료된 키 정리
  useClones: false // 성능 최적화
});

// 캐시 미들웨어
const cacheMiddleware = (ttl = 300) => {
  return (req, res, next) => {
    // GET 요청만 캐싱
    if (req.method !== 'GET') {
      return next();
    }
    
    // 캐시 키 생성 (URL + 쿼리 파라미터 + 사용자 ID)
    const cacheKey = `${req.originalUrl}:${req.user?.id || 'anonymous'}`;
    
    // 캐시에서 데이터 조회
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('🎯 [Cache] 캐시 히트:', cacheKey);
      return res.json(cachedData);
    }
    
    // 원본 응답 함수 저장
    const originalJson = res.json;
    
    // res.json을 오버라이드하여 캐시에 저장
    res.json = function(data) {
      // 성공 응답만 캐싱
      if (data && data.success !== false) {
        console.log('💾 [Cache] 캐시 저장:', cacheKey, `TTL: ${ttl}초`);
        cache.set(cacheKey, data, ttl);
      }
      
      // 원본 함수 호출
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// 캐시 무효화 함수
const invalidateCache = (pattern) => {
  const keys = cache.keys();
  const regex = new RegExp(pattern);
  const keysToDelete = keys.filter(key => regex.test(key));
  
  if (keysToDelete.length > 0) {
    cache.del(keysToDelete);
    console.log(`🗑️ [Cache] 캐시 무효화: ${keysToDelete.length}개 키 삭제`, keysToDelete);
  }
};

// 특정 사용자의 캐시 무효화
const invalidateUserCache = (userId) => {
  invalidateCache(`.*:${userId}$`);
};

// 재고 관련 캐시 무효화
const invalidateInventoryCache = () => {
  invalidateCache('.*inventory.*');
};

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache,
  invalidateUserCache,
  invalidateInventoryCache
};
