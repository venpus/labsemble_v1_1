const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');

// 최적화된 제품별 입출고 현황 조회 API
router.get('/product-inventory-status-optimized', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId, status, page = 1, limit = 20, search, sortBy = 'project_name', sortOrder = 'ASC' } = req.query;
    const offset = (page - 1) * limit;
    
    console.log('🚀 [inventory-optimized] 최적화된 재고 조회 요청:', {
      projectId, status, page, limit, search, sortBy, sortOrder,
      userId: req.user.id, isAdmin: req.user.isAdmin
    });
    
    // 1. 단일 쿼리로 모든 데이터 조회 (N+1 문제 해결)
    const query = `
      SELECT 
        p.id as project_id,
        p.project_name,
        p.quantity as total_quantity,
        p.entry_quantity,
        p.export_quantity,
        p.remain_quantity,
        p.factory_shipping_status,
        p.actual_factory_shipping_date,
        p.expected_factory_shipping_date,
        p.created_at,
        p.updated_at,
        
        -- 입고 예정 수량
        COALESCE(we_scheduled.total, 0) as scheduled_entry_quantity,
        
        -- 입고 완료 수량
        COALESCE(we_completed.total, 0) as completed_entry_quantity,
        
        -- 배송 중 수량
        COALESCE(pl_shipping.total, 0) as shipping_quantity,
        
        -- 도착 완료 수량
        COALESCE(pl_delivered.total, 0) as delivered_quantity,
        
        -- 첫 번째 이미지 정보
        img.id as image_id,
        img.file_name as image_filename,
        img.original_name as image_original_name,
        img.file_path as image_file_path,
        img.created_at as image_created_at
        
      FROM mj_project p
      
      -- 입고 예정 수량 (LEFT JOIN)
      LEFT JOIN (
        SELECT project_id, SUM(quantity) as total
        FROM warehouse_entries 
        WHERE status = '입고중' AND deleted_at IS NULL
        GROUP BY project_id
      ) we_scheduled ON p.id = we_scheduled.project_id
      
      -- 입고 완료 수량 (LEFT JOIN)
      LEFT JOIN (
        SELECT project_id, SUM(quantity) as total
        FROM warehouse_entries 
        WHERE status = '입고완료' AND deleted_at IS NULL
        GROUP BY project_id
      ) we_completed ON p.id = we_completed.project_id
      
      -- 배송 중 수량 (LEFT JOIN)
      LEFT JOIN (
        SELECT mpl.project_id, SUM(mpl.box_count * mpl.packaging_count * mpl.packaging_method) as total
        FROM mj_packing_list mpl
        LEFT JOIN logistic_payment lp ON mpl.id = lp.mj_packing_list_id
        WHERE mpl.deleted_at IS NULL 
          AND (lp.id IS NULL OR lp.is_paid = false)
        GROUP BY mpl.project_id
      ) pl_shipping ON p.id = pl_shipping.project_id
      
      -- 도착 완료 수량 (LEFT JOIN)
      LEFT JOIN (
        SELECT mpl.project_id, SUM(mpl.box_count * mpl.packaging_count * mpl.packaging_method) as total
        FROM mj_packing_list mpl
        JOIN logistic_payment lp ON mpl.id = lp.mj_packing_list_id
        WHERE mpl.deleted_at IS NULL AND lp.is_paid = true
        GROUP BY mpl.project_id
      ) pl_delivered ON p.id = pl_delivered.project_id
      
      -- 첫 번째 이미지 (LEFT JOIN)
      LEFT JOIN (
        SELECT project_id, id, file_name, original_name, file_path, created_at,
               ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC) as rn
        FROM mj_project_images
      ) img ON p.id = img.project_id AND img.rn = 1
      
      WHERE p.deleted_at IS NULL
    `;
    
    const params = [];
    let whereConditions = [];
    
    // 권한에 따른 필터링
    if (!req.user.isAdmin) {
      whereConditions.push('p.user_id = ?');
      params.push(req.user.id);
    }
    
    // 프로젝트 ID 필터
    if (projectId) {
      whereConditions.push('p.id = ?');
      params.push(projectId);
    }
    
    // 검색 필터
    if (search) {
      whereConditions.push('p.project_name LIKE ?');
      params.push(`%${search}%`);
    }
    
    // WHERE 조건 추가
    const finalQuery = whereConditions.length > 0 
      ? `${query} AND ${whereConditions.join(' AND ')}`
      : query;
    
    // 정렬 및 페이지네이션
    const validSortColumns = ['project_name', 'total_quantity', 'scheduled_entry_quantity', 'completed_entry_quantity', 'shipping_quantity', 'delivered_quantity', 'created_at'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'project_name';
    const sortDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    const paginatedQuery = `${finalQuery} ORDER BY ${sortColumn} ${sortDirection} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('📊 [inventory-optimized] 실행할 쿼리:', paginatedQuery);
    console.log('📊 [inventory-optimized] 파라미터:', params);
    
    const [inventoryData] = await connection.execute(paginatedQuery, params);
    
    // 2. 전체 개수 조회 (페이지네이션용)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mj_project p
      WHERE p.deleted_at IS NULL
      ${whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : ''}
    `;
    
    const [countResult] = await connection.execute(countQuery, params.slice(0, -2)); // LIMIT, OFFSET 제외
    const totalCount = countResult[0].total;
    const totalPages = Math.ceil(totalCount / limit);
    
    // 3. 상태 계산 및 응답 데이터 구성
    const processedData = inventoryData.map(item => {
      const currentStatus = calculateCurrentStatus(item, {
        scheduled: item.scheduled_entry_quantity,
        completed: item.completed_entry_quantity,
        shipping: item.shipping_quantity,
        delivered: item.delivered_quantity
      });
      
      return {
        project_id: item.project_id,
        project_name: item.project_name,
        total_quantity: parseInt(item.total_quantity) || 0,
        entry_quantity: parseInt(item.entry_quantity) || 0,
        export_quantity: parseInt(item.export_quantity) || 0,
        remain_quantity: parseInt(item.remain_quantity) || 0,
        scheduled_entry_quantity: parseInt(item.scheduled_entry_quantity) || 0,
        completed_entry_quantity: parseInt(item.completed_entry_quantity) || 0,
        shipping_quantity: parseInt(item.shipping_quantity) || 0,
        delivered_quantity: parseInt(item.delivered_quantity) || 0,
        current_status: currentStatus,
        factory_shipping_status: item.factory_shipping_status,
        actual_factory_shipping_date: item.actual_factory_shipping_date,
        expected_factory_shipping_date: item.expected_factory_shipping_date,
        created_at: item.created_at,
        updated_at: item.updated_at,
        // 이미지 정보
        first_image: item.image_id ? {
          id: item.image_id,
          original_filename: item.image_original_name,
          stored_filename: item.image_filename,
          file_path: item.image_file_path,
          created_at: item.image_created_at,
          url: `/api/warehouse/image/${item.image_filename}`,
          thumbnail_url: `/api/warehouse/image/${item.image_filename}`
        } : null
      };
    });
    
    console.log(`✅ [inventory-optimized] ${processedData.length}개 프로젝트 조회 완료 (총 ${totalCount}개, 페이지 ${page}/${totalPages})`);
    
    res.json({
      success: true,
      data: processedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('❌ [inventory-optimized] 오류:', error);
    res.status(500).json({
      success: false,
      error: '재고 조회 중 오류가 발생했습니다.'
    });
  } finally {
    connection.release();
  }
});

// 상태 계산 함수
function calculateCurrentStatus(project, quantities) {
  const { scheduled, completed, shipping, delivered } = quantities;
  
  if (delivered > 0) return '도착완료';
  if (shipping > 0) return '배송중';
  if (completed > 0) return '입고완료';
  if (scheduled > 0) return '입고중';
  return '입고예정';
}

module.exports = router;
