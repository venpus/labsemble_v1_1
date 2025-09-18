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
    if (!req.user || !req.user.isAdmin) {
      if (req.user && req.user.id) {
        projectQuery += ' AND p.user_id = ?';
        projectParams.push(req.user.id);
      } else {
        // 인증되지 않은 사용자는 빈 결과 반환
        return res.json({
          success: true,
          data: [],
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: parseInt(limit)
          }
        });
      }
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
    
    // ID 24 제품 제외 필터
    projectQuery += ' AND p.id != ?';
    projectParams.push(24);
    
    projectQuery += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
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
        p.quantity,
        p.entry_quantity,
        CASE 
          WHEN p.entry_quantity > 0 THEN GREATEST(0, p.quantity - COALESCE(pl_shipping.total, 0) - COALESCE(pl_arrived.total, 0))
          ELSE 0
        END as scheduled_entry_quantity,
        CASE 
          WHEN p.entry_quantity > 0 THEN GREATEST(0, p.quantity - COALESCE(pl_shipping.total, 0) - COALESCE(pl_arrived.total, 0))
          ELSE 0
        END as completed_entry_quantity,
        COALESCE(pl_shipping.total, 0) as shipping_quantity,
        COALESCE(pl_arrived.total, 0) as arrived_quantity
      FROM mj_project p
      LEFT JOIN (
        -- 배송중: logistic_payment에서 is_arrived = false인 박스들의 수량
        -- packing_code + pl_date로 연결하여 모든 상품에 동일한 박스 수 적용
        SELECT 
          mpl.project_id, 
          SUM(lp_shipping.shipping_count * mpl.packaging_count * mpl.packaging_method) as total
        FROM mj_packing_list mpl
        JOIN (
          SELECT 
            packing_code,
            pl_date,
            COUNT(*) as shipping_count
          FROM logistic_payment 
          WHERE is_arrived = false
          GROUP BY packing_code, pl_date
        ) lp_shipping ON mpl.packing_code = lp_shipping.packing_code AND mpl.pl_date = lp_shipping.pl_date
        GROUP BY mpl.project_id
      ) pl_shipping ON p.id = pl_shipping.project_id
      LEFT JOIN (
        -- 도착완료: logistic_payment에서 is_arrived = true인 박스들의 수량
        -- packing_code + pl_date로 연결하여 모든 상품에 동일한 박스 수 적용
        SELECT 
          mpl.project_id, 
          SUM(lp_arrived.arrived_count * mpl.packaging_count * mpl.packaging_method) as total
        FROM mj_packing_list mpl
        JOIN (
          SELECT 
            packing_code,
            pl_date,
            COUNT(*) as arrived_count
          FROM logistic_payment 
          WHERE is_arrived = true
          GROUP BY packing_code, pl_date
        ) lp_arrived ON mpl.packing_code = lp_arrived.packing_code AND mpl.pl_date = lp_arrived.pl_date
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
        arrived: q.arrived_quantity
      });
    });

    // ID 3 제품 하드코딩 데이터 설정
    quantitiesMap.set(3, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 2000      // 한국 도착
    });

    // ID 7 제품 하드코딩 데이터 설정
    quantitiesMap.set(7, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 300       // 한국 도착
    });

    // ID 27 제품 하드코딩 데이터 설정
    quantitiesMap.set(27, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 4000      // 한국 도착
    });

    // ID 28, 29, 30, 31 제품 하드코딩 데이터 설정 (총 수량과 동일한 한국 도착)
    quantitiesMap.set(28, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 'total'   // 한국 도착 (총 수량과 동일)
    });
    quantitiesMap.set(29, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 'total'   // 한국 도착 (총 수량과 동일)
    });
    quantitiesMap.set(30, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 'total'   // 한국 도착 (총 수량과 동일)
    });
    quantitiesMap.set(31, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 'total'   // 한국 도착 (총 수량과 동일)
    });

    // ID 33 제품 하드코딩 데이터 설정
    quantitiesMap.set(33, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 2000      // 한국 도착
    });

    // ID 35 제품 하드코딩 데이터 설정
    quantitiesMap.set(35, {
      scheduled: 2,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 998       // 한국 도착
    });

    // ID 37 제품 하드코딩 데이터 설정
    quantitiesMap.set(37, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 1200      // 한국 도착
    });

    // ID 38 제품 하드코딩 데이터 설정
    quantitiesMap.set(38, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 380,     // 배송중
      arrived: 720       // 한국 도착
    });

    // ID 39 제품 하드코딩 데이터 설정
    quantitiesMap.set(39, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 733,     // 배송중
      arrived: 367       // 한국 도착
    });

    // ID 42 제품 하드코딩 데이터 설정
    quantitiesMap.set(42, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 5505      // 한국 도착
    });

    // ID 46 제품 하드코딩 데이터 설정
    quantitiesMap.set(46, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 900       // 한국 도착
    });

    // ID 47 제품 하드코딩 데이터 설정
    quantitiesMap.set(47, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 150       // 한국 도착
    });

    // ID 52 제품 하드코딩 데이터 설정
    quantitiesMap.set(52, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 200       // 한국 도착
    });

    // ID 76 제품 하드코딩 데이터 설정
    quantitiesMap.set(76, {
      scheduled: 500,    // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 500       // 한국 도착
    });

    // ID 79 제품 하드코딩 데이터 설정
    quantitiesMap.set(79, {
      scheduled: 0,      // 중국 재고 수량
      completed: 0,      // 사용하지 않음
      shipping: 0,       // 배송중
      arrived: 350       // 한국 도착
    });

    // 각 프로젝트에 대한 첫 번째 이미지 정보 조회
    const inventoryStatus = await Promise.all(projects.map(async (project) => {
      const quantities = quantitiesMap.get(project.id) || {
        scheduled: 0, completed: 0, shipping: 0, arrived: 0
      };
      
      const currentStatus = calculateCurrentStatus(project, quantities);
      
      // 해당 프로젝트의 첫 번째 이미지 조회
      let firstImage = null;
      try {
        const [images] = await pool.execute(`
          SELECT id, file_name, file_path, original_name, created_at
          FROM mj_project_images 
          WHERE project_id = ?
          ORDER BY created_at ASC
          LIMIT 1
        `, [project.id]);

        if (images.length > 0) {
          const image = images[0];
          firstImage = {
            id: image.id,
            original_filename: image.original_name,
            stored_filename: image.file_name,
            file_path: image.file_path,
            created_at: image.created_at,
            url: `/api/warehouse/image/${image.file_name}`,
            thumbnail_url: `/api/warehouse/image/${image.file_name}`,
            fallback_url: `/uploads/project/mj/registImage/${image.file_name}`
          };
        }
      } catch (imageError) {
        console.log(`⚠️ [inventory] 프로젝트 ${project.id} 이미지 조회 오류:`, imageError.message);
      }
      
      // 하드코딩 제품 처리
      const isHardcodedProject = project.id === 3 || project.id === 7 || project.id === 27 || 
                                 project.id === 28 || project.id === 29 || project.id === 30 || project.id === 31 ||
                                 project.id === 33 || project.id === 35 || project.id === 37 || 
                                 project.id === 38 || project.id === 39 || project.id === 42 || 
                                 project.id === 46 || project.id === 47 || project.id === 52 || project.id === 76 || project.id === 79;
      let hardcodedTotalQuantity = project.total_quantity;
      
      if (project.id === 3) {
        hardcodedTotalQuantity = 2000;
      } else if (project.id === 7) {
        hardcodedTotalQuantity = 300;
      } else if (project.id === 27) {
        hardcodedTotalQuantity = 4000;
      } else if (project.id === 33) {
        hardcodedTotalQuantity = 2000;
      } else if (project.id === 35) {
        hardcodedTotalQuantity = 1000;
      } else if (project.id === 37) {
        hardcodedTotalQuantity = 1200;
      } else if (project.id === 38) {
        hardcodedTotalQuantity = 1100;
      } else if (project.id === 39) {
        hardcodedTotalQuantity = 1100;
      } else if (project.id === 42) {
        hardcodedTotalQuantity = 5505;
      } else if (project.id === 46) {
        hardcodedTotalQuantity = 900;
      } else if (project.id === 47) {
        hardcodedTotalQuantity = 150;
      } else if (project.id === 52) {
        hardcodedTotalQuantity = 200;
      } else if (project.id === 76) {
        hardcodedTotalQuantity = 500;
      } else if (project.id === 79) {
        hardcodedTotalQuantity = 350;
      }
      
      // 한국 도착 수량이 'total'인 경우 총 수량과 동일하게 설정
      let hardcodedArrivedQuantity = quantities.arrived;
      if (quantities.arrived === 'total') {
        hardcodedArrivedQuantity = hardcodedTotalQuantity;
      }
      
      return {
        project_id: project.id,
        project_name: project.project_name,
        total_quantity: hardcodedTotalQuantity,
        entry_quantity: project.entry_quantity,
        export_quantity: project.export_quantity,
        remain_quantity: project.remain_quantity,
        scheduled_entry_quantity: quantities.scheduled,
        completed_entry_quantity: quantities.completed,
        shipping_quantity: quantities.shipping,
        arrived_quantity: hardcodedArrivedQuantity,
        current_status: currentStatus,
        factory_shipping_status: project.factory_shipping_status,
        actual_factory_shipping_date: project.actual_factory_shipping_date,
        expected_factory_shipping_date: project.expected_factory_shipping_date,
        first_image: firstImage,
        created_at: project.created_at,
        updated_at: project.updated_at
      };
    }));
    
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
  const { scheduled, completed, shipping, arrived } = quantities;
  
  // 도착완료: is_arrived = true인 수량이 있는 경우
  if (arrived > 0) return '도착완료';
  
  // 배송중: is_arrived = false 또는 null인 수량이 있는 경우
  if (shipping > 0) return '배송중';
  
  // 입고완료: 입고 완료된 수량이 있는 경우
  if (completed > 0) return '입고완료';
  
  // 입고예정: quantity - entry_quantity > 0인 경우
  if (scheduled > 0) return '입고예정';
  
  // 기본 상태: 입고예정
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
