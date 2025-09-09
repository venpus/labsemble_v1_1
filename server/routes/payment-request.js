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

// 선금 지급완료 처리 API
router.post('/complete-advance-payment', auth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { date, projectIds, paymentDate } = req.body;
    
    // 1. 입력 데이터 검증
    if (!date || !Array.isArray(projectIds) || projectIds.length === 0 || !paymentDate) {
      return res.status(400).json({
        success: false,
        message: '필수 데이터가 누락되었습니다.'
      });
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const completedProjects = [];
      const failedProjects = [];
      
      // 2. 각 프로젝트별로 지급완료 처리
      for (const projectId of projectIds) {
        try {
          // 2-1. 프로젝트 존재 여부 확인
          const [projectRows] = await connection.execute(
            'SELECT id, project_name FROM mj_project WHERE id = ?',
            [projectId]
          );
          
          if (projectRows.length === 0) {
            failedProjects.push({ projectId, reason: '프로젝트를 찾을 수 없습니다.' });
            continue;
          }
          
          const project = projectRows[0];
          
          // 2-2. mj_project_payments 테이블 업데이트 또는 생성
          const [existingPayment] = await connection.execute(
            'SELECT id FROM mj_project_payments WHERE project_id = ?',
            [projectId]
          );
          
          if (existingPayment.length > 0) {
            // 기존 레코드 업데이트
            await connection.execute(`
              UPDATE mj_project_payments 
              SET 
                payment_status = JSON_SET(COALESCE(payment_status, '{}'), '$.advance', true),
                payment_dates = JSON_SET(COALESCE(payment_dates, '{}'), '$.advance', ?),
                updated_at = CURRENT_TIMESTAMP
              WHERE project_id = ?
            `, [paymentDate, projectId]);
          } else {
            // 새 레코드 생성
            await connection.execute(`
              INSERT INTO mj_project_payments (project_id, payment_status, payment_dates, payment_amounts)
              VALUES (?, 
                JSON_OBJECT('advance', true, 'balance', false),
                JSON_OBJECT('advance', ?, 'balance', null),
                JSON_OBJECT('advance', 0, 'balance', 0)
              )
            `, [projectId, paymentDate]);
          }
          
          // 2-3. mj_project 테이블도 업데이트 (호환성 유지)
          await connection.execute(`
            UPDATE mj_project 
            SET 
              payment_status = JSON_SET(COALESCE(payment_status, '{}'), '$.advance', true),
              payment_dates = JSON_SET(COALESCE(payment_dates, '{}'), '$.advance', ?),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [paymentDate, projectId]);
          
          completedProjects.push({
            projectId: project.id,
            projectName: project.project_name
          });
          
        } catch (projectError) {
          console.error(`프로젝트 ${projectId} 처리 오류:`, projectError);
          failedProjects.push({ 
            projectId, 
            reason: `처리 중 오류 발생: ${projectError.message}` 
          });
        }
      }
      
      // 3. 트랜잭션 커밋
      await connection.commit();
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ [PaymentRequest] 선금 지급완료 처리 완료: ${completedProjects.length}개 성공, ${failedProjects.length}개 실패 (${processingTime}ms)`);
      
      res.json({
        success: true,
        message: '선금 지급완료 처리가 완료되었습니다.',
        data: {
          completedCount: completedProjects.length,
          failedCount: failedProjects.length,
          completedProjects,
          failedProjects
        },
        processingTime
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ [PaymentRequest] 선금 지급완료 처리 오류:', error);
    
    res.status(500).json({
      success: false,
      message: '선금 지급완료 처리 중 오류가 발생했습니다.',
      error: error.message,
      processingTime
    });
  }
});

// 잔금 지급완료 처리 API
router.post('/complete-balance-payment', auth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { date, projectIds, paymentDate } = req.body;
    
    // 1. 입력 데이터 검증
    if (!date || !Array.isArray(projectIds) || projectIds.length === 0 || !paymentDate) {
      return res.status(400).json({
        success: false,
        message: '필수 데이터가 누락되었습니다.'
      });
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const completedProjects = [];
      const failedProjects = [];
      
      // 2. 각 프로젝트별로 잔금 지급완료 처리
      for (const projectId of projectIds) {
        try {
          // 2-1. 프로젝트 존재 여부 확인
          const [projectRows] = await connection.execute(
            'SELECT id, project_name FROM mj_project WHERE id = ?',
            [projectId]
          );
          
          if (projectRows.length === 0) {
            failedProjects.push({ projectId, reason: '프로젝트를 찾을 수 없습니다.' });
            continue;
          }
          
          const project = projectRows[0];
          
          // 2-2. mj_project_payments 테이블 업데이트 또는 생성
          const [existingPayment] = await connection.execute(
            'SELECT id FROM mj_project_payments WHERE project_id = ?',
            [projectId]
          );
          
          if (existingPayment.length > 0) {
            // 기존 레코드 업데이트
            await connection.execute(`
              UPDATE mj_project_payments 
              SET 
                payment_status = JSON_SET(COALESCE(payment_status, '{}'), '$.balance', true),
                payment_dates = JSON_SET(COALESCE(payment_dates, '{}'), '$.balance', ?),
                updated_at = CURRENT_TIMESTAMP
              WHERE project_id = ?
            `, [paymentDate, projectId]);
          } else {
            // 새 레코드 생성
            await connection.execute(`
              INSERT INTO mj_project_payments (project_id, payment_status, payment_dates, payment_amounts)
              VALUES (?, 
                JSON_OBJECT('advance', false, 'balance', true),
                JSON_OBJECT('advance', null, 'balance', ?),
                JSON_OBJECT('advance', 0, 'balance', 0)
              )
            `, [projectId, paymentDate]);
          }
          
          // 2-3. mj_project 테이블도 업데이트 (호환성 유지)
          await connection.execute(`
            UPDATE mj_project 
            SET 
              payment_status = JSON_SET(COALESCE(payment_status, '{}'), '$.balance', true),
              payment_dates = JSON_SET(COALESCE(payment_dates, '{}'), '$.balance', ?),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [paymentDate, projectId]);
          
          completedProjects.push({
            projectId: project.id,
            projectName: project.project_name
          });
          
        } catch (projectError) {
          console.error(`프로젝트 ${projectId} 처리 오류:`, projectError);
          failedProjects.push({ 
            projectId, 
            reason: `처리 중 오류 발생: ${projectError.message}` 
          });
        }
      }
      
      // 3. 트랜잭션 커밋
      await connection.commit();
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ [PaymentRequest] 잔금 지급완료 처리 완료: ${completedProjects.length}개 성공, ${failedProjects.length}개 실패 (${processingTime}ms)`);
      
      res.json({
        success: true,
        message: '잔금 지급완료 처리가 완료되었습니다.',
        data: {
          completedCount: completedProjects.length,
          failedCount: failedProjects.length,
          completedProjects,
          failedProjects
        },
        processingTime
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ [PaymentRequest] 잔금 지급완료 처리 오류:', error);
    
    res.status(500).json({
      success: false,
      message: '잔금 지급완료 처리 중 오류가 발생했습니다.',
      error: error.message,
      processingTime
    });
  }
});

// 배송비 지급완료 처리 API
router.post('/complete-shipping-payment', auth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { date, requestIds, paymentDate } = req.body;
    
    // 1. 입력 데이터 검증
    if (!date || !Array.isArray(requestIds) || requestIds.length === 0 || !paymentDate) {
      return res.status(400).json({
        success: false,
        message: '필수 데이터가 누락되었습니다.'
      });
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const completedRequests = [];
      const failedRequests = [];
      
      // 2. 각 배송비 요청별로 지급완료 처리
      for (const requestId of requestIds) {
        try {
          // 2-1. 배송비 요청 존재 여부 확인
          const [requestRows] = await connection.execute(
            'SELECT id, pl_date, packing_codes, total_amount FROM mj_shipping_payment_requests WHERE id = ? AND status = "pending"',
            [requestId]
          );
          
          if (requestRows.length === 0) {
            failedRequests.push({ requestId, reason: '배송비 요청을 찾을 수 없습니다.' });
            continue;
          }
          
          const request = requestRows[0];
          
          // 2-2. mj_shipping_payment_requests 테이블 상태 업데이트
          await connection.execute(`
            UPDATE mj_shipping_payment_requests 
            SET 
              status = 'completed',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [requestId]);
          
          // 2-3. logistic_payment 테이블의 is_paid 상태 업데이트
          // 해당 pl_date와 packing_codes에 해당하는 logistic_payment 레코드들을 찾아서 업데이트
          const packingCodes = request.packing_codes.split(',').map(code => code.trim());
          
          let updatedLogisticRecords = 0;
          for (const packingCode of packingCodes) {
            const [updateResult] = await connection.execute(`
              UPDATE logistic_payment 
              SET 
                is_paid = true,
                updated_at = CURRENT_TIMESTAMP
              WHERE packing_code = ? 
                AND pl_date = ?
                AND is_paid = false
            `, [packingCode, request.pl_date]);
            
            updatedLogisticRecords += updateResult.affectedRows;
          }
          
          completedRequests.push({
            requestId: request.id,
            plDate: request.pl_date,
            packingCodes: request.packing_codes,
            totalAmount: request.total_amount,
            updatedLogisticRecords
          });
          
        } catch (requestError) {
          console.error(`배송비 요청 ${requestId} 처리 오류:`, requestError);
          failedRequests.push({ 
            requestId, 
            reason: `처리 중 오류 발생: ${requestError.message}` 
          });
        }
      }
      
      // 3. 트랜잭션 커밋
      await connection.commit();
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ [PaymentRequest] 배송비 지급완료 처리 완료: ${completedRequests.length}개 성공, ${failedRequests.length}개 실패 (${processingTime}ms)`);
      
      res.json({
        success: true,
        message: '배송비 지급완료 처리가 완료되었습니다.',
        data: {
          completedCount: completedRequests.length,
          failedCount: failedRequests.length,
          completedRequests,
          failedRequests
        },
        processingTime
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ [PaymentRequest] 배송비 지급완료 처리 오류:', error);
    
    res.status(500).json({
      success: false,
      message: '배송비 지급완료 처리 중 오류가 발생했습니다.',
      error: error.message,
      processingTime
    });
  }
});

module.exports = router;
