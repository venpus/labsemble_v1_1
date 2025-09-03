const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

// 패킹리스트 자동 저장 (포커스 아웃 시)
router.post('/auto-save', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
        const { 
      packing_code, 
      box_count, 
      pl_date,
      logistic_company,
      product_name, 
      product_sku, 
      product_image, 
      packaging_method, 
      packaging_count, 
      quantity_per_box,
      force_insert = false,
      client_product_id,
      project_id
    } = req.body;

    // 자동 저장 요청 데이터 처리

    // 필수 필드 검증
    if (!packing_code || !product_name) {
      return res.status(400).json({ 
        error: '포장코드와 상품명은 필수입니다.' 
      });
    }

    // force_insert가 true이면 무조건 새 데이터 삽입
    if (force_insert) {
      // 강제 삽입 모드: 새 데이터 삽입
      
      const insertQuery = `INSERT INTO mj_packing_list (
         packing_code, box_count, pl_date, logistic_company, product_name, product_sku, 
         product_image, packaging_method, packaging_count, quantity_per_box, client_product_id, project_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const insertValues = [
        packing_code,
        box_count || 0,
        pl_date || null,
        logistic_company || null,
        product_name,
        product_sku || null,
        product_image || null,
        packaging_method || 0,
        packaging_count || 0,
        quantity_per_box || 0,
        client_product_id || null,
        project_id || null
      ];
      
      const [insertResult] = await connection.execute(insertQuery, insertValues);
      
      const result = {
        success: true,
        message: '새 상품이 추가되었습니다.',
        id: insertResult.insertId,
        action: 'inserted',
        forceInsert: true,
        newProductName: product_name
      };
      
      // 강제 삽입 완료
      return res.json(result);
    }

    // client_product_id가 있으면 해당 ID로 정확한 상품 검색
    let existingRows = [];
    if (client_product_id) {
      const [rows] = await connection.execute(
        `SELECT id, product_name FROM mj_packing_list 
         WHERE client_product_id = ?`,
        [client_product_id]
      );
      existingRows = rows;
      
      // client_product_id로 정확한 상품 검색
    } else {
      // client_product_id가 없으면 포장코드로 검색 (하위 호환성)
      const [rows] = await connection.execute(
        `SELECT id, product_name FROM mj_packing_list 
         WHERE packing_code = ?`,
        [packing_code]
      );
      existingRows = rows;
      
      // 포장코드로 검색 (하위 호환성)
    }

    let result;
    if (existingRows.length > 0) {
      // 기존 데이터가 있으면 첫 번째 항목을 업데이트 (상품명 변경 고려)
      const existingId = existingRows[0].id;
      const oldProductName = existingRows[0].product_name;
      
      // 기존 데이터 업데이트
      
      const [updateResult] = await connection.execute(
        `UPDATE mj_packing_list SET
         box_count = ?,
         pl_date = ?,
         logistic_company = ?,
         product_name = ?,
         product_sku = ?,
         product_image = ?,
         packaging_method = ?,
         packaging_count = ?,
         quantity_per_box = ?,
         project_id = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          box_count || 0,
          pl_date || null,
          logistic_company || null,
          product_name,
          product_sku || null,
          product_image || null,
          packaging_method || 0,
          packaging_count || 0,
          quantity_per_box || 0,
          project_id || null,
          existingId
        ]
      );
      
      result = {
        success: true,
        message: '패킹리스트가 업데이트되었습니다.',
        id: existingId,
        action: 'updated',
        oldProductName,
        newProductName: product_name
      };
    } else {
      // 새 데이터 삽입
      // 새 데이터 삽입
      
      const [insertResult] = await connection.execute(
        `INSERT INTO mj_packing_list (
         packing_code, box_count, pl_date, logistic_company, product_name, product_sku, 
         product_image, packaging_method, packaging_count, quantity_per_box, client_product_id, project_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          packing_code,
          box_count || 0,
          pl_date || null,
          logistic_company || null,
          product_name,
          product_sku || null,
          product_image || null,
          packaging_method || 0,
          packaging_count || 0,
          quantity_per_box || 0,
          client_product_id || null,
          project_id || null
        ]
      );
      
      result = {
        success: true,
        message: '패킹리스트가 저장되었습니다.',
        id: insertResult.insertId,
        action: 'inserted',
        newProductName: product_name
      };
    }

    res.json(result);
    
  } catch (error) {
    console.error('패킹리스트 자동 저장 오류:', error);
    res.status(500).json({ 
      error: '패킹리스트 저장 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 패킹리스트 조회 (포장코드별)
router.get('/by-packing-code/:packingCode', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { packingCode } = req.params;
    
    const [rows] = await connection.execute(
      `SELECT * FROM mj_packing_list 
       WHERE packing_code = ? 
       ORDER BY created_at DESC`,
      [packingCode]
    );
    
    res.json({
      success: true,
      data: rows,
      total: rows.length
    });
    
  } catch (error) {
    console.error('패킹리스트 조회 오류:', error);
    res.status(500).json({ 
      error: '패킹리스트 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 패킹리스트 전체 조회
router.get('/', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [rows] = await connection.execute(
      `SELECT * FROM mj_packing_list 
       ORDER BY created_at DESC`
    );
    
    res.json({
      success: true,
      data: rows,
      total: rows.length
    });
    
  } catch (error) {
    console.error('패킹리스트 전체 조회 오류:', error);
    res.status(500).json({ 
      error: '패킹리스트 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 패킹리스트 개별 삭제 (ID별)
router.delete('/:id', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    const [result] = await connection.execute(
      'DELETE FROM mj_packing_list WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: '해당 패킹리스트를 찾을 수 없습니다.' 
      });
    }
    
    res.json({
      success: true,
      message: '패킹리스트가 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('패킹리스트 삭제 오류:', error);
    res.status(500).json({ 
      error: '패킹리스트 삭제 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 패킹리스트 포장코드별 전체 삭제
router.delete('/packing-code/:packingCode', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { packingCode } = req.params;
    // 포장코드별 전체 삭제
    
    // 삭제 전 데이터 확인
    const [checkRows] = await connection.execute(
      `SELECT COUNT(*) as count FROM mj_packing_list WHERE packing_code = ?`,
      [packingCode]
    );
    
    if (checkRows[0].count === 0) {
      connection.release();
      return res.status(404).json({ 
        success: false, 
        message: '삭제할 포장코드의 패킹리스트를 찾을 수 없습니다.' 
      });
    }
    
    // 해당 포장코드의 모든 데이터 삭제
    const [deleteResult] = await connection.execute(
      `DELETE FROM mj_packing_list WHERE packing_code = ?`,
      [packingCode]
    );
    
    connection.release();
    
    // 포장코드별 전체 삭제 성공
    res.json({ 
      success: true, 
      message: `포장코드 ${packingCode}의 모든 패킹리스트가 삭제되었습니다.`,
      deletedCount: deleteResult.affectedRows
    });
    
  } catch (error) {
    console.error('포장코드별 전체 삭제 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '패킹리스트 삭제 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 패킹리스트 전체 저장 시 mj_project export_quantity 업데이트 (기존 방식)
router.post('/update-project-export-quantity', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId, exportQuantity } = req.body;
    
    // 프로젝트 출고 수량 업데이트 요청

    // 필수 필드 검증
    if (!projectId || exportQuantity === undefined) {
      return res.status(400).json({ 
        error: '프로젝트 ID와 출고 수량은 필수입니다.' 
      });
    }

    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT id, project_name, export_quantity FROM mj_project WHERE id = ?',
      [projectId]
    );

    if (project.length === 0) {
      return res.status(404).json({ 
        error: '프로젝트를 찾을 수 없습니다.' 
      });
    }

    const currentProject = project[0];
    const currentExportQuantity = currentProject.export_quantity || 0;
    const newExportQuantity = currentExportQuantity + exportQuantity;

    // 수량 계산

    // export_quantity 업데이트
    await connection.execute(
      'UPDATE mj_project SET export_quantity = ?, updated_at = NOW() WHERE id = ?',
      [newExportQuantity, projectId]
    );

    // remain_quantity도 함께 업데이트 (entry_quantity - export_quantity)
    await connection.execute(
      'UPDATE mj_project SET remain_quantity = entry_quantity - export_quantity WHERE id = ?',
      [projectId]
    );

    // 프로젝트 export_quantity 업데이트 완료

    res.json({
      success: true,
      message: '프로젝트 출고 수량이 업데이트되었습니다.',
      projectId,
      oldExportQuantity: currentExportQuantity,
      newExportQuantity,
      remainQuantity: newExportQuantity
    });

  } catch (error) {
    console.error('프로젝트 출고 수량 업데이트 오류:', error);
    res.status(500).json({ 
      error: '프로젝트 출고 수량 업데이트 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 패킹리스트 전체 저장 시 mj_packing_list 기반으로 프로젝트 export_quantity 계산 및 업데이트
router.post('/calculate-project-export-quantity', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId } = req.body;
    
    // 프로젝트 출고 수량 계산 요청

    // 필수 필드 검증
    if (!projectId) {
      return res.status(400).json({ 
        error: '프로젝트 ID는 필수입니다.' 
      });
    }

    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT id, project_name, export_quantity, entry_quantity FROM mj_project WHERE id = ?',
      [projectId]
    );

    if (project.length === 0) {
      return res.status(404).json({ 
        error: '프로젝트를 찾을 수 없습니다.' 
      });
    }

    const currentProject = project[0];
    const currentExportQuantity = currentProject.export_quantity || 0;

    // mj_packing_list에서 같은 project_id를 가진 데이터들의 박스수 × 포장수 × 소포장수 합산 계산
    // 각 물품별로 개별 계산하여 정확한 export_quantity 산출
    const [packingListData] = await connection.execute(`
      SELECT 
        id,
        packing_code,
        product_name,
        product_sku,
        client_product_id,
        box_count,
        packaging_count,
        packaging_method,
        (box_count * packaging_count * packaging_method) as calculated_export_quantity
      FROM mj_packing_list 
      WHERE project_id = ? 
        AND box_count > 0 
        AND packaging_count > 0 
        AND packaging_method > 0
      ORDER BY packing_code, product_name, id
    `, [projectId]);

    // 문자열을 숫자로 변환하여 계산하고 각 물품별로 개별 처리
    const processedPackingListData = packingListData.map(item => ({
      id: item.id,
      packing_code: item.packing_code,
      product_name: item.product_name,
      product_sku: item.product_sku,
      client_product_id: item.client_product_id,
      box_count: parseInt(item.box_count) || 0,
      packaging_count: parseInt(item.packaging_count) || 0,
      packaging_method: parseInt(item.packaging_method) || 0,
      calculated_export_quantity: parseInt(item.calculated_export_quantity) || 0
    }));

    // 각 물품별로 개별 계산하여 총 export_quantity 산출
    // 하나의 포장코드에 여러 물품이 있어도 각각 개별적으로 계산
    const totalExportQuantity = processedPackingListData.reduce((sum, item) => {
      const itemQuantity = item.calculated_export_quantity || 0;
      console.log(`📦 [export_quantity 계산] 물품별 개별 계산:`, {
        packingCode: item.packing_code,
        productName: item.product_name,
        clientProductId: item.client_product_id,
        boxCount: item.box_count,
        packagingCount: item.packaging_count,
        packagingMethod: item.packaging_method,
        calculatedQuantity: itemQuantity,
        runningTotal: sum + itemQuantity
      });
      return sum + itemQuantity;
    }, 0);

    // 총 export_quantity 계산

    // 제약조건 검증: export_quantity가 entry_quantity를 초과하지 않는지 확인
    if (totalExportQuantity > currentProject.entry_quantity) {
      // 제약조건 위반: 출고 수량이 입고 수량을 초과

      return res.status(400).json({
        success: false,
        error: '출고 수량이 입고 수량을 초과할 수 없습니다.',
        details: {
          projectId,
          projectName: currentProject.project_name,
          calculatedExportQuantity: totalExportQuantity,
          entryQuantity: currentProject.entry_quantity,
          exceedAmount: totalExportQuantity - currentProject.entry_quantity
        }
      });
    }

    // 제약조건 검증: export_quantity가 음수가 아닌지 확인
    if (totalExportQuantity < 0) {
      // 제약조건 위반: 음수 export_quantity

      return res.status(400).json({
        success: false,
        error: '출고 수량은 음수가 될 수 없습니다.',
        details: {
          projectId,
          projectName: currentProject.project_name,
          calculatedExportQuantity: totalExportQuantity
        }
      });
    }

    try {
      // export_quantity 업데이트
      await connection.execute(
        'UPDATE mj_project SET export_quantity = ?, updated_at = NOW() WHERE id = ?',
        [totalExportQuantity, projectId]
      );

      // remain_quantity도 함께 업데이트 (entry_quantity - export_quantity)
      await connection.execute(
        'UPDATE mj_project SET remain_quantity = entry_quantity - export_quantity WHERE id = ?',
        [projectId]
      );

      // 프로젝트 export_quantity 업데이트 완료

      console.log(`✅ [export_quantity 계산 완료] 프로젝트 ${projectId}의 총 export_quantity:`, {
        oldExportQuantity: currentExportQuantity,
        newExportQuantity: totalExportQuantity,
        remainQuantity: currentProject.entry_quantity - totalExportQuantity,
        totalItems: processedPackingListData.length,
        entryQuantity: currentProject.entry_quantity
      });

      res.json({
        success: true,
        message: '프로젝트 출고 수량이 mj_packing_list 기반으로 각 물품별 개별 계산되어 업데이트되었습니다.',
        projectId,
        oldExportQuantity: currentExportQuantity,
        newExportQuantity: totalExportQuantity,
        remainQuantity: currentProject.entry_quantity - totalExportQuantity,
        packingListCount: processedPackingListData.length,
        calculationDetails: processedPackingListData.map(item => ({
          id: item.id,
          packingCode: item.packing_code,
          productName: item.product_name,
          productSku: item.product_sku,
          clientProductId: item.client_product_id,
          boxCount: item.box_count,
          packagingCount: item.packaging_count,
          packagingMethod: item.packaging_method,
          calculatedQuantity: item.calculated_export_quantity
        }))
      });

    } catch (updateError) {
      console.error('프로젝트 출고 수량 업데이트 오류:', updateError);
      
      // 제약조건 위반 오류인지 확인
      if (updateError.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || 
          updateError.sqlMessage?.includes('CONSTRAINT') ||
          updateError.errno === 4025) {
        
        return res.status(400).json({
          success: false,
          error: '데이터베이스 제약조건 위반으로 업데이트할 수 없습니다.',
          details: {
            projectId,
            projectName: currentProject.project_name,
            calculatedExportQuantity: totalExportQuantity,
            entryQuantity: currentProject.entry_quantity,
            constraintError: updateError.message
          }
        });
      }
      
      throw updateError; // 다른 오류는 상위로 전파
    }

  } catch (error) {
    console.error('프로젝트 출고 수량 계산 오류:', error);
    res.status(500).json({ 
      error: '프로젝트 출고 수량 계산 및 업데이트 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 날짜별 패킹리스트 조회
router.get('/by-date/:date', auth, async (req, res) => {
  const connection = await pool.getConnection();
  const { date } = req.params;
  
  try {
    // 날짜별 패킹리스트 조회
    
    let query, params;
    
    if (date === 'no-date') {
      // 날짜가 지정되지 않은 경우
      query = `SELECT * FROM mj_packing_list 
               WHERE pl_date IS NULL OR pl_date = '' OR pl_date = 'no-date'
               ORDER BY created_at DESC`;
      params = [];
    } else {
      // 특정 날짜의 데이터 조회 (DATE 함수로 날짜 부분만 비교)
      query = `SELECT * FROM mj_packing_list 
               WHERE DATE(pl_date) = DATE(?)
               ORDER BY created_at DESC`;
      params = [date];
    }
    
    const [rows] = await connection.execute(query, params);
    
    res.json({
      success: true,
      data: rows,
      total: rows.length,
      date: date
    });
    
  } catch (error) {
    console.error('날짜별 패킹리스트 조회 오류:', error);
    res.status(500).json({ 
      error: '날짜별 패킹리스트 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 패킹리스트 개별 삭제 (ID별)
router.delete('/:id', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    const [result] = await connection.execute(
      'DELETE FROM mj_packing_list WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: '해당 패킹리스트를 찾을 수 없습니다.' 
      });
    }
    
    res.json({
      success: true,
      message: '패킹리스트가 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('패킹리스트 삭제 오류:', error);
    res.status(500).json({ 
      error: '패킹리스트 삭제 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

module.exports = router; 