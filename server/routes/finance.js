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
    
    // payment_status에서 advance가 true인 프로젝트들의 advance_payment 총합 조회
    console.log(`[Finance] 선금 정보 조회 시작 - User: ${userId}`);
    
    // 디버깅: 먼저 해당 사용자의 모든 프로젝트와 payment_status 확인
    const [debugRows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        advance_payment,
        payment_status,
        JSON_TYPE(payment_status) as payment_status_type,
        JSON_VALID(payment_status) as payment_status_valid
      FROM mj_project 
      WHERE user_id = ?
    `, [userId]);
    
    // 디버깅: 전체 시스템의 모든 프로젝트 advance_payment 정보 확인
    const [systemDebugRows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        advance_payment,
        payment_status,
        user_id
      FROM mj_project 
      WHERE advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    
    console.log(`[Finance] 시스템 전체 advance_payment 대상 프로젝트:`);
    systemDebugRows.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}, 선금: ${row.advance_payment} CNY, 사용자: ${row.user_id}`);
    });
    
    console.log(`[Finance] 디버깅: 사용자 ${userId}의 모든 프로젝트 정보:`);
    debugRows.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}`);
      console.log(`    - advance_payment: ${row.advance_payment} (타입: ${typeof row.advance_payment})`);
      console.log(`    - payment_status: ${row.payment_status} (타입: ${row.payment_status_type}, 유효성: ${row.payment_status_valid})`);
      
      // payment_status가 JSON인 경우 파싱 시도
      if (row.payment_status && row.payment_status_valid) {
        try {
          const parsedStatus = JSON.parse(row.payment_status);
          console.log(`    - 파싱된 payment_status:`, parsedStatus);
          console.log(`    - advance 키 존재: ${'advance' in parsedStatus}`);
          console.log(`    - advance 값: ${parsedStatus.advance}`);
          console.log(`    - advance === true: ${parsedStatus.advance === true}`);
        } catch (parseError) {
          console.log(`    - JSON 파싱 실패:`, parseError.message);
        }
      }
    });
    
    // 먼저 개별 프로젝트의 advance_payment 정보를 조회하여 상세 로그 출력 (전체 시스템 기준)
    const [detailRows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        advance_payment,
        payment_status,
        user_id
      FROM mj_project 
      WHERE advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    
    // 모든 프로젝트의 advance_payment 총합 조회 (전체 시스템 기준)
    const [rows] = await connection.execute(`
      SELECT 
        SUM(CAST(advance_payment AS DECIMAL(15,2))) as total_advance_payment,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    
    console.log(`[Finance] advance_payment 대상 프로젝트 상세 정보:`);
    detailRows.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}, 선금: ${row.advance_payment} CNY, payment_status: ${JSON.stringify(row.payment_status)}`);
    });
    
    // 대안 쿼리로도 시도해보기
    console.log(`[Finance] 대안 쿼리 시도...`);
    
    // 방법 1: 모든 프로젝트의 advance_payment 합계 (기본 쿼리와 동일)
    const [altRows1] = await connection.execute(`
      SELECT 
        SUM(CAST(advance_payment AS DECIMAL(15,2))) as total_advance_payment,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    
    console.log(`[Finance] 대안 쿼리 1 결과 (모든 프로젝트):`, altRows1[0]);
    
    // 방법 2: advance_payment가 0보다 큰 모든 프로젝트
    const [altRows2] = await connection.execute(`
      SELECT 
        SUM(CAST(advance_payment AS DECIMAL(15,2))) as total_advance_payment,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE advance_payment > 0
    `);
    
    console.log(`[Finance] 대안 쿼리 2 결과 (advance_payment > 0):`, altRows2[0]);
    
    // 가장 성공적인 쿼리 결과 사용
    let finalTotalAdvancePayment = 0;
    let finalProjectCount = 0;
    
    if (rows[0]?.total_advance_payment > 0) {
      finalTotalAdvancePayment = rows[0].total_advance_payment;
      finalProjectCount = rows[0].project_count;
      console.log(`[Finance] 원본 쿼리 사용: ${finalTotalAdvancePayment} KRW`);
    } else if (altRows1[0]?.total_advance_payment > 0) {
      finalTotalAdvancePayment = altRows1[0].total_advance_payment;
      finalProjectCount = altRows1[0].project_count;
      console.log(`[Finance] 대안 쿼리 1 사용 (모든 프로젝트): ${finalTotalAdvancePayment} CNY`);
    } else if (altRows2[0]?.total_advance_payment > 0) {
      finalTotalAdvancePayment = altRows2[0].total_advance_payment;
      finalProjectCount = altRows2[0].project_count;
      console.log(`[Finance] 대안 쿼리 2 사용 (advance_payment > 0): ${finalTotalAdvancePayment} CNY`);
    } else {
      console.log(`[Finance] 모든 쿼리에서 결과 없음`);
    }
    
    const totalAdvancePayment = finalTotalAdvancePayment ?? 0;
    const projectCount = finalProjectCount ?? 0;
    
    console.log(`[Finance] 선금 계산 결과:`);
    console.log(`  - 총 프로젝트 수: ${projectCount}`);
    console.log(`  - 총 선금 (CNY): ${totalAdvancePayment}`);
    console.log(`  - 데이터 타입 확인: totalAdvancePayment type = ${typeof totalAdvancePayment}`);
    console.log(`  - NULL 체크: totalAdvancePayment === null = ${totalAdvancePayment === null}`);
    console.log(`  - undefined 체크: totalAdvancePayment === undefined = ${totalAdvancePayment === undefined}`);
    
    // 응답 데이터 구조 확인 (CNY 단위로 직접 반환, null 값은 0으로 변환)
    const responseData = {
      totalAdvancePayment: Number(totalAdvancePayment ?? 0),
      projectCount: projectCount ?? 0
    };
    
    console.log(`[Finance] 응답 데이터 구조:`, responseData);
    
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
    
    console.log(`[Finance] 총 거래금액 정보 조회 시작 - User: ${userId}`);
    
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
    
    console.log(`[Finance] 총 거래금액 계산 결과:`);
    console.log(`  - 총 프로젝트 수: ${projectCount}`);
    console.log(`  - 총 거래금액 (CNY): ${totalTransactionAmount}`);
    console.log(`  - 데이터 타입 확인: totalTransactionAmount type = ${typeof totalTransactionAmount}`);
    
    // 개별 프로젝트 정보도 로그로 출력
    const [detailRows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        total_amount,
        user_id
      FROM mj_project 
      WHERE total_amount IS NOT NULL
        AND total_amount != ''
        AND total_amount > 0
      ORDER BY total_amount DESC
      LIMIT 10
    `);
    
    console.log(`[Finance] 상위 10개 프로젝트 total_amount 정보:`);
    detailRows.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}, 총액: ${row.total_amount} CNY, 사용자: ${row.user_id}`);
    });
    
    const responseData = {
      totalTransactionAmount: Number(totalTransactionAmount ?? 0),
      projectCount: projectCount ?? 0
    };
    
    console.log(`[Finance] 응답 데이터 구조:`, responseData);
    
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
    
    console.log(`[Finance] 총 balance_amount 정보 조회 시작 - User: ${userId}`);
    
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
    
    console.log(`[Finance] 총 balance_amount 계산 결과:`);
    console.log(`  - 총 프로젝트 수: ${projectCount}`);
    console.log(`  - 총 balance_amount (CNY): ${totalFeeAmount}`);
    console.log(`  - 데이터 타입 확인: totalFeeAmount type = ${typeof totalFeeAmount}`);
    
    // 개별 프로젝트의 balance_amount 상세 정보 로그
    console.log(`[Finance] 개별 프로젝트 balance_amount 상세 정보:`);
    const [detailBalanceRows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        fee,
        factory_shipping_cost,
        additional_cost_items,
        balance_amount
      FROM mj_project 
      WHERE balance_amount IS NOT NULL
        AND balance_amount != ''
        AND balance_amount > 0
      ORDER BY balance_amount DESC
      LIMIT 5
    `);
    
    detailBalanceRows.forEach((row, index) => {
      let additionalCosts = 0;
      try {
        if (row.additional_cost_items && row.additional_cost_items !== '[]') {
          const items = JSON.parse(row.additional_cost_items);
          additionalCosts = items.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
        }
      } catch (error) {
        console.error(`프로젝트 ${row.id} 추가비용 파싱 오류:`, error);
      }
      
      const expectedBalance = Number(row.fee || 0) + Number(row.factory_shipping_cost || 0) + additionalCosts;
      
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}`);
      console.log(`    - fee: ${row.fee}, 배송비: ${row.factory_shipping_cost}, 추가비용: ${additionalCosts}`);
      console.log(`    - 예상 balance_amount: ${expectedBalance}, 실제 balance_amount: ${row.balance_amount}`);
      console.log(`    - 차이: ${expectedBalance - Number(row.balance_amount)}`);
    });
    
    // 개별 프로젝트 정보도 로그로 출력
    const [detailRows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        balance_amount,
        user_id
      FROM mj_project 
      WHERE balance_amount IS NOT NULL
        AND balance_amount != ''
        AND balance_amount > 0
      ORDER BY balance_amount DESC
      LIMIT 10
    `);
    
    console.log(`[Finance] 상위 10개 프로젝트 balance_amount 정보:`);
    detailRows.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}, balance_amount: ${row.balance_amount} CNY, 사용자: ${row.user_id}`);
    });
    
    const responseData = {
      totalFeeAmount: Number(totalFeeAmount ?? 0),
      projectCount: projectCount ?? 0
    };
    
    console.log(`[Finance] 응답 데이터 구조:`, responseData);
    
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
    
    console.log(`[Finance] 미지급 선금 정보 조회 시작 - User: ${userId}`);
    
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
    
    console.log(`[Finance] 미지급 선금 계산 결과:`);
    console.log(`  - 총 프로젝트 수: ${projectCount}`);
    console.log(`  - 총 미지급 선금 (CNY): ${totalUnpaidAdvance}`);
    console.log(`  - 데이터 타입 확인: totalUnpaidAdvance type = ${typeof totalUnpaidAdvance}`);
    console.log(`  - 참고: payment_status.advance = false인 프로젝트들의 advance_payment 합계`);
    
    // 디버깅: payment_status 구조 확인
    console.log(`[Finance] payment_status 구조 디버깅 시작...`);
    const [debugRows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        advance_payment,
        payment_status,
        JSON_TYPE(payment_status) as payment_status_type,
        JSON_VALID(payment_status) as payment_status_valid,
        JSON_EXTRACT(payment_status, '$.advance') as extracted_advance
      FROM mj_project 
      WHERE advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
      LIMIT 5
    `);
    
    console.log(`[Finance] payment_status 구조 샘플 (상위 5개):`);
    debugRows.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}`);
      console.log(`    - advance_payment: ${row.advance_payment}`);
      console.log(`    - payment_status: ${row.payment_status}`);
      console.log(`    - JSON 타입: ${row.payment_status_type}, 유효성: ${row.payment_status_valid}`);
      console.log(`    - JSON_EXTRACT 결과: ${row.extracted_advance}`);
      console.log(`    - extracted_advance === false: ${row.extracted_advance === false}`);
      console.log(`    - extracted_advance === 'false': ${row.extracted_advance === 'false'}`);
      console.log(`    - extracted_advance === 0: ${row.extracted_advance === 0}`);
    });
    
    // 개별 프로젝트 정보도 로그로 출력
    const [detailRows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        advance_payment,
        payment_status,
        user_id
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.advance') = false
        AND advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
      ORDER BY advance_payment DESC
      LIMIT 10
    `);
    
    console.log(`[Finance] 상위 10개 미지급 선금 프로젝트 정보:`);
    detailRows.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}, 미지급 선금: ${row.advance_payment} CNY, payment_status: ${JSON.stringify(row.payment_status)}, 사용자: ${row.user_id}`);
    });
    console.log(`  - 참고: payment_status.advance = false인 프로젝트들의 advance_payment 표시`);
    
    const responseData = {
      totalUnpaidAdvance: Number(totalUnpaidAdvance ?? 0),
      projectCount: projectCount ?? 0
    };
    
    console.log(`[Finance] 응답 데이터 구조:`, responseData);
    
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
    
    console.log(`[Finance] 미지급 잔금 정보 조회 시작 - User: ${userId}`);
    
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
    
    console.log(`[Finance] 미지급 잔금 계산 결과:`);
    console.log(`  - 총 프로젝트 수: ${projectCount}`);
    console.log(`  - 총 미지급 잔금 (CNY): ${totalUnpaidBalance}`);
    console.log(`  - 데이터 타입 확인: totalUnpaidBalance type = ${typeof totalUnpaidBalance}`);
    console.log(`  - 참고: payment_status.balance = false인 프로젝트들의 fee 합계`);
    
    // 디버깅: payment_status 구조 확인
    console.log(`[Finance] payment_status.balance 구조 디버깅 시작...`);
    const [debugRows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        balance_amount,
        payment_status,
        JSON_TYPE(payment_status) as payment_status_type,
        JSON_VALID(payment_status) as payment_status_valid,
        JSON_EXTRACT(payment_status, '$.balance') as extracted_balance
      FROM mj_project 
      WHERE balance_amount IS NOT NULL
        AND balance_amount != ''
        AND balance_amount > 0
      LIMIT 5
    `);
    
    console.log(`[Finance] payment_status.balance 구조 샘플 (상위 5개):`);
    debugRows.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}`);
      console.log(`    - balance_amount: ${row.balance_amount}`);
      console.log(`    - payment_status: ${row.payment_status}`);
      console.log(`    - JSON 타입: ${row.payment_status_type}, 유효성: ${row.payment_status_valid}`);
      console.log(`    - JSON_EXTRACT 결과: ${row.extracted_balance}`);
      console.log(`    - extracted_balance === false: ${row.extracted_balance === false}`);
      console.log(`    - extracted_balance === 'false': ${row.extracted_balance === 'false'}`);
      console.log(`    - extracted_balance === 0: ${row.extracted_balance === 0}`);
    });
    
    // 개별 프로젝트 정보도 로그로 출력
    const [detailRows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        balance_amount,
        payment_status,
        user_id
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.balance') = false
        AND balance_amount IS NOT NULL
        AND balance_amount != ''
        AND balance_amount > 0
      ORDER BY balance_amount DESC
      LIMIT 10
    `);
    
    console.log(`[Finance] 상위 10개 미지급 잔금 프로젝트 정보:`);
    detailRows.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}, 미지급 잔금: ${row.balance_amount} CNY, payment_status: ${JSON.stringify(row.payment_status)}, 사용자: ${row.user_id}`);
    });
    console.log(`  - 참고: payment_status.balance = false인 프로젝트들의 balance_amount 표시`);
    
    const responseData = {
      totalUnpaidBalance: Number(totalUnpaidBalance ?? 0),
      projectCount: projectCount ?? 0
    };
    
    console.log(`[Finance] 응답 데이터 구조:`, responseData);
    
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
    
    console.log(`[Finance] 지급 예정 선금 정보 조회 시작 - User: ${userId}`);
    
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
    
    console.log(`[Finance] 지급 예정 선금 계산 결과:`);
    console.log(`  - 총 프로젝트 수: ${projectCount}`);
    console.log(`  - 총 지급 예정 선금 (CNY): ${totalAdvancePaymentSchedule}`);
    console.log(`  - 참고: payment_status.advance = false인 프로젝트들의 advance_payment 합계`);
    
    // 상세 프로젝트 정보도 조회
    const [detailRows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        advance_payment,
        payment_status
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.advance') = false
        AND advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
      ORDER BY advance_payment DESC
    `);
    
    console.log(`[Finance] 지급 예정 선금 프로젝트 상세 정보:`);
    detailRows.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}, 선금: ${row.advance_payment} CNY`);
    });
    
    const responseData = {
      totalAdvancePaymentSchedule: Number(totalAdvancePaymentSchedule ?? 0),
      projectCount: projectCount ?? 0,
      projects: detailRows
    };
    
    console.log(`[Finance] 응답 데이터 구조:`, responseData);
    
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

// mj_project에서 잔금 지급 예정 정보 조회 (payment_status.balance = false인 프로젝트들의 balance_amount 합계)
router.get('/balance-payment-schedule', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    console.log(`[Finance] 잔금 지급 예정 정보 조회 시작 - User: ${userId}`);
    
    // 잔금 지급 예정 조회 (payment_status.balance = false)
    const [rows] = await connection.execute(`
      SELECT 
        SUM(CAST(balance_amount AS DECIMAL(15,2))) as total_balance_payment_schedule,
        COUNT(*) as project_count
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.balance') = false
        AND balance_amount IS NOT NULL
        AND balance_amount != ''
        AND balance_amount > 0
    `);
    
    const totalBalancePaymentSchedule = rows[0]?.total_balance_payment_schedule ?? 0;
    const projectCount = rows[0]?.project_count ?? 0;
    
    console.log(`[Finance] 잔금 지급 예정 계산 결과:`);
    console.log(`  - 총 프로젝트 수: ${projectCount}`);
    console.log(`  - 총 잔금 지급 예정 (CNY): ${totalBalancePaymentSchedule}`);
    console.log(`  - 참고: payment_status.balance = false인 프로젝트들의 balance_amount 합계`);
    
    // 상세 프로젝트 정보도 조회
    const [detailRows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        balance_amount,
        payment_status
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.balance') = false
        AND balance_amount IS NOT NULL
        AND balance_amount != ''
        AND balance_amount > 0
      ORDER BY balance_amount DESC
    `);
    
    console.log(`[Finance] 잔금 지급 예정 프로젝트 상세 정보:`);
    detailRows.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}, 잔금: ${row.balance_amount} CNY`);
    });
    
    const responseData = {
      totalBalancePaymentSchedule: Number(totalBalancePaymentSchedule ?? 0),
      projectCount: projectCount ?? 0,
      projects: detailRows
    };
    
    console.log(`[Finance] 응답 데이터 구조:`, responseData);
    
    devLog(`[Finance] 잔금 지급 예정 정보 조회 성공 - User: ${userId}, Total: ${totalBalancePaymentSchedule} CNY, Projects: ${projectCount}`);
    
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

module.exports = router; 