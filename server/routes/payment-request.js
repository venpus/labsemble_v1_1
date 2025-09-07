const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

// 지급 요청 저장 API
router.post('/save-payment-requests', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { advancePayments, balancePayments, shippingPayments } = req.body;
    
    // 선금 지급 요청 저장
    if (advancePayments && advancePayments.length > 0) {
      for (const payment of advancePayments) {
        await connection.execute(
          `INSERT INTO mj_payment_requests (project_id, payment_type, amount, request_date, status) 
           VALUES (?, 'advance', ?, NOW(), 'pending')`,
          [payment.project_id, payment.amount]
        );
      }
    }
    
    // 잔금 지급 요청 저장
    if (balancePayments && balancePayments.length > 0) {
      for (const payment of balancePayments) {
        await connection.execute(
          `INSERT INTO mj_payment_requests (project_id, payment_type, amount, fee_rate, request_date, status) 
           VALUES (?, 'balance', ?, ?, NOW(), 'pending')`,
          [payment.project_id, payment.amount, payment.fee_rate || null]
        );
      }
    }
    
    // 배송비 지급 요청 저장
    if (shippingPayments && shippingPayments.length > 0) {
      for (const payment of shippingPayments) {
        await connection.execute(
          `INSERT INTO mj_shipping_payment_requests (pl_date, total_boxes, total_amount, packing_codes, logistic_companies, request_date, status) 
           VALUES (?, ?, ?, ?, ?, NOW(), 'pending')`,
          [payment.pl_date, payment.box_count, payment.total_logistic_fee, payment.packing_codes, payment.logistic_companies]
        );
      }
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      message: '지급 요청이 성공적으로 저장되었습니다.',
      data: {
        advanceCount: advancePayments ? advancePayments.length : 0,
        balanceCount: balancePayments ? balancePayments.length : 0,
        shippingCount: shippingPayments ? shippingPayments.length : 0
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('지급 요청 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '지급 요청 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 지급 요청 목록 조회 API
router.get('/payment-requests', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    // 프로젝트 기반 지급 요청 조회
    const [projectRequests] = await connection.execute(`
      SELECT 
        pr.id,
        pr.project_id,
        p.project_name,
        pr.payment_type,
        pr.amount,
        pr.fee_rate,
        pr.request_date,
        pr.status,
        pr.created_at
      FROM mj_payment_requests pr
      LEFT JOIN mj_project p ON pr.project_id = p.id
      ORDER BY pr.request_date DESC
    `);
    
    // 배송비 지급 요청 조회
    const [shippingRequests] = await connection.execute(`
      SELECT 
        id,
        pl_date,
        total_boxes,
        total_amount,
        packing_codes,
        logistic_companies,
        request_date,
        status,
        created_at
      FROM mj_shipping_payment_requests
      ORDER BY request_date DESC
    `);
    
    res.json({
      success: true,
      data: {
        projectRequests,
        shippingRequests
      }
    });
    
  } catch (error) {
    console.error('지급 요청 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '지급 요청 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 날짜별 지급 요청 목록 조회 API
router.get('/payment-requests-by-date', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    // 프로젝트 기반 지급 요청을 날짜별로 그룹화하여 조회
    const [projectRequests] = await connection.execute(`
      SELECT 
        DATE(pr.request_date) as request_date,
        pr.payment_type,
        COUNT(*) as count,
        SUM(pr.amount) as total_amount,
        GROUP_CONCAT(
          CONCAT(p.project_name, ' (', pr.amount, ' CNY', 
                 CASE WHEN pr.payment_type = 'balance' AND pr.fee_rate IS NOT NULL 
                      THEN CONCAT(', 수수료율: ', pr.fee_rate, '%') 
                      ELSE '' END
                ) 
          ORDER BY pr.created_at ASC 
          SEPARATOR '; '
        ) as details
      FROM mj_payment_requests pr
      LEFT JOIN mj_project p ON pr.project_id = p.id
      WHERE pr.status = 'pending'
      GROUP BY DATE(pr.request_date), pr.payment_type
      ORDER BY request_date ASC, pr.payment_type
    `);
    
    // 배송비 지급 요청을 날짜별로 그룹화하여 조회
    const [shippingRequests] = await connection.execute(`
      SELECT 
        DATE(request_date) as request_date,
        'shipping' as payment_type,
        COUNT(*) as count,
        SUM(total_amount) as total_amount,
        GROUP_CONCAT(
          CONCAT('출고일: ', pl_date, ' (', total_boxes, '박스, ', total_amount, ' CNY)')
          ORDER BY request_date ASC 
          SEPARATOR '; '
        ) as details
      FROM mj_shipping_payment_requests
      WHERE status = 'pending'
      GROUP BY DATE(request_date)
      ORDER BY request_date ASC
    `);
    
    // 모든 요청을 합치고 날짜별로 그룹화
    const allRequests = [...projectRequests, ...shippingRequests];
    const groupedByDate = {};
    
    allRequests.forEach(request => {
      const date = request.request_date;
      if (!groupedByDate[date]) {
        groupedByDate[date] = {
          date: date,
          advance: null,
          balance: null,
          shipping: null
        };
      }
      
      if (request.payment_type === 'advance') {
        groupedByDate[date].advance = {
          count: request.count,
          total_amount: request.total_amount,
          details: request.details
        };
      } else if (request.payment_type === 'balance') {
        groupedByDate[date].balance = {
          count: request.count,
          total_amount: request.total_amount,
          details: request.details
        };
      } else if (request.payment_type === 'shipping') {
        groupedByDate[date].shipping = {
          count: request.count,
          total_amount: request.total_amount,
          details: request.details
        };
      }
    });
    
    // 날짜순으로 정렬된 배열로 변환
    const sortedRequests = Object.values(groupedByDate).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    res.json({
      success: true,
      data: sortedRequests
    });
    
  } catch (error) {
    console.error('날짜별 지급 요청 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '날짜별 지급 요청 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 개별 지급 요청 상세 데이터 조회 API
router.get('/payment-request-details/:date', auth, async (req, res) => {
  const connection = await pool.getConnection();
  const { date } = req.params;
  
  try {
    // 선금 지급 요청 상세 조회
    const [advanceRequests] = await connection.execute(`
      SELECT 
        pr.id,
        pr.project_id,
        p.project_name,
        pr.amount,
        pr.fee_rate,
        pr.request_date,
        pr.status,
        p.quantity,
        p.unit_price,
        p.created_at,
        (SELECT file_name FROM mj_project_images WHERE project_id = p.id ORDER BY id ASC LIMIT 1) as representative_image
      FROM mj_payment_requests pr
      LEFT JOIN mj_project p ON pr.project_id = p.id
      WHERE pr.status = 'pending' 
        AND pr.payment_type = 'advance'
        AND DATE(pr.request_date) = ?
      ORDER BY pr.created_at ASC
    `, [date]);
    
    // 잔금 지급 요청 상세 조회
    const [balanceRequests] = await connection.execute(`
      SELECT 
        pr.id,
        pr.project_id,
        p.project_name,
        pr.amount,
        pr.fee_rate,
        pr.request_date,
        pr.status,
        p.quantity,
        p.unit_price,
        p.created_at,
        (SELECT file_name FROM mj_project_images WHERE project_id = p.id ORDER BY id ASC LIMIT 1) as representative_image
      FROM mj_payment_requests pr
      LEFT JOIN mj_project p ON pr.project_id = p.id
      WHERE pr.status = 'pending' 
        AND pr.payment_type = 'balance'
        AND DATE(pr.request_date) = ?
      ORDER BY pr.created_at ASC
    `, [date]);
    
    // 배송비 지급 요청 상세 조회
    const [shippingRequests] = await connection.execute(`
      SELECT 
        id,
        pl_date,
        total_boxes,
        total_amount,
        packing_codes,
        logistic_companies,
        request_date,
        status
      FROM mj_shipping_payment_requests
      WHERE status = 'pending' 
        AND DATE(request_date) = ?
      ORDER BY request_date ASC
    `, [date]);
    
    res.json({
      success: true,
      data: {
        advance: advanceRequests,
        balance: balanceRequests,
        shipping: shippingRequests
      }
    });
  } catch (error) {
    console.error('지급 요청 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '지급 요청 상세 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
