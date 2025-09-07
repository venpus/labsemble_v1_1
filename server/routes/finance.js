const express = require('express');
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { getCurrentKSTString } = require('../utils/timezone');
const { devLog, errorLog } = require('../utils/logger');

const router = express.Router();

// 입금 내역 등록
router.post('/incoming', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { transaction_date, currency, exchange_rate, amount, notes } = req.body;
    const userId = req.user.userId;
    
    // 필수 필드 검증
    if (!transaction_date || !currency || !exchange_rate || !amount) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다.'
      });
    }
    
    // 금액 유효성 검증
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: '금액은 0보다 커야 합니다.'
      });
    }
    
    // 환율 유효성 검증
    if (parseFloat(exchange_rate) <= 0) {
      return res.status(400).json({
        success: false,
        message: '환율은 0보다 커야 합니다.'
      });
    }
    
    // 각 화폐 단위별 금액 계산
    let amountKRW = 0, amountUSD = 0, amountCNY = 0;
    
    if (currency === 'KRW') {
      amountKRW = amount;
      amountUSD = amount / 1350;
      amountCNY = amount / 193;
    } else if (currency === 'USD') {
      amountKRW = amount * exchange_rate;
      amountUSD = amount;
      amountCNY = (amount * exchange_rate) / 193;
    } else if (currency === 'CNY') {
      amountKRW = amount * exchange_rate;
      amountUSD = (amount * exchange_rate) / 1350;
      amountCNY = amount;
    }
    
    // 입금 내역 저장 (모든 화폐 단위별 금액 포함)
    const [result] = await connection.execute(
      `INSERT INTO finance_incoming 
       (user_id, transaction_date, currency, exchange_rate, amount, amount_krw, amount_usd, amount_cny, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, transaction_date, currency, exchange_rate, amount, amountKRW, amountUSD, amountCNY, notes]
    );
    
    await connection.commit();
    
    devLog(`[Finance] 입금 내역 등록 성공 - User: ${userId}, Amount: ${amount} ${currency}`);
    
    res.json({
      success: true,
      message: '입금 내역이 성공적으로 등록되었습니다.',
      data: {
        id: result.insertId,
        transaction_date,
        currency,
        exchange_rate,
        amount,
        notes
      }
    });
    
  } catch (error) {
    await connection.rollback();
    errorLog(`[Finance] 입금 내역 등록 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '입금 내역 등록 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 입금 내역 조회 (사용자별)
router.get('/incoming', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, start_date, end_date, currency } = req.query;
    
    // 페이지네이션 계산
    const offset = (page - 1) * limit;
    
    // WHERE 조건 구성
    let whereClause = 'WHERE user_id = ?';
    let params = [userId];
    
    if (start_date) {
      whereClause += ' AND transaction_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND transaction_date <= ?';
      params.push(end_date);
    }
    
    if (currency && currency !== 'ALL') {
      whereClause += ' AND currency = ?';
      params.push(currency);
    }
    
    // 전체 개수 조회
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM finance_incoming ${whereClause}`,
      params
    );
    
    const total = countResult[0].total;
    
    // 입금 내역 조회 (모든 화폐 단위별 금액 포함)
    const [rows] = await connection.execute(
      `SELECT id, transaction_date, currency, exchange_rate, amount, amount_krw, amount_usd, amount_cny, notes, created_at
       FROM finance_incoming 
       ${whereClause}
       ORDER BY transaction_date DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    
    // 통화별 합계 계산 (모든 화폐 단위별 금액 포함)
    const [summaryResult] = await connection.execute(
      `SELECT 
         'KRW' as currency,
         SUM(amount_krw) as total_amount,
         COUNT(*) as transaction_count
       FROM finance_incoming 
       ${whereClause}
       UNION ALL
       SELECT 
         'USD' as currency,
         SUM(amount_usd) as total_amount,
         COUNT(*) as transaction_count
       FROM finance_incoming 
       ${whereClause}
       UNION ALL
       SELECT 
         'CNY' as currency,
         SUM(amount_cny) as total_amount,
         COUNT(*) as transaction_count
       FROM finance_incoming 
       ${whereClause}`,
      [...params, ...params, ...params]
    );

    // 요약 통계를 클라이언트에서 사용하기 쉽게 변환
    const summary = {
      totalAmountKRW: 0,
      totalAmountUSD: 0,
      totalAmountCNY: 0
    };

    summaryResult.forEach(item => {
      if (item.currency === 'KRW') summary.totalAmountKRW = item.total_amount || 0;
      if (item.currency === 'USD') summary.totalAmountUSD = item.total_amount || 0;
      if (item.currency === 'CNY') summary.totalAmountCNY = item.total_amount || 0;
    });
    
    res.json({
      success: true,
      data: {
        transactions: rows,
        summary: summary,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    errorLog(`[Finance] 입금 내역 조회 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '입금 내역 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 입금 내역 상세 조회
router.get('/incoming/:id', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const [rows] = await connection.execute(
      `SELECT id, transaction_date, currency, exchange_rate, amount, amount_krw, amount_usd, amount_cny, notes, created_at, updated_at
       FROM finance_incoming 
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '입금 내역을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    errorLog(`[Finance] 입금 내역 상세 조회 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '입금 내역 상세 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 입금 내역 수정
router.put('/incoming/:id', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { transaction_date, currency, exchange_rate, amount, notes } = req.body;
    const userId = req.user.userId;
    
    // 필수 필드 검증
    if (!transaction_date || !currency || !exchange_rate || !amount) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다.'
      });
    }
    
    // 기존 데이터 확인
    const [existingRows] = await connection.execute(
      'SELECT id FROM finance_incoming WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '수정할 입금 내역을 찾을 수 없습니다.'
      });
    }
    
    // 각 화폐 단위별 금액 계산
    let amountKRW = 0, amountUSD = 0, amountCNY = 0;
    
    if (currency === 'KRW') {
      amountKRW = amount;
      amountUSD = amount / 1350;
      amountCNY = amount / 193;
    } else if (currency === 'USD') {
      amountKRW = amount * exchange_rate;
      amountUSD = amount;
      amountCNY = (amount * exchange_rate) / 193;
    } else if (currency === 'CNY') {
      amountKRW = amount * exchange_rate;
      amountUSD = (amount * exchange_rate) / 1350;
      amountCNY = amount;
    }
    
    // 입금 내역 수정 (모든 화폐 단위별 금액 포함)
    await connection.execute(
      `UPDATE finance_incoming 
       SET transaction_date = ?, currency = ?, exchange_rate = ?, amount = ?, amount_krw = ?, amount_usd = ?, amount_cny = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
      [transaction_date, currency, exchange_rate, amount, amountKRW, amountUSD, amountCNY, notes, id, userId]
    );
    
    await connection.commit();
    
    devLog(`[Finance] 입금 내역 수정 성공 - ID: ${id}, User: ${userId}`);
    
    res.json({
      success: true,
      message: '입금 내역이 성공적으로 수정되었습니다.'
    });
    
  } catch (error) {
    await connection.rollback();
    errorLog(`[Finance] 입금 내역 수정 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '입금 내역 수정 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 입금 내역 삭제
router.delete('/incoming/:id', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const userId = req.user.userId;
    
    // 기존 데이터 확인
    const [existingRows] = await connection.execute(
      'SELECT id FROM finance_incoming WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '삭제할 입금 내역을 찾을 수 없습니다.'
      });
    }
    
    // 입금 내역 삭제
    await connection.execute(
      'DELETE FROM finance_incoming WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    await connection.commit();
    
    devLog(`[Finance] 입금 내역 삭제 성공 - ID: ${id}, User: ${userId}`);
    
    res.json({
      success: true,
      message: '입금 내역이 성공적으로 삭제되었습니다.'
    });
    
  } catch (error) {
    await connection.rollback();
    errorLog(`[Finance] 입금 내역 삭제 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '입금 내역 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 지출 내역 등록
router.post('/expense', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { transaction_date, category, currency, exchange_rate, amount, notes } = req.body;
    const userId = req.user.userId;
    
    // 필수 필드 검증
    if (!transaction_date || !category || !currency || !amount) {
      return res.status(400).json({
        success: false,
        message: '필수 필드를 모두 입력해주세요.'
      });
    }
    
    // 각 화폐 단위별 금액 계산
    let amountKRW = 0, amountUSD = 0, amountCNY = 0;
    
    if (currency === 'KRW') {
      amountKRW = amount;
      amountUSD = amount / 1350;
      amountCNY = amount / 193;
    } else if (currency === 'USD') {
      amountKRW = amount * exchange_rate;
      amountUSD = amount;
      amountCNY = (amount * exchange_rate) / 193;
    } else if (currency === 'CNY') {
      amountKRW = amount * exchange_rate;
      amountUSD = (amount * exchange_rate) / 1350;
      amountCNY = amount;
    }
    
    // 지출 내역 저장 (모든 화폐 단위별 금액 포함)
    const [result] = await connection.execute(
      `INSERT INTO finance_expense 
       (user_id, transaction_date, category, currency, exchange_rate, amount, amount_krw, amount_usd, amount_cny, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, transaction_date, category, currency, exchange_rate || 1, amount, amountKRW, amountUSD, amountCNY, notes]
    );
    
    await connection.commit();
    
    devLog(`[Finance] 지출 내역 등록 성공 - User: ${userId}, Amount: ${amount} ${currency}`);
    
    res.json({
      success: true,
      message: '지출 내역이 성공적으로 등록되었습니다.',
      data: {
        id: result.insertId,
        transaction_date,
        category,
        currency,
        exchange_rate: exchange_rate || 1,
        amount,
        notes
      }
    });
    
  } catch (error) {
    await connection.rollback();
    errorLog(`[Finance] 지출 내역 등록 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '지출 내역 등록 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 지출 내역 조회
router.get('/expense', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, start_date, end_date, category } = req.query;
    
    // 페이지네이션 계산
    const offset = (page - 1) * limit;
    
    // WHERE 조건 구성
    let whereClause = 'WHERE user_id = ?';
    let params = [userId];
    
    if (start_date) {
      whereClause += ' AND transaction_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND transaction_date <= ?';
      params.push(end_date);
    }
    
    if (category && category !== 'ALL') {
      whereClause += ' AND category = ?';
      params.push(category);
    }
    
    // 전체 개수 조회
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as total FROM finance_expense ${whereClause}`,
      params
    );
    
    const total = countResult[0].total;
    
    // 지출 내역 조회 (모든 화폐 단위별 금액 포함)
    const [rows] = await connection.execute(
      `SELECT id, transaction_date, category, currency, exchange_rate, amount, amount_krw, amount_usd, amount_cny, notes, created_at
       FROM finance_expense 
       ${whereClause}
       ORDER BY transaction_date DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    
    // 통화별 합계 계산
    const [summaryResult] = await connection.execute(
      `SELECT 
         'KRW' as currency,
         SUM(amount_krw) as total_amount,
         COUNT(*) as transaction_count
       FROM finance_expense 
       ${whereClause}
       UNION ALL
       SELECT 
         'USD' as currency,
         SUM(amount_usd) as total_amount,
         COUNT(*) as transaction_count
       FROM finance_expense 
       ${whereClause}
       UNION ALL
       SELECT 
         'CNY' as currency,
         SUM(amount_cny) as total_amount,
         COUNT(*) as transaction_count
       FROM finance_expense 
       ${whereClause}`,
      [...params, ...params, ...params]
    );
    
    // 요약 통계를 클라이언트에서 사용하기 쉽게 변환
    const summary = {
      totalAmountKRW: 0,
      totalAmountUSD: 0,
      totalAmountCNY: 0
    };

    summaryResult.forEach(item => {
      if (item.currency === 'KRW') summary.totalAmountKRW = item.total_amount || 0;
      if (item.currency === 'USD') summary.totalAmountUSD = item.total_amount || 0;
      if (item.currency === 'CNY') summary.totalAmountCNY = item.total_amount || 0;
    });
    
    res.json({
      success: true,
      data: {
        transactions: rows,
        summary: summary,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    errorLog(`[Finance] 지출 내역 조회 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '지출 내역 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// mj_project에서 선금 정보 조회
router.get('/advance-payment', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // 모든 프로젝트의 advance_payment 총합 조회
    const [rows] = await connection.execute(`
      SELECT 
        SUM(CAST(advance_payment AS DECIMAL(15,2))) as total_advance_payment,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    
    const totalAdvancePayment = rows[0]?.total_advance_payment ?? 0;
    const projectCount = rows[0]?.project_count ?? 0;
    
    const responseData = {
      totalAdvancePayment: Number(totalAdvancePayment ?? 0),
      projectCount: projectCount ?? 0
    };
    
    devLog(`[Finance] 선금 정보 조회 성공 - User: ${userId}, Total: ${totalAdvancePayment} CNY, Projects: ${projectCount}`);
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    errorLog(`[Finance] 선금 정보 조회 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '선금 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// mj_project에서 총 거래금액(total_amount) 정보 조회
router.get('/total-amount', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // 전체 시스템의 모든 프로젝트 total_amount 합계 조회
    const [rows] = await connection.execute(`
      SELECT 
        SUM(CAST(total_amount AS DECIMAL(15,2))) as total_transaction_amount,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE total_amount IS NOT NULL
        AND total_amount != ''
        AND total_amount > 0
    `);
    
    const totalTransactionAmount = rows[0]?.total_transaction_amount ?? 0;
    const projectCount = rows[0]?.project_count ?? 0;
    
    const responseData = {
      totalTransactionAmount: Number(totalTransactionAmount ?? 0),
      projectCount: projectCount ?? 0
    };
    
    devLog(`[Finance] 총 거래금액 정보 조회 성공 - User: ${userId}, Total: ${totalTransactionAmount} CNY, Projects: ${projectCount}`);
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    errorLog(`[Finance] 총 거래금액 정보 조회 실패: ${error.message}`);
    res.status(500).json({ success: false, message: '총 거래금액 정보 조회 중 오류가 발생했습니다.', error: error.message });
  } finally {
    connection.release();
  }
});

// mj_project에서 총 balance_amount 정보 조회
router.get('/total-fee', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // 전체 시스템의 모든 프로젝트 balance_amount 합계 조회
    const [rows] = await connection.execute(`
      SELECT 
        SUM(CAST(balance_amount AS DECIMAL(15,2))) as total_fee_amount,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE balance_amount IS NOT NULL
        AND balance_amount != ''
        AND balance_amount > 0
    `);
    
    const totalFeeAmount = rows[0]?.total_fee_amount ?? 0;
    const projectCount = rows[0]?.project_count ?? 0;
    
    const responseData = {
      totalFeeAmount: Number(totalFeeAmount ?? 0),
      projectCount: projectCount ?? 0
    };
    
    devLog(`[Finance] 총 balance_amount 정보 조회 성공 - User: ${userId}, Total: ${totalFeeAmount} CNY, Projects: ${projectCount}`);
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    errorLog(`[Finance] 총 balance_amount 정보 조회 실패: ${error.message}`);
    res.status(500).json({ success: false, message: '총 balance_amount 정보 조회 중 오류가 발생했습니다.', error: error.message });
  } finally {
    connection.release();
  }
});

// mj_project에서 미지급 선금 정보 조회 (payment_status.advance = false인 프로젝트들의 advance_payment 합계)
router.get('/unpaid-advance', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // payment_status.advance = false인 프로젝트들의 advance_payment 합계 조회
    const [rows] = await connection.execute(`
      SELECT 
        SUM(CAST(advance_payment AS DECIMAL(15,2))) as total_unpaid_advance,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.advance') = false
        AND advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    
    const totalUnpaidAdvance = rows[0]?.total_unpaid_advance ?? 0;
    const projectCount = rows[0]?.project_count ?? 0;
    
    const responseData = {
      totalUnpaidAdvance: Number(totalUnpaidAdvance ?? 0),
      projectCount: projectCount ?? 0
    };
    
    devLog(`[Finance] 미지급 선금 정보 조회 성공 - User: ${userId}, Total: ${totalUnpaidAdvance} CNY, Projects: ${projectCount} (payment_status.advance = false)`);
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    errorLog(`[Finance] 미지급 선금 정보 조회 실패: ${error.message}`);
    res.status(500).json({ success: false, message: '미지급 선금 정보 조회 중 오류가 발생했습니다.', error: error.message });
  } finally {
    connection.release();
  }
});

// mj_project에서 미지급 잔금 정보 조회 (payment_status.balance = false인 프로젝트들의 balance_amount 합계)
router.get('/unpaid-balance', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // payment_status.balance = false인 프로젝트들의 balance_amount 합계 조회
    const [rows] = await connection.execute(`
      SELECT 
        SUM(CAST(balance_amount AS DECIMAL(15,2))) as total_unpaid_balance,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.balance') = false
        AND balance_amount IS NOT NULL
        AND balance_amount != ''
        AND balance_amount > 0
    `);
    
    const totalUnpaidBalance = rows[0]?.total_unpaid_balance ?? 0;
    const projectCount = rows[0]?.project_count ?? 0;
    
    const responseData = {
      totalUnpaidBalance: Number(totalUnpaidBalance ?? 0),
      projectCount: projectCount ?? 0
    };
    
    devLog(`[Finance] 미지급 잔금 정보 조회 성공 - User: ${userId}, Total: ${totalUnpaidBalance} CNY, Projects: ${projectCount} (payment_status.balance = false)`);
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    errorLog(`[Finance] 미지급 잔금 정보 조회 실패: ${error.message}`);
    res.status(500).json({ success: false, message: '미지급 잔금 정보 조회 중 오류가 발생했습니다.', error: error.message });
  } finally {
    connection.release();
  }
});

// mj_project에서 지급 예정 선금 정보 조회 (payment_status.advance = false인 프로젝트들의 advance_payment 합계)
router.get('/advance-payment-schedule', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // 지급 예정 선금 조회 (payment_status.advance = false)
    const [rows] = await connection.execute(`
      SELECT 
        SUM(CAST(advance_payment AS DECIMAL(15,2))) as total_advance_payment_schedule,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.advance') = false
        AND advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    
    const totalAdvancePaymentSchedule = rows[0]?.total_advance_payment_schedule ?? 0;
    const projectCount = rows[0]?.project_count ?? 0;
    
    const responseData = {
      totalAdvancePaymentSchedule: Number(totalAdvancePaymentSchedule ?? 0),
      projectCount: projectCount ?? 0
    };
    
    devLog(`[Finance] 지급 예정 선금 정보 조회 성공 - User: ${userId}, Total: ${totalAdvancePaymentSchedule} CNY, Projects: ${projectCount}`);
    
    res.json({
      success: true,
      message: '지급 예정 선금 정보를 성공적으로 조회했습니다.',
      data: responseData
    });
    
  } catch (error) {
    errorLog(`[Finance] 지급 예정 선금 정보 조회 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '지급 예정 선금 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// mj_project에서 잔금 지급 예정 정보 조회 (payment_status.balance = false이고 지급 예정일이 오늘 이전인 프로젝트들의 balance_amount 합계)
router.get('/balance-payment-schedule', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // 오늘 날짜를 YYYY-MM-DD 형식으로 가져오기
    const today = new Date().toISOString().split('T')[0];
    
    // 잔금 지급 예정 조회 (payment_status.balance = false이고 지급 예정일이 오늘 이전)
    const [rows] = await connection.execute(`
      SELECT 
        SUM(CAST(balance_amount AS DECIMAL(15,2))) as total_balance_payment_schedule,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.balance') = false
        AND balance_amount IS NOT NULL
        AND balance_amount != ''
        AND balance_amount > 0
        AND balance_due_date IS NOT NULL
        AND balance_due_date <= ?
    `, [today]);
    
    const totalBalancePaymentSchedule = rows[0]?.total_balance_payment_schedule ?? 0;
    const projectCount = rows[0]?.project_count ?? 0;
    
    const responseData = {
      totalBalancePaymentSchedule: Number(totalBalancePaymentSchedule ?? 0),
      projectCount: projectCount ?? 0,
      dueDateFilter: today
    };
    
    devLog(`[Finance] 잔금 지급 예정 정보 조회 성공 - User: ${userId}, Total: ${totalBalancePaymentSchedule} CNY, Projects: ${projectCount}, Due Date Filter: ${today}`);
    
    res.json({
      success: true,
      message: '잔금 지급 예정 정보를 성공적으로 조회했습니다.',
      data: responseData
    });
    
  } catch (error) {
    errorLog(`[Finance] 잔금 지급 예정 정보 조회 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '잔금 지급 예정 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 모바일 전용: 모든 미지급 항목을 한 번에 조회
router.get('/unpaid-summary', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // 1. 미지급 선금 조회 (payment_status.advance = false)
    const [unpaidAdvanceRows] = await connection.execute(`
      SELECT 
        SUM(CAST(advance_payment AS DECIMAL(15,2))) as total_unpaid_advance,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.advance') = false
        AND advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    
    // 2. 미지급 잔금 조회 (payment_status.balance = false)
    const [unpaidBalanceRows] = await connection.execute(`
      SELECT 
        SUM(CAST(balance_amount AS DECIMAL(15,2))) as total_unpaid_balance,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.balance') = false
        AND balance_amount IS NOT NULL
        AND balance_amount != ''
        AND balance_amount > 0
    `);
    
    // 3. 미지급 배송비 조회 (logistic_payment에서 is_paid = 0)
    const [unpaidShippingRows] = await connection.execute(`
      SELECT 
        SUM(CAST(logistic_fee AS DECIMAL(15,2))) as total_unpaid_shipping_cost,
        COUNT(*) as total_unpaid_records
      FROM logistic_payment 
      WHERE logistic_fee IS NOT NULL 
        AND logistic_fee > 0
        AND is_paid = 0
    `);
    
    const responseData = {
      totalUnpaidAdvance: Number(unpaidAdvanceRows[0]?.total_unpaid_advance ?? 0),
      totalUnpaidBalance: Number(unpaidBalanceRows[0]?.total_unpaid_balance ?? 0),
      totalUnpaidShippingCost: Number(unpaidShippingRows[0]?.total_unpaid_shipping_cost ?? 0),
      projectCount: {
        unpaidAdvance: unpaidAdvanceRows[0]?.project_count ?? 0,
        unpaidBalance: unpaidBalanceRows[0]?.project_count ?? 0
      },
      shippingCount: {
        unpaidRecords: unpaidShippingRows[0]?.total_unpaid_records ?? 0
      }
    };
    
    devLog(`[Finance] 미지급 요약 정보 조회 성공 - User: ${userId}, Advance: ${responseData.totalUnpaidAdvance} CNY, Balance: ${responseData.totalUnpaidBalance} CNY, Shipping: ${responseData.totalUnpaidShippingCost} CNY`);
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    errorLog(`[Finance] 미지급 요약 정보 조회 실패: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: '미지급 요약 정보 조회 중 오류가 발생했습니다.', 
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// 모바일 전용: 지급 예정 요약 정보 조회
router.get('/payment-schedule-summary', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // 1. 선금 지급 예정 조회 (payment_status.advance = false)
    const [advanceRows] = await connection.execute(`
      SELECT 
        SUM(CAST(advance_payment AS DECIMAL(15,2))) as total_advance_payment_schedule,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.advance') = false
        AND advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    
    // 2. 잔금 지급 예정 조회 (payment_status.balance = false)
    const [balanceRows] = await connection.execute(`
      SELECT 
        SUM(CAST(balance_amount AS DECIMAL(15,2))) as total_balance_payment_schedule,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.balance') = false
        AND balance_amount IS NOT NULL
        AND balance_amount != ''
        AND balance_amount > 0
    `);
    
    // 3. 배송비 지급 예정 조회 (logistic_payment에서 is_paid = 0)
    const [shippingRows] = await connection.execute(`
      SELECT 
        SUM(CAST(logistic_fee AS DECIMAL(15,2))) as total_shipping_payment_schedule,
        COUNT(*) as total_schedule_records
      FROM logistic_payment 
      WHERE logistic_fee IS NOT NULL 
        AND logistic_fee > 0
        AND is_paid = 0
    `);
    
    const advancePaymentSchedule = Number(advanceRows[0]?.total_advance_payment_schedule ?? 0);
    const balancePaymentSchedule = Number(balanceRows[0]?.total_balance_payment_schedule ?? 0);
    const shippingPaymentSchedule = Number(shippingRows[0]?.total_shipping_payment_schedule ?? 0);
    const totalPaymentSchedule = advancePaymentSchedule + balancePaymentSchedule + shippingPaymentSchedule;
    
    const responseData = {
      advancePaymentSchedule,
      balancePaymentSchedule,
      shippingPaymentSchedule,
      totalPaymentSchedule,
      projectCount: {
        advance: advanceRows[0]?.project_count ?? 0,
        balance: balanceRows[0]?.project_count ?? 0
      },
      shippingCount: {
        shipping: shippingRows[0]?.total_schedule_records ?? 0
      }
    };
    
    devLog(`[Finance] 지급 예정 요약 정보 조회 성공 - User: ${userId}, Advance: ${advancePaymentSchedule} CNY, Balance: ${balancePaymentSchedule} CNY, Shipping: ${shippingPaymentSchedule} CNY, Total: ${totalPaymentSchedule} CNY`);
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    errorLog(`[Finance] 지급 예정 요약 정보 조회 실패: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: '지급 예정 요약 정보 조회 중 오류가 발생했습니다.', 
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// 모바일 전용: 지급 예정 상세 정보 조회
router.get('/payment-schedule-details', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // 1. 선금 지급 예정 상세 조회
    const [advanceRows] = await connection.execute(`
      SELECT 
        p.id,
        p.project_name,
        p.advance_payment,
        p.actual_order_date,
        p.payment_status
      FROM mj_project p
      WHERE JSON_EXTRACT(p.payment_status, '$.advance') = false
        AND p.advance_payment IS NOT NULL
        AND p.advance_payment != ''
        AND p.advance_payment > 0
      ORDER BY p.actual_order_date DESC
    `);
    
    // 2. 잔금 지급 예정 상세 조회
    const [balanceRows] = await connection.execute(`
      SELECT 
        p.id,
        p.project_name,
        p.balance_amount,
        p.balance_due_date,
        p.payment_status
      FROM mj_project p
      WHERE JSON_EXTRACT(p.payment_status, '$.balance') = false
        AND p.balance_amount IS NOT NULL
        AND p.balance_amount != ''
        AND p.balance_amount > 0
      ORDER BY p.balance_due_date DESC
    `);
    
    // 3. 배송비 지급 예정 상세 조회
    const [shippingRows] = await connection.execute(`
      SELECT 
        lp.id,
        lp.packing_code,
        lp.pl_date,
        lp.logistic_fee,
        lp.description
      FROM logistic_payment lp
      WHERE lp.logistic_fee IS NOT NULL 
        AND lp.logistic_fee > 0
        AND lp.is_paid = 0
      ORDER BY lp.logistic_fee DESC
    `);
    
    const responseData = {
      advancePayments: advanceRows.map(row => ({
        id: row.id,
        projectName: row.project_name,
        amount: Number(row.advance_payment),
        orderDate: row.actual_order_date,
        paymentStatus: row.payment_status
      })),
      balancePayments: balanceRows.map(row => ({
        id: row.id,
        projectName: row.project_name,
        amount: Number(row.balance_amount),
        dueDate: row.balance_due_date,
        paymentStatus: row.payment_status
      })),
      shippingPayments: shippingRows.map(row => ({
        id: row.id,
        packingCode: row.packing_code,
        plDate: row.pl_date,
        amount: Number(row.logistic_fee),
        description: row.description
      }))
    };
    
    devLog(`[Finance] 지급 예정 상세 정보 조회 성공 - User: ${userId}, Advance: ${advanceRows.length}건, Balance: ${balanceRows.length}건, Shipping: ${shippingRows.length}건`);
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    errorLog(`[Finance] 지급 예정 상세 정보 조회 실패: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: '지급 예정 상세 정보 조회 중 오류가 발생했습니다.', 
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// 모바일 전용: 날짜별 지급 예정 정보 조회
router.get('/payment-schedule-by-date', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // 1. 선금 지급 예정을 날짜별로 그룹화
    const [advanceRows] = await connection.execute(`
      SELECT 
        p.actual_order_date as payment_date,
        COUNT(*) as count,
        SUM(CAST(p.advance_payment AS DECIMAL(15,2))) as total_amount
      FROM mj_project p
      WHERE JSON_EXTRACT(p.payment_status, '$.advance') = false
        AND p.advance_payment IS NOT NULL
        AND p.advance_payment != ''
        AND p.advance_payment > 0
        AND p.actual_order_date IS NOT NULL
      GROUP BY p.actual_order_date
      ORDER BY p.actual_order_date DESC
    `);
    
    // 2. 잔금 지급 예정을 날짜별로 그룹화
    const [balanceRows] = await connection.execute(`
      SELECT 
        p.balance_due_date as payment_date,
        COUNT(*) as count,
        SUM(CAST(p.balance_amount AS DECIMAL(15,2))) as total_amount
      FROM mj_project p
      WHERE JSON_EXTRACT(p.payment_status, '$.balance') = false
        AND p.balance_amount IS NOT NULL
        AND p.balance_amount != ''
        AND p.balance_amount > 0
        AND p.balance_due_date IS NOT NULL
      GROUP BY p.balance_due_date
      ORDER BY p.balance_due_date DESC
    `);
    
    // 3. 배송비 지급 예정을 날짜별로 그룹화
    const [shippingRows] = await connection.execute(`
      SELECT 
        lp.pl_date as payment_date,
        COUNT(*) as count,
        SUM(CAST(lp.logistic_fee AS DECIMAL(15,2))) as total_amount
      FROM logistic_payment lp
      WHERE lp.logistic_fee IS NOT NULL 
        AND lp.logistic_fee > 0
        AND lp.is_paid = 0
        AND lp.pl_date IS NOT NULL
      GROUP BY lp.pl_date
      ORDER BY lp.pl_date DESC
    `);
    
    const responseData = {
      advancePaymentsByDate: advanceRows.map(row => ({
        paymentDate: row.payment_date,
        count: row.count,
        totalAmount: Number(row.total_amount)
      })),
      balancePaymentsByDate: balanceRows.map(row => ({
        paymentDate: row.payment_date,
        count: row.count,
        totalAmount: Number(row.total_amount)
      })),
      shippingPaymentsByDate: shippingRows.map(row => ({
        paymentDate: row.payment_date,
        count: row.count,
        totalAmount: Number(row.total_amount)
      }))
    };
    
    devLog(`[Finance] 날짜별 지급 예정 정보 조회 성공 - User: ${userId}, Advance: ${advanceRows.length}일, Balance: ${balanceRows.length}일, Shipping: ${shippingRows.length}일`);
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    errorLog(`[Finance] 날짜별 지급 예정 정보 조회 실패: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: '날짜별 지급 예정 정보 조회 중 오류가 발생했습니다.', 
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// mj_project에서 Payment 지급일 데이터를 Finance 장부 형식으로 조회
router.get('/payment-schedule', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // mj_project_payments에서 결제 완료된 데이터 조회
    const [rows] = await connection.execute(`
      SELECT 
        mpp.project_id,
        mp.project_name,
        mpp.payment_status,
        mpp.payment_dates,
        mpp.payment_amounts
      FROM mj_project_payments mpp
      JOIN mj_project mp ON mpp.project_id = mp.id
      WHERE mpp.payment_status IS NOT NULL
        AND mpp.payment_dates IS NOT NULL
        AND mpp.payment_amounts IS NOT NULL
        AND JSON_VALID(mpp.payment_status) = 1
        AND JSON_VALID(mpp.payment_dates) = 1
        AND JSON_VALID(mpp.payment_amounts) = 1
      ORDER BY mpp.project_id DESC
    `);
    
    // mj_project에서 payment_status.balance가 true인 데이터도 추가 조회
    const [mjProjectRows] = await connection.execute(`
      SELECT 
        id as project_id,
        project_name,
        payment_dates,
        balance_amount,
        payment_status
      FROM mj_project 
      WHERE payment_dates IS NOT NULL
        AND payment_dates != '{}'
        AND payment_dates != '[]'
        AND JSON_VALID(payment_dates) = 1
        AND JSON_VALID(payment_status) = 1
        AND JSON_EXTRACT(payment_status, '$.balance') = true
        AND balance_amount IS NOT NULL
        AND balance_amount > 0
      ORDER BY id DESC
    `);
    
    // Payment 지급일 데이터를 Finance 장부 형식으로 변환
    const paymentTransactions = [];
    
    rows.forEach(row => {
      try {
        const paymentStatus = JSON.parse(row.payment_status);
        const paymentDates = JSON.parse(row.payment_dates);
        const paymentAmounts = JSON.parse(row.payment_amounts);
        
        // 각 결제 유형별로 확인 (advance, interim1, interim2, interim3, balance)
        const paymentTypes = ['advance', 'interim1', 'interim2', 'interim3', 'balance'];
        
        paymentTypes.forEach(paymentType => {
          // payment_status가 true이고, payment_date가 있고, amount가 0보다 큰 경우만 표시
          if (paymentStatus[paymentType] === true && 
              paymentDates[paymentType] && 
              paymentAmounts[paymentType] > 0) {
            
            // 결제 유형별 카테고리 설정 (업체 결제 형식)
            let category = '';
            switch (paymentType) {
              case 'advance':
                category = '업체 선금';
                break;
              case 'interim1':
                category = '업체 중도금1';
                break;
              case 'interim2':
                category = '업체 중도금2';
                break;
              case 'interim3':
                category = '업체 중도금3';
                break;
              case 'balance':
                category = '업체 잔금';
                break;
            }
            
            paymentTransactions.push({
              id: `mj-${paymentType}-${row.project_id}`,
              date: paymentDates[paymentType],
              description: `${row.project_name} - ${category}`,
              category: category,
              amount: -Number(paymentAmounts[paymentType]), // 지출이므로 음수
              type: 'expense',
              reference: `MJ-${row.project_id}`,
              notes: '', // 비고 내용 비워둠
              project_id: row.project_id,
              project_name: row.project_name,
              payment_type: paymentType,
              is_paid: true
            });
          }
        });
        
      } catch (error) {
        console.error(`[Finance] 프로젝트 ${row.project_id} JSON 파싱 오류:`, error);
      }
    });
    
    // mj_project 테이블의 balance 결제 완료 데이터 처리
    mjProjectRows.forEach(project => {
      try {
        const paymentDates = JSON.parse(project.payment_dates);
        const paymentStatus = JSON.parse(project.payment_status || '{}');
        
        // 잔금 지급일이 있고 payment_status.balance가 true인 경우만 표시
        if (paymentDates.balance && project.balance_amount > 0 && paymentStatus.balance === true) {
          paymentTransactions.push({
            id: `mj-balance-legacy-${project.project_id}`,
            date: paymentDates.balance,
            description: `${project.project_name} - 잔금 지급`,
            category: '잔금 지급',
            amount: -Number(project.balance_amount), // 지출이므로 음수
            type: 'expense',
            reference: `MJ-${project.project_id}`,
            notes: '', // 비고 내용 비워둠
            project_id: project.project_id,
            project_name: project.project_name,
            payment_type: 'balance',
            is_paid: true // payment_status.balance가 true이므로 지급 완료
          });
        }
        
      } catch (error) {
        console.error(`[Finance] 프로젝트 ${project.project_id} JSON 파싱 오류:`, error);
      }
    });
    
    // 날짜순으로 정렬
    paymentTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const responseData = {
      transactions: paymentTransactions,
      total_count: paymentTransactions.length,
      advance_count: paymentTransactions.filter(t => t.payment_type === 'advance').length,
      balance_count: paymentTransactions.filter(t => t.payment_type === 'balance').length,
      paid_count: paymentTransactions.filter(t => t.is_paid).length,
      unpaid_count: paymentTransactions.filter(t => !t.is_paid).length
    };
    
    devLog(`[Finance] 결제 데이터 조회 성공 - User: ${userId}, mj_project_payments: ${rows.length}, mj_project: ${mjProjectRows.length}, Total Transactions: ${paymentTransactions.length}`);
    
    res.json({
      success: true,
      message: 'Payment 지급일 데이터를 성공적으로 조회했습니다.',
      data: responseData
    });
    
  } catch (error) {
    errorLog(`[Finance] Payment 지급일 데이터 조회 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Payment 지급일 데이터 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 선금 지급 예정 상세 목록 조회
router.get('/advance-payment-details', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // payment_status.advance = false인 프로젝트들의 상세 정보 조회 (제품사진, 수량, 단가 포함)
    const [rows] = await connection.execute(`
      SELECT 
        p.id,
        p.project_name,
        p.advance_payment,
        p.quantity,
        p.unit_price,
        p.created_at,
        (SELECT file_name FROM mj_project_images WHERE project_id = p.id ORDER BY id ASC LIMIT 1) as representative_image
      FROM mj_project p
      WHERE JSON_EXTRACT(p.payment_status, '$.advance') = false
        AND p.advance_payment > 0
      ORDER BY p.created_at DESC
    `);
    
    const advancePayments = rows.map(row => ({
      id: row.id,
      project_id: row.id,
      project_name: row.project_name,
      advance_payment: row.advance_payment,
      quantity: row.quantity,
      unit_price: row.unit_price,
      created_at: row.created_at,
      notes: null,
      representative_image: row.representative_image
    }));
    
    devLog(`[Finance] 선금 지급 예정 상세 조회 성공 - User: ${userId}, Count: ${advancePayments.length}`);
    
    res.json({
      success: true,
      message: '선금 지급 예정 상세 정보를 성공적으로 조회했습니다.',
      data: {
        advancePayments
      }
    });
    
  } catch (error) {
    errorLog(`[Finance] 선금 지급 예정 상세 조회 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '선금 지급 예정 상세 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 잔금 지급 예정 상세 목록 조회
router.get('/balance-payment-details', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // payment_status.balance = false이고 balance_due_date가 오늘 이하인 프로젝트들의 상세 정보 조회 (제품사진, 수량, 단가, 수수료율 포함)
    const [rows] = await connection.execute(`
      SELECT 
        p.id,
        p.project_name,
        p.balance_amount,
        p.balance_due_date,
        p.quantity,
        p.unit_price,
        p.fee_rate,
        p.created_at,
        (SELECT file_name FROM mj_project_images WHERE project_id = p.id ORDER BY id ASC LIMIT 1) as representative_image
      FROM mj_project p
      WHERE JSON_EXTRACT(p.payment_status, '$.balance') = false
        AND p.balance_amount > 0
        AND p.balance_due_date <= CURDATE()
      ORDER BY p.balance_due_date ASC, p.created_at DESC
    `);
    
    const balancePayments = rows.map(row => ({
      id: row.id,
      project_id: row.id,
      project_name: row.project_name,
      balance_amount: row.balance_amount,
      balance_due_date: row.balance_due_date,
      quantity: row.quantity,
      unit_price: row.unit_price,
      fee_rate: row.fee_rate,
      created_at: row.created_at,
      notes: null,
      representative_image: row.representative_image
    }));
    
    devLog(`[Finance] 잔금 지급 예정 상세 조회 성공 - User: ${userId}, Count: ${balancePayments.length}`);
    
    res.json({
      success: true,
      message: '잔금 지급 예정 상세 정보를 성공적으로 조회했습니다.',
      data: {
        balancePayments
      }
    });
    
  } catch (error) {
    errorLog(`[Finance] 잔금 지급 예정 상세 조회 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '잔금 지급 예정 상세 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

module.exports = router; 