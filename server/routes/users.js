const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');

// JWT 토큰에서 사용자 ID 추출하는 미들웨어
const extractUserIdFromToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('토큰 검증 오류:', error);
    return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
  }
};

// 현재 로그인된 사용자 정보 조회
router.get('/me', extractUserIdFromToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    const [rows] = await pool.execute(`
      SELECT id, username, contact_person, phone, email, company_name, is_admin, partner_name, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `, [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    
    res.json({ 
      success: true, 
      ...rows[0]
    });
  } catch (error) {
    console.error('현재 사용자 정보 조회 오류:', error);
    res.status(500).json({ success: false, message: '사용자 정보 조회 중 오류가 발생했습니다.' });
  }
});

// 모든 사용자 조회 (비밀번호 제외)
router.get('/', async (req, res) => {
  try {
    const { partner } = req.query;
    
    let sql = `
      SELECT id, username, contact_person, phone, email, company_name, is_admin, partner_name, created_at, updated_at 
      FROM users 
    `;
    
    let params = [];
    
    // 특정 파트너스로 필터링
    if (partner) {
      sql += ` WHERE partner_name = ?`;
      params.push(partner);
    }
    
    sql += ` ORDER BY created_at DESC`;
    
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, users: rows });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({ success: false, message: '사용자 조회 중 오류가 발생했습니다.' });
  }
});

// 특정 사용자 조회 (비밀번호 제외)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(`
      SELECT id, username, contact_person, phone, email, company_name, is_admin, partner_name, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    
    res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({ success: false, message: '사용자 조회 중 오류가 발생했습니다.' });
  }
});

// 새 사용자 생성 (관리자 전용)
router.post('/', async (req, res) => {
  try {
    const { username, contact_person, phone, email, company_name, is_admin, partner_name } = req.body;
    
    // 필수 필드 검증
    if (!username || !contact_person || !phone || !email) {
      return res.status(400).json({ 
        success: false, 
        message: '사용자명, 담당자, 연락처, 이메일은 필수입니다.' 
      });
    }
    
    // 중복 사용자명 검사
    const [existingUsername] = await pool.execute('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existingUsername.length > 0) {
      return res.status(400).json({ success: false, message: '이미 존재하는 사용자명입니다.' });
    }
    
    // 중복 이메일 검사
    const [existingEmail] = await pool.execute('SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ success: false, message: '이미 존재하는 이메일입니다.' });
    }
    
    // 임시 비밀번호 생성 (사용자가 나중에 변경할 수 있도록)
    const tempPassword = 'temp123!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const [result] = await pool.execute(`
      INSERT INTO users (username, password, contact_person, phone, email, company_name, is_admin, partner_name) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      username.trim(), 
      hashedPassword, 
      contact_person.trim(), 
      phone.trim(), 
      email.trim(), 
      company_name || null, 
      is_admin || false, 
      partner_name || null
    ]);
    
    const [newUser] = await pool.execute(`
      SELECT id, username, contact_person, phone, email, company_name, is_admin, partner_name, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `, [result.insertId]);
    
    res.status(201).json({ 
      success: true, 
      message: '사용자가 성공적으로 생성되었습니다. 임시 비밀번호: temp123!',
      user: newUser[0]
    });
  } catch (error) {
    console.error('사용자 생성 오류:', error);
    res.status(500).json({ success: false, message: '사용자 생성 중 오류가 발생했습니다.' });
  }
});

// 사용자 정보 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, contact_person, phone, email, company_name, is_admin, partner_name } = req.body;
    
    // 필수 필드 검증
    if (!username || !contact_person || !phone || !email) {
      return res.status(400).json({ 
        success: false, 
        message: '사용자명, 담당자, 연락처, 이메일은 필수입니다.' 
      });
    }
    
    // 사용자 존재 여부 확인
    const [existingUser] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 중복 사용자명 검사 (자신 제외)
    const [duplicateUsername] = await pool.execute('SELECT id FROM users WHERE username = ? AND id != ?', [username.trim(), id]);
    if (duplicateUsername.length > 0) {
      return res.status(400).json({ success: false, message: '이미 존재하는 사용자명입니다.' });
    }
    
    // 중복 이메일 검사 (자신 제외)
    const [duplicateEmail] = await pool.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email.trim(), id]);
    if (duplicateEmail.length > 0) {
      return res.status(400).json({ success: false, message: '이미 존재하는 이메일입니다.' });
    }
    
    await pool.execute(`
      UPDATE users 
      SET username = ?, contact_person = ?, phone = ?, email = ?, company_name = ?, is_admin = ?, partner_name = ? 
      WHERE id = ?
    `, [
      username.trim(), 
      contact_person.trim(), 
      phone.trim(), 
      email.trim(), 
      company_name || null, 
      is_admin || false, 
      partner_name || null, 
      id
    ]);
    
    const [updatedUser] = await pool.execute(`
      SELECT id, username, contact_person, phone, email, company_name, is_admin, partner_name, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `, [id]);
    
    res.json({ 
      success: true, 
      message: '사용자 정보가 성공적으로 수정되었습니다.',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('사용자 수정 오류:', error);
    res.status(500).json({ success: false, message: '사용자 수정 중 오류가 발생했습니다.' });
  }
});

// 사용자 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 사용자 존재 여부 확인
    const [existingUser] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ success: true, message: '사용자가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    res.status(500).json({ success: false, message: '사용자 삭제 중 오류가 발생했습니다.' });
  }
});

// 사용자 권한 변경
router.patch('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_admin } = req.body;
    
    // 사용자 존재 여부 확인
    const [existingUser] = await pool.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    
    await pool.execute('UPDATE users SET is_admin = ? WHERE id = ?', [is_admin, id]);
    
    const [updatedUser] = await pool.execute(`
      SELECT id, username, contact_person, phone, email, company_name, is_admin, partner_name, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `, [id]);
    
    res.json({ 
      success: true, 
      message: `사용자 권한이 ${is_admin ? '관리자' : '일반 사용자'}로 변경되었습니다.`,
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('권한 변경 오류:', error);
    res.status(500).json({ success: false, message: '권한 변경 중 오류가 발생했습니다.' });
  }
});

module.exports = router; 