const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, companyName, contactPerson, phone, partnerName } = req.body;

    // 필수 필드 검증
    if (!username || !email || !password || !contactPerson || !phone) {
      return res.status(400).json({ error: '필수 필드를 모두 입력해주세요.' });
    }

    // 사용자명 중복 확인
    const [existingUsername] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsername.length > 0) {
      return res.status(400).json({ error: '이미 사용 중인 사용자명입니다.' });
    }

    // 이메일 중복 확인
    const [existingEmail] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 사용자 생성
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password, company_name, contact_person, phone, is_admin, partner_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, companyName, contactPerson, phone, false, partnerName || null]
    );

    const userId = result.insertId;

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId, email, username, isAdmin: false },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: '회원가입이 완료되었습니다!',
      token,
              user: {
          id: userId,
          username,
          email,
          companyName,
          contactPerson,
          isAdmin: false,
          partnerName: partnerName || null
        }
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    // 로그인 시도
    
    const { username, password } = req.body;

    // 필수 필드 검증
    if (!username || !password) {
      // 필수 필드 누락
      return res.status(400).json({ error: '사용자명과 비밀번호를 입력해주세요.' });
    }

    // JWT_SECRET 확인
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ [auth] JWT_SECRET 환경변수가 설정되지 않음');
      return res.status(500).json({ 
        error: '서버 설정 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? 'JWT_SECRET 환경변수가 설정되지 않음' : '내부 서버 오류'
      });
    }

    // 데이터베이스 연결 확인
    if (!pool) {
      console.error('❌ [auth] 데이터베이스 풀이 초기화되지 않음');
      return res.status(500).json({ 
        error: '데이터베이스 연결 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? '데이터베이스 풀이 초기화되지 않음' : '내부 서버 오류'
      });
    }

    // 사용자 검색
    
    // 사용자 찾기
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      // 사용자를 찾을 수 없음
      return res.status(400).json({ error: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
    }

    const user = users[0];
    // 사용자 찾음

    // 비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // 비밀번호 불일치
      return res.status(400).json({ error: '사용자명 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 비밀번호 확인 완료

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, isAdmin: user.is_admin },
      jwtSecret,
      { expiresIn: '24h' }
    );

    console.log('✅ [auth] JWT 토큰 생성 완료:', { userId: user.id, username: user.username });

    res.json({
      message: '로그인이 완료되었습니다!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        companyName: user.company_name,
        contactPerson: user.contact_person,
        isAdmin: user.is_admin,
        partnerName: user.partner_name
      }
    });
    
    console.log('✅ [auth] 로그인 성공:', { userId: user.id, username: user.username });
    
  } catch (error) {
    console.error('❌ [auth] 로그인 오류:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    
    // 데이터베이스 연결 오류인지 확인
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return res.status(500).json({ 
        error: '데이터베이스 연결에 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.message : '데이터베이스 연결 오류'
      });
    }
    
    // SQL 오류인지 확인
    if (error.code && error.sqlState) {
      return res.status(500).json({ 
        error: '데이터베이스 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? `${error.code}: ${error.sqlMessage}` : '내부 서버 오류'
      });
    }
    
    res.status(500).json({ 
      error: '서버 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : '내부 서버 오류'
      });
  }
});

// Admin 사용자 생성 API (관리자 전용)
router.post('/admin/register', async (req, res) => {
  try {
    const { username, email, password, companyName, contactPerson, phone, partnerName, isAdmin } = req.body;

    // 필수 필드 검증
    if (!username || !email || !password || !contactPerson || !phone) {
      return res.status(400).json({ error: '필수 필드를 모두 입력해주세요.' });
    }

    // 사용자명 중복 확인
    const [existingUsername] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsername.length > 0) {
      return res.status(400).json({ error: '이미 사용 중인 사용자명입니다.' });
    }

    // 이메일 중복 확인
    const [existingEmail] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 사용자 생성 (admin 권한 포함)
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password, company_name, contact_person, phone, is_admin, partner_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [username, email, hashedPassword, companyName, contactPerson, phone, isAdmin || false, partnerName || null]
    );

    const userId = result.insertId;

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId, email, username, isAdmin: isAdmin || false },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: '관리자 사용자 생성이 완료되었습니다!',
      token,
              user: {
          id: userId,
          username,
          email,
          companyName,
          contactPerson,
          isAdmin: isAdmin || false,
          partnerName: partnerName || null
        }
    });
  } catch (error) {
    console.error('관리자 사용자 생성 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router; 