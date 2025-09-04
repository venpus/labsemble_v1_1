const express = require('express');
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { devLog, errorLog } = require('../utils/logger');

const router = express.Router();

// 모바일용 재무 요약 데이터 조회
router.get('/summary', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    
    // 모든 재무 데이터를 한 번에 조회
    const [
      totalAmountResult,
      advancePaymentResult,
      totalFeeResult,
      unpaidAdvanceResult,
      unpaidBalanceResult
    ] = await Promise.all([
      // 총 거래금액 조회
      connection.execute(`
        SELECT 
          SUM(CAST(total_amount AS DECIMAL(15,2))) as total_transaction_amount,
          COUNT(*) as project_count
        FROM mj_project 
        WHERE total_amount IS NOT NULL
          AND total_amount != ''
          AND total_amount > 0
      `),
      
      // 총 선금 조회
      connection.execute(`
        SELECT 
          SUM(CAST(advance_payment AS DECIMAL(15,2))) as total_advance_payment,
          COUNT(*) as project_count
        FROM mj_project 
        WHERE advance_payment IS NOT NULL
          AND advance_payment != ''
          AND advance_payment > 0
      `),
      
      // 총 잔금 조회
      connection.execute(`
        SELECT 
          SUM(CAST(balance_amount AS DECIMAL(15,2))) as total_balance_amount,
          COUNT(*) as project_count
        FROM mj_project 
        WHERE balance_amount IS NOT NULL
          AND balance_amount != ''
          AND balance_amount > 0
      `),
      
      // 미지급 선금 조회
      connection.execute(`
        SELECT 
          SUM(CAST(advance_payment AS DECIMAL(15,2))) as total_unpaid_advance,
          COUNT(*) as project_count
        FROM mj_project 
        WHERE JSON_EXTRACT(payment_status, '$.advance') = false
          AND advance_payment IS NOT NULL
          AND advance_payment != ''
          AND advance_payment > 0
      `),
      
      // 미지급 잔금 조회
      connection.execute(`
        SELECT 
          SUM(CAST(balance_amount AS DECIMAL(15,2))) as total_unpaid_balance,
          COUNT(*) as project_count
        FROM mj_project 
        WHERE JSON_EXTRACT(payment_status, '$.balance') = false
          AND balance_amount IS NOT NULL
          AND balance_amount != ''
          AND balance_amount > 0
      `)
    ]);

    // 배송비 관련 데이터 조회 (물류비 테이블에서)
    const [shippingResult] = await connection.execute(`
      SELECT 
        SUM(CAST(logistic_fee AS DECIMAL(15,2))) as total_shipping_cost,
        SUM(CASE WHEN is_paid = 0 THEN CAST(logistic_fee AS DECIMAL(15,2)) ELSE 0 END) as total_unpaid_shipping_cost,
        COUNT(*) as total_count,
        SUM(CASE WHEN is_paid = 0 THEN 1 ELSE 0 END) as unpaid_count
      FROM logistic_payment 
      WHERE logistic_fee IS NOT NULL
        AND logistic_fee > 0
    `);

    // 결과 데이터 구성
    const summaryData = {
      projectFinance: {
        totalTransactionAmount: Number(totalAmountResult[0][0]?.total_transaction_amount || 0),
        totalAdvancePayment: Number(advancePaymentResult[0][0]?.total_advance_payment || 0),
        totalBalance: Number(totalFeeResult[0][0]?.total_balance_amount || 0),
        totalShippingCost: Number(shippingResult[0]?.total_shipping_cost || 0),
        totalUnpaidAdvance: Number(unpaidAdvanceResult[0][0]?.total_unpaid_advance || 0),
        totalUnpaidBalance: Number(unpaidBalanceResult[0][0]?.total_unpaid_balance || 0),
        totalUnpaidShippingCost: Number(shippingResult[0]?.total_unpaid_shipping_cost || 0)
      },
      statistics: {
        totalProjects: totalAmountResult[0][0]?.project_count || 0,
        projectsWithAdvance: advancePaymentResult[0][0]?.project_count || 0,
        projectsWithBalance: totalFeeResult[0][0]?.project_count || 0,
        unpaidAdvanceProjects: unpaidAdvanceResult[0][0]?.project_count || 0,
        unpaidBalanceProjects: unpaidBalanceResult[0][0]?.project_count || 0,
        totalShippingRecords: shippingResult[0]?.total_count || 0,
        unpaidShippingRecords: shippingResult[0]?.unpaid_count || 0
      }
    };

    devLog(`[Mobile-Finance] 재무 요약 조회 성공 - User: ${userId}`);
    
    res.json({
      success: true,
      data: summaryData,
      message: '모바일 재무 요약 데이터를 성공적으로 조회했습니다.'
    });
    
  } catch (error) {
    errorLog(`[Mobile-Finance] 재무 요약 조회 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '재무 요약 데이터 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 모바일용 프로젝트별 결제 현황 조회
router.get('/project-payments', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, status = 'all' } = req.query;
    
    // 페이지네이션 계산
    const offset = (page - 1) * limit;
    
    // 상태별 필터 조건
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (status === 'unpaid') {
      whereClause += ' AND (JSON_EXTRACT(payment_status, "$.advance") = false OR JSON_EXTRACT(payment_status, "$.balance") = false)';
    } else if (status === 'paid') {
      whereClause += ' AND JSON_EXTRACT(payment_status, "$.advance") = true AND JSON_EXTRACT(payment_status, "$.balance") = true';
    }
    
    // 프로젝트별 결제 현황 조회
    const [rows] = await connection.execute(`
      SELECT 
        id,
        project_name,
        company_name,
        total_amount,
        advance_payment,
        balance_amount,
        payment_status,
        created_at,
        updated_at
      FROM mj_project 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);
    
    // 전체 개수 조회
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as total FROM mj_project ${whereClause}
    `, params);
    
    const total = countResult[0].total;
    
    // 프로젝트 데이터 변환
    const projects = rows.map(project => {
      let paymentStatus = {};
      try {
        paymentStatus = JSON.parse(project.payment_status || '{}');
      } catch (error) {
        console.log(`프로젝트 ${project.id} payment_status 파싱 오류:`, error);
      }
      
      return {
        id: project.id,
        projectName: project.project_name,
        companyName: project.company_name,
        totalAmount: Number(project.total_amount || 0),
        advancePayment: Number(project.advance_payment || 0),
        balanceAmount: Number(project.balance_amount || 0),
        paymentStatus: {
          advance: paymentStatus.advance || false,
          balance: paymentStatus.balance || false
        },
        isFullyPaid: (paymentStatus.advance || false) && (paymentStatus.balance || false),
        createdAt: project.created_at,
        updatedAt: project.updated_at
      };
    });
    
    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      },
      message: '프로젝트별 결제 현황을 성공적으로 조회했습니다.'
    });
    
  } catch (error) {
    errorLog(`[Mobile-Finance] 프로젝트별 결제 현황 조회 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '프로젝트별 결제 현황 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 모바일용 결제 상태 업데이트
router.put('/project/:id/payment-status', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { paymentType, isPaid } = req.body; // paymentType: 'advance' | 'balance', isPaid: boolean
    const userId = req.user.userId;
    
    // 프로젝트 존재 여부 확인
    const [projectRows] = await connection.execute(
      'SELECT id, payment_status FROM mj_project WHERE id = ?',
      [id]
    );
    
    if (projectRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '프로젝트를 찾을 수 없습니다.'
      });
    }
    
    // 기존 payment_status 파싱
    let paymentStatus = {};
    try {
      paymentStatus = JSON.parse(projectRows[0].payment_status || '{}');
    } catch (error) {
      console.log(`프로젝트 ${id} payment_status 파싱 오류:`, error);
    }
    
    // 결제 상태 업데이트
    paymentStatus[paymentType] = isPaid;
    
    // 데이터베이스 업데이트
    await connection.execute(
      'UPDATE mj_project SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(paymentStatus), id]
    );
    
    devLog(`[Mobile-Finance] 결제 상태 업데이트 성공 - Project: ${id}, Type: ${paymentType}, Paid: ${isPaid}`);
    
    res.json({
      success: true,
      message: '결제 상태가 성공적으로 업데이트되었습니다.',
      data: {
        projectId: id,
        paymentType,
        isPaid,
        updatedPaymentStatus: paymentStatus
      }
    });
    
  } catch (error) {
    errorLog(`[Mobile-Finance] 결제 상태 업데이트 실패: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '결제 상태 업데이트 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
