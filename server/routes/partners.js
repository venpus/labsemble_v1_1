const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 파트너스 테이블 생성 함수
const createPartnersTable = async () => {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS partners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await pool.execute(createTableSQL);

  } catch (error) {
    console.error('Partners 테이블 생성 중 오류:', error);
  }
};

// 서버 시작 시 테이블 생성
createPartnersTable();

// 모든 파트너스 조회
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM partners ORDER BY created_at DESC');
    res.json({ success: true, partners: rows });
  } catch (error) {
    console.error('파트너스 조회 오류:', error);
    res.status(500).json({ success: false, message: '파트너스 조회 중 오류가 발생했습니다.' });
  }
});

// 특정 파트너스 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM partners WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '파트너스를 찾을 수 없습니다.' });
    }
    
    res.json({ success: true, partner: rows[0] });
  } catch (error) {
    console.error('파트너스 조회 오류:', error);
    res.status(500).json({ success: false, message: '파트너스 조회 중 오류가 발생했습니다.' });
  }
});

// 새 파트너스 생성
router.post('/', async (req, res) => {
  try {
    const { name, description, status } = req.body;
    
    // 필수 필드 검증
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: '파트너스명은 필수입니다.' });
    }
    
    // 중복 이름 검사
    const [existingRows] = await pool.execute('SELECT id FROM partners WHERE name = ?', [name.trim()]);
    if (existingRows.length > 0) {
      return res.status(400).json({ success: false, message: '이미 존재하는 파트너스명입니다.' });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO partners (name, description, status) VALUES (?, ?, ?)',
      [name.trim(), description || '', status || 'active']
    );
    
    const [newPartner] = await pool.execute('SELECT * FROM partners WHERE id = ?', [result.insertId]);
    
    res.status(201).json({ 
      success: true, 
      message: '파트너스가 성공적으로 생성되었습니다.',
      partner: newPartner[0]
    });
  } catch (error) {
    console.error('파트너스 생성 오류:', error);
    res.status(500).json({ success: false, message: '파트너스 생성 중 오류가 발생했습니다.' });
  }
});

// 파트너스 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    
    // 필수 필드 검증
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: '파트너스명은 필수입니다.' });
    }
    
    // 파트너스 존재 여부 확인
    const [existingRows] = await pool.execute('SELECT id FROM partners WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: '파트너스를 찾을 수 없습니다.' });
    }
    
    // 중복 이름 검사 (자신 제외)
    const [duplicateRows] = await pool.execute('SELECT id FROM partners WHERE name = ? AND id != ?', [name.trim(), id]);
    if (duplicateRows.length > 0) {
      return res.status(400).json({ success: false, message: '이미 존재하는 파트너스명입니다.' });
    }
    
    await pool.execute(
      'UPDATE partners SET name = ?, description = ?, status = ? WHERE id = ?',
      [name.trim(), description || '', status || 'active', id]
    );
    
    const [updatedPartner] = await pool.execute('SELECT * FROM partners WHERE id = ?', [id]);
    
    res.json({ 
      success: true, 
      message: '파트너스가 성공적으로 수정되었습니다.',
      partner: updatedPartner[0]
    });
  } catch (error) {
    console.error('파트너스 수정 오류:', error);
    res.status(500).json({ success: false, message: '파트너스 수정 중 오류가 발생했습니다.' });
  }
});

// 파트너스 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 파트너스 존재 여부 확인
    const [existingRows] = await pool.execute('SELECT id FROM partners WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: '파트너스를 찾을 수 없습니다.' });
    }
    
    await pool.execute('DELETE FROM partners WHERE id = ?', [id]);
    
    res.json({ success: true, message: '파트너스가 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('파트너스 삭제 오류:', error);
    res.status(500).json({ success: false, message: '파트너스 삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router; 