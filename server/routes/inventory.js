const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');

// 제품별 입출고 현황 조회 API
router.get('/product-inventory-status', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId, status, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    
    console.log('🔍 [inventory] 제품별 입출고 현황 조회 요청:', {
      projectId,
      status,
      page,
      limit,
      search,
      userId: req.user.id,
      isAdmin: req.user.isAdmin
    });
    
    // 1. 프로젝트 기본 정보 조회
    let projectQuery = `
      SELECT 
        p.id,
        p.project_name,
        p.quantity as total_quantity,
        p.entry_quantity,
        p.export_quantity,
        p.remain_quantity,
        p.factory_shipping_status,
        p.actual_factory_shipping_date,
        p.expected_factory_shipping_date,
        p.created_at,
        p.updated_at
      FROM mj_project p
      WHERE 1=1
    `;
    
    const projectParams = [];
    
    // 권한에 따른 필터링
    if (!req.user.isAdmin) {
      projectQuery += ' AND p.user_id = ?';
      projectParams.push(req.user.id);
    }
    
    // 프로젝트 ID 필터
    if (projectId) {
      projectQuery += ' AND p.id = ?';
      projectParams.push(projectId);
    }
    
    // 검색 필터
    if (search) {
      projectQuery += ' AND p.project_name LIKE ?';
      projectParams.push(`%${search}%`);
    }
    
    projectQuery += ' ORDER BY p.project_name ASC LIMIT ? OFFSET ?';
    projectParams.push(parseInt(limit), parseInt(offset));
    
    const [projects] = await connection.execute(projectQuery, projectParams);
    
    console.log(`📊 [inventory] 조회된 프로젝트 수: ${projects.length}`);
    
    // 2. 최적화된 단일 쿼리로 모든 수량 계산 (N+1 문제 해결)
    const projectIds = projects.map(p => p.id);
    if (projectIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { currentPage: 1, totalPages: 0, total: 0, limit: parseInt(limit) },
        summary: { total_projects: 0, status_counts: {} }
      });
    }

    const [quantitiesData] = await connection.execute(`
      SELECT 
        p.id as project_id,
        COALESCE(we_scheduled.total, 0) as scheduled_entry_quantity,
        COALESCE(we_completed.total, 0) as completed_entry_quantity,
        COALESCE(pl_shipping.total, 0) as shipping_quantity,
        COALESCE(pl_delivered.total, 0) as delivered_quantity,
        COALESCE(pl_arrived.total, 0) as arrived_quantity
      FROM mj_project p
      LEFT JOIN (
        SELECT project_id, SUM(quantity) as total
        FROM warehouse_entries 
        WHERE status = '입고중'
        GROUP BY project_id
      ) we_scheduled ON p.id = we_scheduled.project_id
      LEFT JOIN (
        SELECT project_id, SUM(quantity) as total
        FROM warehouse_entries 
        WHERE status = '입고완료'
        GROUP BY project_id
      ) we_completed ON p.id = we_completed.project_id
      LEFT JOIN (
        SELECT mpl.project_id, SUM(mpl.box_count * mpl.packaging_count * mpl.packaging_method) as total
        FROM mj_packing_list mpl
        LEFT JOIN logistic_payment lp ON mpl.id = lp.mj_packing_list_id
        WHERE (lp.id IS NULL OR lp.is_paid = false) AND (mpl.is_arrived IS NULL OR mpl.is_arrived = false)
        GROUP BY mpl.project_id
      ) pl_shipping ON p.id = pl_shipping.project_id
      LEFT JOIN (
        SELECT mpl.project_id, SUM(mpl.box_count * mpl.packaging_count * mpl.packaging_method) as total
        FROM mj_packing_list mpl
        JOIN logistic_payment lp ON mpl.id = lp.mj_packing_list_id
        WHERE lp.is_paid = true AND (mpl.is_arrived IS NULL OR mpl.is_arrived = false)
        GROUP BY mpl.project_id
      ) pl_delivered ON p.id = pl_delivered.project_id
      LEFT JOIN (
        SELECT mpl.project_id, SUM(mpl.box_count * mpl.packaging_count * mpl.packaging_method) as total
        FROM mj_packing_list mpl
        WHERE mpl.is_arrived = true
        GROUP BY mpl.project_id
      ) pl_arrived ON p.id = pl_arrived.project_id
      WHERE p.id IN (${projectIds.map(() => '?').join(',')})
    `, projectIds);

    // 수량 데이터를 Map으로 변환하여 빠른 조회
    const quantitiesMap = new Map();
    quantitiesData.forEach(q => {
      quantitiesMap.set(q.project_id, {
        scheduled: q.scheduled_entry_quantity,
        completed: q.completed_entry_quantity,
        shipping: q.shipping_quantity,
        delivered: q.delivered_quantity,
        arrived: q.arrived_quantity
      });
    });

    // 프로젝트 데이터와 수량 데이터 결합
    const inventoryStatus = projects.map(project => {
      const quantities = quantitiesMap.get(project.id) || {
        scheduled: 0, completed: 0, shipping: 0, delivered: 0, arrived: 0
      };
      
      const currentStatus = calculateCurrentStatus(project, quantities);
      
      return {
        project_id: project.id,
        project_name: project.project_name,
        total_quantity: project.total_quantity,
        entry_quantity: project.entry_quantity,
        export_quantity: project.export_quantity,
        remain_quantity: project.remain_quantity,
        scheduled_entry_quantity: quantities.scheduled,
        completed_entry_quantity: quantities.completed,
        shipping_quantity: quantities.shipping,
        delivered_quantity: quantities.delivered,
        arrived_quantity: quantities.arrived,
        current_status: currentStatus,
        factory_shipping_status: project.factory_shipping_status,
        actual_factory_shipping_date: project.actual_factory_shipping_date,
        expected_factory_shipping_date: project.expected_factory_shipping_date,
        created_at: project.created_at,
        updated_at: project.updated_at
      };
    });
    
    // 3. 상태별 필터링
    let filteredData = inventoryStatus;
    if (status) {
      filteredData = inventoryStatus.filter(item => item.current_status === status);
    }
    
    // 4. 총 개수 조회 (페이징용)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM mj_project 
      WHERE 1=1
    `;
    const countParams = [];
    
    if (!req.user.isAdmin) {
      countQuery += ' AND user_id = ?';
      countParams.push(req.user.id);
    }
    
    if (projectId) {
      countQuery += ' AND id = ?';
      countParams.push(projectId);
    }
    
    if (search) {
      countQuery += ' AND project_name LIKE ?';
      countParams.push(`%${search}%`);
    }
    
    const [totalCount] = await connection.execute(countQuery, countParams);
    
    // 5. 상태별 통계 계산
    const statusCounts = {
      입고예정: filteredData.filter(item => item.current_status === '입고예정').length,
      입고중: filteredData.filter(item => item.current_status === '입고중').length,
      입고완료: filteredData.filter(item => item.current_status === '입고완료').length,
      배송중: filteredData.filter(item => item.current_status === '배송중').length,
      도착완료: filteredData.filter(item => item.current_status === '도착완료').length
    };
    
    console.log(`✅ [inventory] 제품별 입출고 현황 조회 완료:`, {
      total_projects: filteredData.length,
      status_counts: statusCounts,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: totalCount[0].total
      }
    });
    
    res.json({
      success: true,
      data: filteredData,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: totalCount[0].total,
        total_pages: Math.ceil(totalCount[0].total / limit)
      },
      summary: {
        total_projects: filteredData.length,
        status_counts: statusCounts
      }
    });
    
  } catch (error) {
    console.error('❌ [inventory] 제품별 입출고 현황 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '제품별 입출고 현황 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 상태 계산 함수
function calculateCurrentStatus(project, quantities) {
  const { scheduled, completed, shipping, delivered } = quantities;
  
  // 도착완료: 배송 완료된 수량이 있는 경우
  if (delivered > 0) return '도착완료';
  
  // 배송중: 패킹리스트는 있지만 배송 완료되지 않은 경우
  if (shipping > 0) return '배송중';
  
  // 입고완료: 입고 완료된 수량이 있는 경우
  if (completed > 0) return '입고완료';
  
  // 입고중: 입고 예정 수량이 있는 경우
  if (scheduled > 0) return '입고중';
  
  // 입고예정: 기본 상태
  return '입고예정';
}

// 프로젝트별 상세 입출고 히스토리 조회 API
router.get('/project/:projectId/history', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId } = req.params;
    
    console.log(`🔍 [inventory] 프로젝트 ${projectId} 입출고 히스토리 조회 요청`);
    
    // 프로젝트 존재 여부 및 권한 확인
    let projectQuery = 'SELECT id, project_name FROM mj_project WHERE id = ?';
    const projectParams = [projectId];
    
    if (!req.user.isAdmin) {
      projectQuery += ' AND user_id = ?';
      projectParams.push(req.user.id);
    }
    
    const [projectRows] = await connection.execute(projectQuery, projectParams);
    
    if (projectRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다.'
      });
    }
    
    const project = projectRows[0];
    
    // 입고 히스토리 조회
    const [entryHistory] = await connection.execute(`
      SELECT 
        id,
        quantity,
        entry_date,
        status,
        created_at
      FROM warehouse_entries 
      WHERE project_id = ? 
      ORDER BY entry_date ASC, created_at ASC
    `, [projectId]);
    
    // 출고 히스토리 조회 (패킹리스트)
    const [exportHistory] = await connection.execute(`
      SELECT 
        mpl.id,
        mpl.box_count * mpl.packaging_count * mpl.packaging_method as quantity,
        mpl.pl_date as export_date,
        mpl.packing_code,
        lp.is_paid,
        lp.tracking_number,
        mpl.created_at
      FROM mj_packing_list mpl
      LEFT JOIN logistic_payment lp ON mpl.id = lp.mj_packing_list_id
      WHERE mpl.project_id = ? 
      ORDER BY mpl.pl_date ASC, mpl.created_at ASC
    `, [projectId]);
    
    console.log(`✅ [inventory] 프로젝트 ${projectId} 히스토리 조회 완료:`, {
      entry_count: entryHistory.length,
      export_count: exportHistory.length
    });
    
    res.json({
      success: true,
      project: {
        id: project.id,
        project_name: project.project_name
      },
      entry_history: entryHistory,
      export_history: exportHistory
    });
    
  } catch (error) {
    console.error(`❌ [inventory] 프로젝트 ${req.params.projectId} 히스토리 조회 오류:`, error);
    res.status(500).json({ 
      success: false, 
      error: '입출고 히스토리 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
