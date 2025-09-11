const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

// 잔금 지급일 자동 설정 함수
async function updateBalanceDueDate(connection, projectId, plDate) {
  if (!projectId || !plDate) {
    return; // project_id나 pl_date가 없으면 처리하지 않음
  }

  try {
    // pl_date + 3일 계산
    const newBalanceDueDate = new Date(plDate);
    newBalanceDueDate.setDate(newBalanceDueDate.getDate() + 3);
    const formattedNewDate = newBalanceDueDate.toISOString().split('T')[0];

    // 현재 프로젝트의 balance_due_date 조회
    const [projectRows] = await connection.execute(
      'SELECT balance_due_date FROM mj_project WHERE id = ?',
      [projectId]
    );

    if (projectRows.length === 0) {
      return; // 프로젝트가 존재하지 않으면 처리하지 않음
    }

    const currentBalanceDueDate = projectRows[0].balance_due_date;

    let shouldUpdate = false;
    let finalBalanceDueDate = null;

    if (currentBalanceDueDate === null) {
      // 조건 1: 잔금 지급일이 null이면 pl_date + 3일로 설정
      shouldUpdate = true;
      finalBalanceDueDate = formattedNewDate;
    } else {
      // 조건 2: 잔금 지급일이 있으면 비교
      const currentDate = new Date(currentBalanceDueDate);
      const newDate = new Date(formattedNewDate);
      
      if (newDate < currentDate) {
        // pl_date + 3일이 더 이른 날짜면 업데이트
        shouldUpdate = true;
        finalBalanceDueDate = formattedNewDate;
      }
      // 그렇지 않으면 기존 데이터 유지 (업데이트하지 않음)
    }

    if (shouldUpdate) {
      // 1. mj_project 테이블의 balance_due_date 업데이트
      await connection.execute(
        'UPDATE mj_project SET balance_due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [finalBalanceDueDate, projectId]
      );

      // 2. mj_project 테이블의 payment_due_dates JSON 업데이트
      const [currentPaymentDueDates] = await connection.execute(
        'SELECT payment_due_dates FROM mj_project WHERE id = ?',
        [projectId]
      );

      let updatedPaymentDueDates = {};
      if (currentPaymentDueDates[0]?.payment_due_dates) {
        try {
          updatedPaymentDueDates = JSON.parse(currentPaymentDueDates[0].payment_due_dates);
        } catch (error) {
          console.log('기존 payment_due_dates JSON 파싱 오류, 빈 객체로 초기화');
          updatedPaymentDueDates = {};
        }
      }

      // balance 필드 업데이트
      updatedPaymentDueDates.balance = finalBalanceDueDate;

      await connection.execute(
        'UPDATE mj_project SET payment_due_dates = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(updatedPaymentDueDates), projectId]
      );

      // 3. mj_project_payments 테이블의 payment_dates JSON 업데이트
      const [currentPaymentDates] = await connection.execute(
        'SELECT payment_dates FROM mj_project_payments WHERE project_id = ?',
        [projectId]
      );

      if (currentPaymentDates.length > 0) {
        let updatedPaymentDates = {};
        if (currentPaymentDates[0]?.payment_dates) {
          try {
            updatedPaymentDates = JSON.parse(currentPaymentDates[0].payment_dates);
          } catch (error) {
            console.log('기존 payment_dates JSON 파싱 오류, 빈 객체로 초기화');
            updatedPaymentDates = {};
          }
        }

        // balance 필드 업데이트
        updatedPaymentDates.balance = finalBalanceDueDate;

        await connection.execute(
          'UPDATE mj_project_payments SET payment_dates = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?',
          [JSON.stringify(updatedPaymentDates), projectId]
        );
      }
      
      // 상세한 로그 출력
      console.log('='.repeat(60));
      console.log('📅 잔금 지급일 자동 업데이트');
      console.log('='.repeat(60));
      console.log(`프로젝트 ID: ${projectId}`);
      console.log(`패킹 날짜 (pl_date): ${plDate}`);
      console.log(`계산된 잔금 지급일: ${finalBalanceDueDate} (pl_date + 3일)`);
      console.log(`기존 잔금 지급일: ${currentBalanceDueDate || 'null'}`);
      console.log(`업데이트된 payment_due_dates: ${JSON.stringify(updatedPaymentDueDates)}`);
      console.log(`업데이트 시간: ${new Date().toISOString()}`);
      console.log('='.repeat(60));
    } else {
      // 업데이트하지 않은 경우에도 로그 출력
      console.log('='.repeat(60));
      console.log('ℹ️ 잔금 지급일 업데이트 건너뜀');
      console.log('='.repeat(60));
      console.log(`프로젝트 ID: ${projectId}`);
      console.log(`패킹 날짜 (pl_date): ${plDate}`);
      console.log(`계산된 잔금 지급일: ${formattedNewDate} (pl_date + 3일)`);
      console.log(`기존 잔금 지급일: ${currentBalanceDueDate}`);
      console.log(`사유: pl_date + 3일이 기존 날짜보다 늦거나 동일함`);
      console.log('='.repeat(60));
    }

  } catch (error) {
    console.error('='.repeat(60));
    console.error('❌ 잔금 지급일 업데이트 오류');
    console.error('='.repeat(60));
    console.error(`프로젝트 ID: ${projectId}`);
    console.error(`패킹 날짜 (pl_date): ${plDate}`);
    console.error(`오류 메시지: ${error.message}`);
    console.error(`오류 스택: ${error.stack}`);
    console.error('='.repeat(60));
    // 오류가 발생해도 패킹리스트 저장은 계속 진행
  }
}

// 물류달력 이벤트 조회
router.get('/calendar/logistics-events', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const query = `
      SELECT 
        pl.id,
        pl.packing_code,
        pl.product_name,
        pl.product_sku,
        pl.product_image,
        pl.box_count,
        pl.packaging_method,
        pl.packaging_count,
        pl.quantity_per_box,
        pl.pl_date,
        pl.logistic_company,
        pl.project_id,
        pl.client_product_id,
        pl.created_at,
        pl.updated_at,
        p.project_name
      FROM mj_packing_list pl
      LEFT JOIN mj_project p ON pl.project_id = p.id
      WHERE pl.pl_date IS NOT NULL
      ORDER BY pl.pl_date DESC, pl.created_at DESC
    `;
    
    const [rows] = await connection.execute(query);
    
    res.json({
      success: true,
      data: rows,
      message: '물류달력 이벤트 조회 성공'
    });
    
  } catch (error) {
    console.error('물류달력 이벤트 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '물류달력 이벤트 조회 실패',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

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

      // 잔금 지급일 자동 설정 (강제 삽입 시)
      if (project_id && pl_date) {
        console.log(`🔄 패킹리스트 강제 삽입 - 잔금 지급일 자동 설정 시작 (프로젝트 ID: ${project_id}, pl_date: ${pl_date})`);
        await updateBalanceDueDate(connection, project_id, pl_date);
      }
      
      // 강제 삽입 완료
      return res.json(result);
    }

    // client_product_id가 있으면 해당 ID로 정확한 상품 검색
    let existingRows = [];
    if (client_product_id) {
      const [rows] = await connection.execute(
        `SELECT id, product_name FROM mj_packing_list 
         WHERE client_product_id = ? AND pl_date = ?`,
        [client_product_id, pl_date]
      );
      existingRows = rows;
      
      // client_product_id와 pl_date 조합으로 정확한 상품 검색
    } else {
      // client_product_id가 없으면 packing_code와 pl_date 조합으로 검색
      const [rows] = await connection.execute(
        `SELECT id, product_name FROM mj_packing_list 
         WHERE packing_code = ? AND pl_date = ?`,
        [packing_code, pl_date]
      );
      existingRows = rows;
      
      // packing_code와 pl_date 조합으로 검색
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

      // 잔금 지급일 자동 설정 (업데이트 시)
      if (project_id && pl_date) {
        console.log(`🔄 패킹리스트 업데이트 - 잔금 지급일 자동 설정 시작 (프로젝트 ID: ${project_id}, pl_date: ${pl_date})`);
        await updateBalanceDueDate(connection, project_id, pl_date);
      }
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

      // 잔금 지급일 자동 설정 (새로 삽입 시)
      if (project_id && pl_date) {
        console.log(`🔄 패킹리스트 새로 추가 - 잔금 지급일 자동 설정 시작 (프로젝트 ID: ${project_id}, pl_date: ${pl_date})`);
        await updateBalanceDueDate(connection, project_id, pl_date);
      }
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
    const { pl_date } = req.query; // pl_date 쿼리 파라미터 추가
    
    let query, params;
    
    if (pl_date) {
      // pl_date가 제공된 경우 packing_code와 pl_date 조합으로 검색 (삭제되지 않은 것만)
      query = `SELECT * FROM mj_packing_list 
               WHERE packing_code = ? AND pl_date = ? AND is_deleted = FALSE
               ORDER BY created_at DESC`;
      params = [packingCode, pl_date];
    } else {
      // pl_date가 없는 경우 packing_code만으로 검색 (하위 호환성, 삭제되지 않은 것만)
      query = `SELECT * FROM mj_packing_list 
               WHERE packing_code = ? AND is_deleted = FALSE
               ORDER BY created_at DESC`;
      params = [packingCode];
    }
    
    const [rows] = await connection.execute(query, params);
    
    res.json({
      success: true,
      data: rows,
      total: rows.length,
      packingCode,
      plDate: pl_date || null
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
      `SELECT 
        pl.*,
        p.project_name
       FROM mj_packing_list pl
       LEFT JOIN mj_project p ON pl.project_id = p.id
       WHERE pl.is_deleted = FALSE
       ORDER BY pl.created_at DESC`
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
    const { pl_date } = req.query; // pl_date 쿼리 파라미터 추가
    
    let checkQuery, deleteQuery, params;
    
    if (pl_date) {
      // pl_date가 제공된 경우 packing_code와 pl_date 조합으로 삭제
      checkQuery = `SELECT COUNT(*) as count FROM mj_packing_list WHERE packing_code = ? AND pl_date = ?`;
      deleteQuery = `DELETE FROM mj_packing_list WHERE packing_code = ? AND pl_date = ?`;
      params = [packingCode, pl_date];
    } else {
      // pl_date가 없는 경우 packing_code만으로 삭제 (하위 호환성)
      checkQuery = `SELECT COUNT(*) as count FROM mj_packing_list WHERE packing_code = ?`;
      deleteQuery = `DELETE FROM mj_packing_list WHERE packing_code = ?`;
      params = [packingCode];
    }
    
    // 삭제 전 데이터 확인
    const [checkRows] = await connection.execute(checkQuery, params);
    
    if (checkRows[0].count === 0) {
      connection.release();
      return res.status(404).json({ 
        success: false, 
        message: `삭제할 포장코드 ${packingCode}${pl_date ? ` (날짜: ${pl_date})` : ''}의 패킹리스트를 찾을 수 없습니다.` 
      });
    }
    
    // 해당 포장코드의 모든 데이터 삭제
    const [deleteResult] = await connection.execute(deleteQuery, params);
    
    connection.release();
    
    // 포장코드별 전체 삭제 성공
    res.json({ 
      success: true, 
      message: `포장코드 ${packingCode}${pl_date ? ` (날짜: ${pl_date})` : ''}의 모든 패킹리스트가 삭제되었습니다.`,
      deletedCount: deleteResult.affectedRows,
      packingCode,
      plDate: pl_date || null
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
  let connection;
  
  try {
    console.log(`🚀 [calculate-project-export-quantity] API 호출 시작:`, {
      projectId: req.body.projectId,
      timestamp: new Date().toISOString()
    });
    
    connection = await pool.getConnection();
    console.log(`✅ [calculate-project-export-quantity] 데이터베이스 연결 성공`);
    
    const { projectId } = req.body;
    
    // 프로젝트 출고 수량 계산 요청

    // 필수 필드 검증
    if (!projectId) {
      return res.status(400).json({ 
        error: '프로젝트 ID는 필수입니다.' 
      });
    }

    // 프로젝트 존재 여부 확인
    console.log(`🔍 [calculate-project-export-quantity] 프로젝트 조회 시작:`, { projectId });
    
    const [project] = await connection.execute(
      'SELECT id, project_name, export_quantity, entry_quantity FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    console.log(`🔍 [calculate-project-export-quantity] 프로젝트 조회 결과:`, {
      projectId,
      found: project.length > 0,
      projectData: project[0] || null,
      entryQuantity: project[0]?.entry_quantity,
      currentExportQuantity: project[0]?.export_quantity
    });

    if (project.length === 0) {
      return res.status(404).json({ 
        error: '프로젝트를 찾을 수 없습니다.' 
      });
    }

    const currentProject = project[0];
    const currentExportQuantity = currentProject.export_quantity || 0;

    // mj_packing_list에서 같은 project_id를 가진 데이터들의 박스수 × 포장수 × 소포장수 합산 계산
    // 각 물품별로 개별 계산하여 정확한 export_quantity 산출
    console.log(`🔍 [calculate-project-export-quantity] 패킹리스트 데이터 조회 시작:`, { projectId });
    
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
        AND is_deleted = FALSE
        AND box_count > 0 
        AND packaging_count > 0 
        AND packaging_method > 0
      ORDER BY packing_code, product_name, id
    `, [projectId]);
    
    console.log(`🔍 [calculate-project-export-quantity] 패킹리스트 데이터 조회 결과:`, {
      projectId,
      dataCount: packingListData.length,
      data: packingListData
    });

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
    // 각 제품은 고유한 client_product_id로 구분되어 개별적으로 계산
    let totalExportQuantity = 0;
    
    processedPackingListData.forEach((item, index) => {
      const itemQuantity = item.calculated_export_quantity || 0;
      const productIdentifier = item.client_product_id || `${item.product_name}_${item.product_sku}_${item.id}`;
      
      // 각 제품별로 독립적인 수량 계산 (runningTotal 없음)
      console.log(`📦 [export_quantity 계산] 제품별 개별 계산:`, {
        packingCode: item.packing_code,
        productName: item.product_name,
        productSku: item.product_sku,
        clientProductId: item.client_product_id,
        productIdentifier: productIdentifier,
        boxCount: item.box_count,
        packagingCount: item.packaging_count,
        packagingMethod: item.packaging_method,
        calculatedQuantity: itemQuantity,
        productIndex: index + 1,
        totalProducts: processedPackingListData.length
      });
      
      // 총 수량에 추가 (누적)
      totalExportQuantity += itemQuantity;
    });
    
    console.log(`📦 [export_quantity 계산] 최종 총 수량:`, {
      totalProducts: processedPackingListData.length,
      totalExportQuantity: totalExportQuantity
    });

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
      console.log(`🔄 [calculate-project-export-quantity] export_quantity 업데이트 시작:`, {
        projectId,
        totalExportQuantity,
        currentExportQuantity,
        entryQuantity: project[0].entry_quantity
      });
      
      // 입고 수량 검증
      if (totalExportQuantity > project[0].entry_quantity) {
        const errorMessage = `출고 수량(${totalExportQuantity.toLocaleString()})이 입고 수량(${project[0].entry_quantity.toLocaleString()})을 초과할 수 없습니다.`;
        console.error(`❌ [calculate-project-export-quantity] 수량 제약조건 위반:`, {
          projectId,
          totalExportQuantity,
          entryQuantity: project[0].entry_quantity,
          difference: totalExportQuantity - project[0].entry_quantity
        });
        
        res.status(400).json({
          success: false,
          error: errorMessage,
          details: {
            totalExportQuantity,
            entryQuantity: project[0].entry_quantity,
            difference: totalExportQuantity - project[0].entry_quantity,
            projectId
          }
        });
        return;
      }
      
      // export_quantity 업데이트
      const [updateResult1] = await connection.execute(
        'UPDATE mj_project SET export_quantity = ?, updated_at = NOW() WHERE id = ?',
        [totalExportQuantity, projectId]
      );
      
      console.log(`✅ [calculate-project-export-quantity] export_quantity 업데이트 완료:`, {
        projectId,
        affectedRows: updateResult1.affectedRows,
        totalExportQuantity
      });

      // remain_quantity도 함께 업데이트 (entry_quantity - export_quantity)
      const [updateResult2] = await connection.execute(
        'UPDATE mj_project SET remain_quantity = entry_quantity - export_quantity WHERE id = ?',
        [projectId]
      );
      
      console.log(`✅ [calculate-project-export-quantity] remain_quantity 업데이트 완료:`, {
        projectId,
        affectedRows: updateResult2.affectedRows
      });

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
          productIdentifier: item.client_product_id || `${item.product_name}_${item.product_sku}_${item.id}`,
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
    console.error('❌ [calculate-project-export-quantity] 프로젝트 출고 수량 계산 오류:', {
      error: error.message,
      stack: error.stack,
      projectId: req.body.projectId,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      success: false,
      error: '프로젝트 출고 수량 계산 및 업데이트 중 오류가 발생했습니다.',
      details: error.message,
      projectId: req.body.projectId
    });
  } finally {
    if (connection) {
      connection.release();
      console.log(`🔒 [calculate-project-export-quantity] 데이터베이스 연결 해제`);
    }
  }
});

// client_product_id로 개별 제품 소프트 삭제
router.delete('/product/:clientProductId', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { clientProductId } = req.params;
    
    console.log(`🗑️ [delete-product] 제품 삭제 시작:`, {
      clientProductId,
      timestamp: new Date().toISOString()
    });
    
    // 삭제할 제품 정보 조회 (프로젝트 ID 확인용)
    const [productInfo] = await connection.execute(
      `SELECT id, packing_code, product_name, project_id, 
              (box_count * packaging_count * packaging_method) as calculated_quantity
       FROM mj_packing_list 
       WHERE client_product_id = ?`,
      [clientProductId]
    );
    
    if (productInfo.length === 0) {
      console.log(`⚠️ [delete-product] 삭제할 제품을 찾을 수 없음:`, { clientProductId });
      return res.status(404).json({ 
        success: false,
        error: '삭제할 제품을 찾을 수 없습니다.' 
      });
    }
    
    const product = productInfo[0];
    console.log(`🔍 [delete-product] 삭제할 제품 정보:`, {
      clientProductId,
      packingCode: product.packing_code,
      productName: product.product_name,
      projectId: product.project_id,
      calculatedQuantity: product.calculated_quantity
    });
    
    // mj_packing_list에서 제품 소프트 삭제
    const [deleteResult] = await connection.execute(
      'UPDATE mj_packing_list SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = ? WHERE client_product_id = ?',
      [req.user ? req.user.id : 'unknown', clientProductId]
    );
    
    console.log(`✅ [delete-product] 제품 삭제 완료:`, {
      clientProductId,
      affectedRows: deleteResult.affectedRows,
      packingCode: product.packing_code
    });
    
    // 삭제 로그 기록
    try {
      const deleteLog = {
        action: 'DELETE_PRODUCT',
        clientProductId,
        packingCode: product.packing_code,
        productName: product.product_name,
        projectId: product.project_id,
        calculatedQuantity: product.calculated_quantity,
        deletedBy: req.user ? req.user.id : 'unknown',
        deletedAt: new Date().toISOString(),
        timestamp: Date.now()
      };
      
      console.log(`📝 [delete-product] 삭제 로그 기록:`, deleteLog);
      
      // 로그를 파일이나 데이터베이스에 저장할 수 있음
      // 현재는 콘솔에만 기록
      
    } catch (logError) {
      console.error(`❌ [delete-product] 삭제 로그 기록 오류:`, logError);
      // 로그 기록 실패해도 삭제는 성공으로 처리
    }
    
    // logistic_payment는 CASCADE로 자동 삭제됨
    
    // 프로젝트가 있는 경우 export_quantity 재계산
    if (product.project_id) {
      console.log(`🔄 [delete-product] 프로젝트 export_quantity 재계산 시작:`, {
        projectId: product.project_id
      });
      
      try {
        // 프로젝트 export_quantity 재계산
        const [project] = await connection.execute(
          'SELECT id, project_name, export_quantity, entry_quantity FROM mj_project WHERE id = ?',
          [product.project_id]
        );
        
        if (project.length > 0) {
          // 해당 프로젝트의 남은 패킹리스트 데이터 조회
          const [remainingPackingList] = await connection.execute(`
            SELECT 
              (box_count * packaging_count * packaging_method) as calculated_export_quantity
            FROM mj_packing_list 
            WHERE project_id = ? 
              AND is_deleted = FALSE
              AND box_count > 0 
              AND packaging_count > 0 
              AND packaging_method > 0
          `, [product.project_id]);
          
          // 새로운 export_quantity 계산
          const newExportQuantity = remainingPackingList.reduce((sum, item) => 
            sum + (item.calculated_export_quantity || 0), 0
          );
          
          console.log(`📊 [delete-product] export_quantity 재계산 결과:`, {
            projectId: product.project_id,
            oldExportQuantity: project[0].export_quantity,
            newExportQuantity,
            remainingItems: remainingPackingList.length
          });
          
          // export_quantity 업데이트
          await connection.execute(
            'UPDATE mj_project SET export_quantity = ?, updated_at = NOW() WHERE id = ?',
            [newExportQuantity, product.project_id]
          );
          
          // remain_quantity도 함께 업데이트
          await connection.execute(
            'UPDATE mj_project SET remain_quantity = entry_quantity - export_quantity WHERE id = ?',
            [product.project_id]
          );
          
          console.log(`✅ [delete-product] 프로젝트 export_quantity 업데이트 완료:`, {
            projectId: product.project_id,
            newExportQuantity
          });
        }
      } catch (recalcError) {
        console.error(`❌ [delete-product] 프로젝트 export_quantity 재계산 오류:`, {
          projectId: product.project_id,
          error: recalcError.message
        });
        // 재계산 실패해도 제품 삭제는 성공으로 처리
      }
    }
    
    res.json({
      success: true,
      message: '제품이 성공적으로 삭제되었습니다.',
      deletedProduct: {
        clientProductId,
        packingCode: product.packing_code,
        productName: product.product_name,
        projectId: product.project_id
      }
    });
    
  } catch (error) {
    console.error('❌ [delete-product] 제품 삭제 오류:', {
      clientProductId: req.params.clientProductId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      success: false,
      error: '제품 삭제 중 오류가 발생했습니다.',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

// client_product_id로 개별 제품 복구
router.post('/product/:clientProductId/restore', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { clientProductId } = req.params;
    
    console.log(`🔄 [restore-product] 제품 복구 시작:`, {
      clientProductId,
      timestamp: new Date().toISOString()
    });
    
    // 복구할 제품 정보 조회
    const [productInfo] = await connection.execute(
      `SELECT id, packing_code, product_name, project_id, is_deleted, deleted_at, deleted_by
       FROM mj_packing_list 
       WHERE client_product_id = ?`,
      [clientProductId]
    );
    
    if (productInfo.length === 0) {
      console.log(`⚠️ [restore-product] 복구할 제품을 찾을 수 없음:`, { clientProductId });
      return res.status(404).json({ 
        success: false,
        error: '복구할 제품을 찾을 수 없습니다.' 
      });
    }
    
    const product = productInfo[0];
    
    if (!product.is_deleted) {
      console.log(`⚠️ [restore-product] 제품이 이미 복구됨:`, { clientProductId });
      return res.status(400).json({ 
        success: false,
        error: '제품이 이미 복구되어 있습니다.' 
      });
    }
    
    console.log(`🔍 [restore-product] 복구할 제품 정보:`, {
      clientProductId,
      packingCode: product.packing_code,
      productName: product.product_name,
      projectId: product.project_id,
      deletedAt: product.deleted_at,
      deletedBy: product.deleted_by
    });
    
    // mj_packing_list에서 제품 복구
    const [restoreResult] = await connection.execute(
      'UPDATE mj_packing_list SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL WHERE client_product_id = ?',
      [clientProductId]
    );
    
    console.log(`✅ [restore-product] 제품 복구 완료:`, {
      clientProductId,
      affectedRows: restoreResult.affectedRows,
      packingCode: product.packing_code
    });
    
    // 프로젝트가 있는 경우 export_quantity 재계산
    if (product.project_id) {
      console.log(`🔄 [restore-product] 프로젝트 export_quantity 재계산 시작:`, {
        projectId: product.project_id
      });
      
      try {
        // 프로젝트 export_quantity 재계산
        const [project] = await connection.execute(
          'SELECT id, project_name, export_quantity, entry_quantity FROM mj_project WHERE id = ?',
          [product.project_id]
        );
        
        if (project.length > 0) {
          // 해당 프로젝트의 모든 패킹리스트 데이터 조회 (삭제되지 않은 것만)
          const [remainingPackingList] = await connection.execute(`
            SELECT 
              (box_count * packaging_count * packaging_method) as calculated_export_quantity
            FROM mj_packing_list 
            WHERE project_id = ? 
              AND is_deleted = FALSE
              AND box_count > 0 
              AND packaging_count > 0 
              AND packaging_method > 0
          `, [product.project_id]);
          
          // 새로운 export_quantity 계산
          const newExportQuantity = remainingPackingList.reduce((sum, item) => 
            sum + (item.calculated_export_quantity || 0), 0
          );
          
          console.log(`📊 [restore-product] export_quantity 재계산 결과:`, {
            projectId: product.project_id,
            oldExportQuantity: project[0].export_quantity,
            newExportQuantity,
            remainingItems: remainingPackingList.length
          });
          
          // export_quantity 업데이트
          await connection.execute(
            'UPDATE mj_project SET export_quantity = ?, updated_at = NOW() WHERE id = ?',
            [newExportQuantity, product.project_id]
          );
          
          // remain_quantity도 함께 업데이트
          await connection.execute(
            'UPDATE mj_project SET remain_quantity = entry_quantity - export_quantity WHERE id = ?',
            [product.project_id]
          );
          
          console.log(`✅ [restore-product] 프로젝트 export_quantity 업데이트 완료:`, {
            projectId: product.project_id,
            newExportQuantity
          });
        }
      } catch (recalcError) {
        console.error(`❌ [restore-product] 프로젝트 export_quantity 재계산 오류:`, {
          projectId: product.project_id,
          error: recalcError.message
        });
        // 재계산 실패해도 복구는 성공으로 처리
      }
    }
    
    res.json({
      success: true,
      message: '제품이 성공적으로 복구되었습니다.',
      restoredProduct: {
        clientProductId,
        packingCode: product.packing_code,
        productName: product.product_name,
        projectId: product.project_id
      }
    });
    
  } catch (error) {
    console.error('❌ [restore-product] 제품 복구 오류:', {
      clientProductId: req.params.clientProductId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      success: false,
      error: '제품 복구 중 오류가 발생했습니다.',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

// 삭제된 제품 목록 조회
router.get('/deleted-products', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const [deletedProducts] = await connection.execute(`
      SELECT 
        id,
        client_product_id,
        packing_code,
        product_name,
        product_sku,
        project_id,
        box_count,
        packaging_count,
        packaging_method,
        deleted_at,
        deleted_by,
        created_at
      FROM mj_packing_list 
      WHERE is_deleted = TRUE 
      ORDER BY deleted_at DESC
    `);
    
    res.json({
      success: true,
      data: deletedProducts,
      total: deletedProducts.length
    });
    
  } catch (error) {
    console.error('❌ [get-deleted-products] 삭제된 제품 조회 오류:', error);
    res.status(500).json({ 
      success: false,
      error: '삭제된 제품 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

// 날짜별 패킹리스트 삭제
router.delete('/by-date/:date', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { date } = req.params;
    const dateParam = date === 'no-date' ? null : date;
    
    console.log(`🗑️ [delete-by-date] 날짜별 패킹리스트 삭제 시작:`, {
      date,
      dateParam,
      timestamp: new Date().toISOString()
    });
    
    // 삭제할 데이터 조회 (프로젝트 ID 확인용)
    const [packingListData] = await connection.execute(
      `SELECT id, packing_code, product_name, project_id, 
              (box_count * packaging_count * packaging_method) as calculated_quantity
       FROM mj_packing_list 
       WHERE pl_date = ?`,
      [dateParam]
    );
    
    if (packingListData.length === 0) {
      console.log(`⚠️ [delete-by-date] 삭제할 데이터를 찾을 수 없음:`, { date, dateParam });
      return res.status(404).json({ 
        success: false,
        error: '삭제할 패킹리스트를 찾을 수 없습니다.' 
      });
    }
    
    console.log(`🔍 [delete-by-date] 삭제할 데이터 정보:`, {
      date,
      dataCount: packingListData.length,
      projects: [...new Set(packingListData.map(item => item.project_id).filter(Boolean))],
      packingCodes: [...new Set(packingListData.map(item => item.packing_code))]
    });
    
    // mj_packing_list에서 해당 날짜의 모든 데이터 삭제
    const [deleteResult] = await connection.execute(
      'DELETE FROM mj_packing_list WHERE pl_date = ?',
      [dateParam]
    );
    
    console.log(`✅ [delete-by-date] 패킹리스트 삭제 완료:`, {
      date,
      affectedRows: deleteResult.affectedRows
    });
    
    // 삭제 로그 기록
    try {
      const deleteLog = {
        action: 'DELETE_PACKING_LIST_BY_DATE',
        date: date,
        deletedCount: deleteResult.affectedRows,
        affectedProjects: affectedProjects,
        packingCodes: [...new Set(packingListData.map(item => item.packing_code))],
        deletedItems: packingListData.map(item => ({
          id: item.id,
          packing_code: item.packing_code,
          product_name: item.product_name,
          project_id: item.project_id,
          calculated_quantity: item.calculated_quantity
        })),
        deletedBy: req.user ? req.user.id : 'unknown',
        deletedAt: new Date().toISOString(),
        timestamp: Date.now()
      };
      
      console.log(`📝 [delete-by-date] 삭제 로그 기록:`, deleteLog);
      
      // 로그를 파일이나 데이터베이스에 저장할 수 있음
      // 현재는 콘솔에만 기록
      
    } catch (logError) {
      console.error(`❌ [delete-by-date] 삭제 로그 기록 오류:`, logError);
      // 로그 기록 실패해도 삭제는 성공으로 처리
    }
    
    // logistic_payment는 CASCADE로 자동 삭제됨
    
    // 삭제된 데이터에 포함된 프로젝트들의 export_quantity 재계산
    const affectedProjects = [...new Set(packingListData.map(item => item.project_id).filter(Boolean))];
    
    for (const projectId of affectedProjects) {
      console.log(`🔄 [delete-by-date] 프로젝트 export_quantity 재계산 시작:`, {
        projectId
      });
      
      try {
        // 프로젝트 export_quantity 재계산
        const [project] = await connection.execute(
          'SELECT id, project_name, export_quantity, entry_quantity FROM mj_project WHERE id = ?',
          [projectId]
        );
        
        if (project.length > 0) {
          // 해당 프로젝트의 남은 패킹리스트 데이터 조회
          const [remainingPackingList] = await connection.execute(`
            SELECT 
              (box_count * packaging_count * packaging_method) as calculated_export_quantity
            FROM mj_packing_list 
            WHERE project_id = ? 
              AND is_deleted = FALSE
              AND box_count > 0 
              AND packaging_count > 0 
              AND packaging_method > 0
          `, [projectId]);
          
          // 새로운 export_quantity 계산
          const newExportQuantity = remainingPackingList.reduce((sum, item) => 
            sum + (item.calculated_export_quantity || 0), 0
          );
          
          console.log(`📊 [delete-by-date] export_quantity 재계산 결과:`, {
            projectId,
            oldExportQuantity: project[0].export_quantity,
            newExportQuantity,
            remainingItems: remainingPackingList.length
          });
          
          // export_quantity 업데이트
          await connection.execute(
            'UPDATE mj_project SET export_quantity = ?, updated_at = NOW() WHERE id = ?',
            [newExportQuantity, projectId]
          );
          
          // remain_quantity도 함께 업데이트
          await connection.execute(
            'UPDATE mj_project SET remain_quantity = entry_quantity - export_quantity WHERE id = ?',
            [projectId]
          );
          
          console.log(`✅ [delete-by-date] 프로젝트 export_quantity 업데이트 완료:`, {
            projectId,
            newExportQuantity
          });
        }
      } catch (recalcError) {
        console.error(`❌ [delete-by-date] 프로젝트 export_quantity 재계산 오류:`, {
          projectId,
          error: recalcError.message
        });
        // 재계산 실패해도 삭제는 성공으로 처리
      }
    }
    
    res.json({
      success: true,
      message: `"${date}" 출고일자의 패킹리스트가 삭제되었습니다.`,
      deletedCount: deleteResult.affectedRows,
      affectedProjects: affectedProjects.length,
      date: date
    });
    
  } catch (error) {
    console.error('❌ [delete-by-date] 날짜별 패킹리스트 삭제 오류:', {
      date: req.params.date,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      success: false,
      error: '날짜별 패킹리스트 삭제 중 오류가 발생했습니다.',
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

// 월별 패킹리스트 조회 (캘린더용)
router.get('/by-month/:year/:month', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { year, month } = req.params;
    
    // 해당 월의 패킹리스트 조회
    const [rows] = await connection.execute(
      `SELECT 
        id,
        packing_code,
        product_name,
        box_count,
        logistic_company,
        pl_date,
        created_at
      FROM mj_packing_list 
      WHERE YEAR(pl_date) = ? AND MONTH(pl_date) = ?
      ORDER BY pl_date ASC, created_at ASC`,
      [year, month]
    );
    
    console.log('📅 [packing-list] 월별 조회 결과:', {
      year, month, count: rows.length
    });
    
    res.json({
      success: true,
      data: rows,
      total: rows.length,
      year: parseInt(year),
      month: parseInt(month)
    });
    
  } catch (error) {
    console.error('월별 패킹리스트 조회 오류:', error);
    res.status(500).json({ 
      error: '월별 패킹리스트 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 패킹리스트 달력용 데이터 조회 (Client 전용)
router.get('/calendar/events', auth, async (req, res) => {
  const connection = await pool.getConnection();
  const startTime = Date.now();
  
  try {
    
    // 패킹리스트 데이터 조회 (pl_date가 있는 것만) - logistic_payment와 JOIN
    const [packingLists] = await connection.execute(`
      SELECT 
        pl.id,
        pl.pl_date,
        pl.packing_code,
        pl.product_name,
        pl.box_count,
        pl.packaging_count,
        pl.packaging_method,
        pl.quantity_per_box,
        pl.logistic_company,
        pl.created_at,
        pl.updated_at,
        p.project_name,
        p.supplier_name,
        p.target_price,
        u.username as assignee,
        lp.logistic_fee as shipping_cost,
        lp.is_paid,
        lp.tracking_number,
        lp.box_no,
        lp.description as payment_description
      FROM mj_packing_list pl
      LEFT JOIN mj_project p ON pl.project_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN logistic_payment lp ON pl.id = lp.mj_packing_list_id
      WHERE pl.pl_date IS NOT NULL 
        AND pl.pl_date != '' 
        AND pl.pl_date != 'no-date'
        AND pl.is_deleted = FALSE
      ORDER BY pl.pl_date ASC, pl.packing_code ASC
    `);


    // 날짜별, 물류회사별로 그룹화하여 중복 제거
    const groupedData = {};
    
    packingLists.forEach(packing => {
      const key = `${packing.pl_date}_${packing.logistic_company || '미지정'}`;
      
      if (!groupedData[key]) {
        groupedData[key] = {
          date: packing.pl_date,
          logisticCompany: packing.logistic_company || '미지정',
          items: [],
          totalQuantity: 0,
          totalBoxCount: 0,
          totalShippingCost: 0,
          isPaid: false,
          packingCodes: [],
          projectNames: [],
          trackingNumbers: [],
          uniquePackingCodes: new Set() // 고유한 포장코드 추적용
        };
      }
      
      // 총 수량 계산 (박스수 × 포장수 × 소포장수)
      const totalQuantity = (packing.box_count || 0) * (packing.packaging_count || 0) * (packing.packaging_method || 0);
      
      groupedData[key].items.push(packing);
      groupedData[key].totalQuantity += totalQuantity;
      groupedData[key].totalShippingCost += (packing.shipping_cost || 0);
      groupedData[key].isPaid = groupedData[key].isPaid || (packing.is_paid === 1);
      groupedData[key].projectNames.push(packing.product_name || packing.project_name);
      if (packing.tracking_number) {
        groupedData[key].trackingNumbers.push(packing.tracking_number);
      }
      
      // 고유한 포장코드별로만 박스수 합산 (중복 제거)
      if (!groupedData[key].uniquePackingCodes.has(packing.packing_code)) {
        groupedData[key].uniquePackingCodes.add(packing.packing_code);
        groupedData[key].packingCodes.push(packing.packing_code);
        groupedData[key].totalBoxCount += (packing.box_count || 0);
      }
    });

    // 달력 이벤트 형식으로 변환 (그룹화된 데이터)
    const events = Object.values(groupedData).map((group, index) => {
      const uniqueProjectNames = [...new Set(group.projectNames)];
      const uniquePackingCodes = [...new Set(group.packingCodes)];
      const uniqueTrackingNumbers = [...new Set(group.trackingNumbers)];
      
      // 패킹리스트 건수 = 고유한 포장코드 수 (MJPackingList와 동일한 로직)
      const packingListCount = uniquePackingCodes.length;
      
      return {
        id: `logistics_${group.date}_${group.logisticCompany.replace(/\s+/g, '_')}`,
        title: `${group.logisticCompany} (${packingListCount}건)`,
        date: group.date,
        time: '09:00',
        location: group.logisticCompany,
        description: `포장코드: ${uniquePackingCodes.join(', ')}, 총수량: ${group.totalQuantity}개, 박스: ${group.totalBoxCount}개`,
        assignee: '담당자 미지정',
        productName: uniqueProjectNames.join(', '),
        quantity: group.totalQuantity,
        unit: '개',
        createdAt: group.items[0].created_at,
        updatedAt: group.items[0].updated_at,
        
        // 패킹리스트 전용 정보 (그룹화된 정보)
        eventType: 'packing_list',
        status: group.isPaid ? 'completed' : 'pending',
        packingCode: uniquePackingCodes.join(', '),
        boxCount: group.totalBoxCount,
        packagingCount: packingListCount, // 고유한 포장코드 수 = 패킹리스트 건수
        packagingMethod: group.items[0].packaging_method,
        quantityPerBox: group.items[0].quantity_per_box,
        logisticCompany: group.logisticCompany,
        shippingCost: group.totalShippingCost,
        isPaid: group.isPaid,
        projectName: uniqueProjectNames.join(', '),
        supplierName: group.items[0].supplier_name,
        targetPrice: group.items[0].target_price,
        
        // 물류 결제 정보
        trackingNumber: uniqueTrackingNumbers.join(', '),
        boxNo: group.totalBoxCount, // 총 박스 수 (고유한 포장코드별 박스수 합계)
        paymentDescription: group.items[0].payment_description,
        
        // 그룹화된 상세 정보
        groupInfo: {
          itemCount: packingListCount, // 패킹리스트 건수
          totalItems: group.items.length, // 전체 아이템 수 (중복 포함)
          packingCodes: uniquePackingCodes,
          projectNames: uniqueProjectNames,
          trackingNumbers: uniqueTrackingNumbers
        }
      };
    });

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: events,
      message: '패킹리스트 달력 데이터 조회 성공',
      processingTime: processingTime,
      summary: {
        totalEvents: events.length,
        paidEvents: events.filter(e => e.isPaid).length,
        unpaidEvents: events.filter(e => !e.isPaid).length
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`📦 [PackingList] 달력 데이터 조회 오류 (${processingTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: '패킹리스트 달력 데이터 조회 중 오류가 발생했습니다.',
      details: error.message,
      processingTime: processingTime
    });
  } finally {
    connection.release();
  }
});

// 물류 달력을 위한 패킹 리스트 이벤트 조회
router.get('/calendar/logistics-events', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const query = `
      SELECT 
        id,
        packing_code,
        product_name,
        product_sku,
        product_image,
        box_count,
        packaging_method,
        packaging_count,
        quantity_per_box,
        pl_date,
        logistic_company,
        project_id,
        created_at,
        updated_at
      FROM mj_packing_list 
      WHERE pl_date IS NOT NULL
      ORDER BY pl_date DESC, created_at DESC
    `;
    
    const [rows] = await connection.execute(query);
    
    res.json({
      success: true,
      data: rows,
      message: '물류 이벤트 조회 성공'
    });
    
  } catch (error) {
    console.error('물류 이벤트 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '물류 이벤트 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 패킹리스트 일괄 업데이트 (편집 페이지용)
router.put('/bulk-update', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { packingData, date } = req.body;
    
    if (!packingData || !Array.isArray(packingData)) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 데이터입니다.'
      });
    }

    console.log('📝 [bulk-update] 패킹리스트 일괄 업데이트 시작:', {
      date,
      totalGroups: packingData.length,
      timestamp: new Date().toISOString()
    });

    await connection.beginTransaction();

    // 기존 데이터 삭제 (해당 날짜의 모든 데이터)
    const dateParam = date === 'no-date' ? null : date;
    await connection.execute(
      'DELETE FROM mj_packing_list WHERE pl_date = ?',
      [dateParam]
    );

    // 새 데이터 삽입
    let insertedCount = 0;
    for (const group of packingData) {
      for (const product of group.products) {
        await connection.execute(`
          INSERT INTO mj_packing_list (
            packing_code, product_name, product_sku, client_product_id,
            box_count, packaging_method, packaging_count, quantity_per_box,
            pl_date, logistic_company, project_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          group.packing_code,
          product.product_name,
          product.product_sku,
          product.client_product_id,
          product.box_count,
          product.packaging_method,
          product.packaging_count,
          product.quantity_per_box,
          dateParam,
          group.logistic_company,
          product.project_id
        ]);
        insertedCount++;
      }
    }

    // 프로젝트 export_quantity 재계산
    const affectedProjects = [...new Set(
      packingData.flatMap(group => 
        group.products.map(product => product.project_id).filter(Boolean)
      )
    )];

    for (const projectId of affectedProjects) {
      console.log('🔄 [bulk-update] 프로젝트 export_quantity 재계산:', projectId);
      
      // 해당 프로젝트의 모든 패킹리스트 데이터 조회
      const [remainingPackingList] = await connection.execute(`
        SELECT 
          (box_count * packaging_count * packaging_method) as calculated_export_quantity
        FROM mj_packing_list 
        WHERE project_id = ? 
          AND is_deleted = FALSE
          AND box_count > 0 
          AND packaging_count > 0 
          AND packaging_method > 0
      `, [projectId]);
      
      // 새로운 export_quantity 계산
      const newExportQuantity = remainingPackingList.reduce((sum, item) => 
        sum + (item.calculated_export_quantity || 0), 0
      );
      
      // export_quantity 업데이트
      await connection.execute(
        'UPDATE mj_project SET export_quantity = ?, updated_at = NOW() WHERE id = ?',
        [newExportQuantity, projectId]
      );
      
      // remain_quantity도 함께 업데이트
      await connection.execute(
        'UPDATE mj_project SET remain_quantity = entry_quantity - export_quantity WHERE id = ?',
        [projectId]
      );
    }

    await connection.commit();

    console.log('✅ [bulk-update] 패킹리스트 일괄 업데이트 완료:', {
      date,
      insertedCount,
      affectedProjects: affectedProjects.length
    });

    res.json({
      success: true,
      message: '패킹리스트가 성공적으로 업데이트되었습니다.',
      insertedCount,
      affectedProjects: affectedProjects.length
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ [bulk-update] 패킹리스트 일괄 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: '패킹리스트 업데이트 중 오류가 발생했습니다.',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

module.exports = router; 