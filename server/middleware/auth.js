const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    const token = authHeader.substring(7); // 'Bearer ' 제거
    
    // JWT 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // 사용자 정보를 req.user에 추가
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      isAdmin: decoded.isAdmin || false
    };
    
    next();
  } catch (error) {
    console.error('JWT 인증 오류:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '토큰이 만료되었습니다. 다시 로그인해주세요.' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
    
    return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
  }
};

module.exports = authMiddleware; 