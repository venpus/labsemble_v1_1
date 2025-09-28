const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const auth = require('../middleware/auth');

// 물류 결제 정보 저장/업데이트
router.put('/update', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { data, date } = req.body;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '저장할 데이터가 없습니다.' 
      });
    }

    // 물류 결제 데이터 저장 시작

    // 트랜잭션 시작
    await connection.beginTransaction();

    let savedCount = 0;
    let updatedCount = 0;
    let errors = [];

    for (const item of data) {
      try {
        const {
          mj_packing_list_id,
          pl_date, // 클라이언트에서 전송한 pl_date 사용
          packing_code,
          logistic_company,
          box_no,
          barcode_number,
          tracking_number,
          logistic_fee,
          is_paid,
          is_arrived,
          arrived_date,
          arrived_by,
          description
        } = item;
        
        // 한국도착 관련 필드 로그
        console.log(`📦 [LogisticPayment] 처리 중인 항목:`, {
          packing_code,
          box_no,
          is_arrived,
          arrived_date,
          arrived_by
        });
        
        // pl_date 검증
        if (!pl_date) {
          errors.push(`pl_date가 누락되었습니다: ${JSON.stringify(item)}`);
          continue;
        }

        // mj_packing_list_id 검증
        if (!mj_packing_list_id) {
          errors.push(`mj_packing_list_id가 누락되었습니다: ${JSON.stringify(item)}`);
          continue;
        }

        // 필수 필드 검증
        if (!packing_code) {
          errors.push(`포장코드가 누락되었습니다: ${JSON.stringify(item)}`);
          continue;
        }

        if (!box_no || box_no < 1) {
          errors.push(`박스 번호가 올바르지 않습니다: ${JSON.stringify(item)}`);
          continue;
        }

        // 기존 데이터 확인 (packing_code, mj_packing_list_id, box_no로 고유 식별)
        const [existingRecords] = await connection.execute(`
          SELECT id FROM logistic_payment 
          WHERE packing_code = ? AND mj_packing_list_id = ? AND box_no = ?
        `, [packing_code, mj_packing_list_id, box_no]);

                  if (existingRecords.length > 0) {
            // 기존 데이터 업데이트
            await connection.execute(`
              UPDATE logistic_payment SET
                pl_date = ?,
                barcode_number = ?,
                tracking_number = ?,
                logistic_fee = ?,
                is_paid = ?,
                is_arrived = ?,
                arrived_date = ?,
                arrived_by = ?,
                description = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE packing_code = ? AND mj_packing_list_id = ? AND box_no = ?
            `, [
              pl_date,
              barcode_number || null,
              tracking_number || null,
              logistic_fee || 205, // 기본값 205로 설정
              is_paid || false,
              is_arrived || false,
              arrived_date || null,
              arrived_by || null,
              description || null,
              packing_code,
              mj_packing_list_id,
              box_no
            ]);
            updatedCount++;
            // 데이터 업데이트 완료 (전체저장 후 일괄 동기화)
          } else {
            // 새 데이터 삽입
            await connection.execute(`
              INSERT INTO logistic_payment (
                mj_packing_list_id,
                pl_date,
                packing_code,
                logistic_company,
                box_no,
                barcode_number,
                tracking_number,
                logistic_fee,
                is_paid,
                is_arrived,
                arrived_date,
                arrived_by,
                description
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              mj_packing_list_id,
              pl_date,
              packing_code,
              logistic_company || null,
              box_no,
              barcode_number || null,
              tracking_number || null,
              logistic_fee || 205, // 기본값 205로 설정
              is_paid || false,
              is_arrived || false,
              arrived_date || null,
              arrived_by || null,
              description || null
            ]);
            savedCount++;
            // 새 데이터 저장 완료 (전체저장 후 일괄 동기화)
          }
      } catch (error) {
        console.error(`❌ [LogisticPayment] 데이터 처리 오류:`, error);
        errors.push(`데이터 처리 오류 (${item.packing_code}): ${error.message}`);
      }
    }

    // 트랜잭션 커밋
    await connection.commit();

    res.json({
      success: true,
      message: '물류 결제 정보가 성공적으로 저장되었습니다.',
      data: {
        saved: savedCount,
        updated: updatedCount,
        total: data.length,
        errors: errors.length > 0 ? errors : null
      }
    });

  } catch (error) {
    // 트랜잭션 롤백
    await connection.rollback();
    
    console.error('❌ [LogisticPayment] 저장 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '데이터 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 특정 날짜의 물류 결제 정보 조회
router.get('/by-date/:date', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { date } = req.params;
    
    // 날짜별 데이터 조회

    const [records] = await connection.execute(`
      SELECT 
        lp.*,
        mpl.box_count,
        mpl.product_name,
        mpl.packaging_count
      FROM logistic_payment lp
      JOIN mj_packing_list mpl ON lp.mj_packing_list_id = mpl.id
      WHERE lp.pl_date = ?
      ORDER BY lp.packing_code, lp.created_at
    `, [date]);

    // 조회 완료

    res.json({
      success: true,
      data: records
    });

  } catch (error) {
    console.error('❌ [LogisticPayment] 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '데이터 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 특정 날짜의 포장코드별 물류비 합계 조회
router.get('/summary-by-date/:date', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { date } = req.params;
    
    // 날짜별 물류비 합계 조회

    const [records] = await connection.execute(`
      SELECT 
        lp.packing_code,
        lp.logistic_company,
        SUM(CAST(lp.logistic_fee AS DECIMAL(10,2))) as total_logistic_fee,
        COUNT(*) as total_records,
        SUM(CASE WHEN lp.is_paid = 1 THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN lp.is_paid = 0 THEN 1 ELSE 0 END) as unpaid_count
      FROM logistic_payment lp
      WHERE lp.pl_date = ?
      GROUP BY lp.packing_code, lp.logistic_company
      ORDER BY lp.packing_code, lp.logistic_company
    `, [date]);

    // 물류비 합계 조회 완료

    res.json({
      success: true,
      data: records
    });

  } catch (error) {
    console.error('❌ [LogisticPayment] 물류비 합계 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '물류비 합계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 전체 logistic_payment 테이블의 총 물류비 합계 조회
router.get('/total-shipping-cost', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    // 전체 물류비 합계 조회

    const [result] = await connection.execute(`
      SELECT 
        SUM(CAST(logistic_fee AS DECIMAL(15,2))) as total_shipping_cost,
        COUNT(*) as total_records,
        COUNT(DISTINCT packing_code) as unique_packing_codes,
        COUNT(DISTINCT pl_date) as unique_dates
      FROM logistic_payment 
      WHERE logistic_fee IS NOT NULL 
        AND logistic_fee > 0
    `);

    const totalShippingCost = Number(result[0]?.total_shipping_cost ?? 0) || 0;
    
    console.log(`✅ [LogisticPayment] 전체 물류비 합계 조회 완료: ${totalShippingCost} CNY`);
    console.log(`📊 [LogisticPayment] 상세 정보:`, {
      totalShippingCost,
      totalRecords: result[0]?.total_records ?? 0,
      uniquePackingCodes: result[0]?.unique_packing_codes ?? 0,
      uniqueDates: result[0]?.unique_dates ?? 0
    });

    res.json({
      success: true,
      data: {
        totalShippingCost,
        totalRecords: result[0]?.total_records ?? 0,
        uniquePackingCodes: result[0]?.unique_packing_codes ?? 0,
        uniqueDates: result[0]?.unique_dates ?? 0
      }
    });

  } catch (error) {
    console.error('❌ [LogisticPayment] 전체 물류비 합계 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '전체 물류비 합계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// logistic_payment에서 미지급 배송비 정보 조회 (is_paid = 0인 데이터들의 logistic_fee 합계)
router.get('/unpaid-shipping-cost', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('💰 [LogisticPayment] 미지급 배송비 정보 조회 시작');

    const [result] = await connection.execute(`
      SELECT 
        SUM(CAST(logistic_fee AS DECIMAL(15,2))) as total_unpaid_shipping_cost,
        COUNT(*) as total_unpaid_records,
        COUNT(DISTINCT packing_code) as unique_unpaid_packing_codes,
        COUNT(DISTINCT pl_date) as unique_unpaid_dates
      FROM logistic_payment 
      WHERE logistic_fee IS NOT NULL 
        AND logistic_fee > 0
        AND is_paid = 0
    `);

    const totalUnpaidShippingCost = Number(result[0]?.total_unpaid_shipping_cost ?? 0) || 0;
    
    console.log(`✅ [LogisticPayment] 미지급 배송비 정보 조회 완료: ${totalUnpaidShippingCost} CNY`);
    console.log(`📊 [LogisticPayment] 미지급 상세 정보:`, {
      totalUnpaidShippingCost,
      totalUnpaidRecords: result[0]?.total_unpaid_records ?? 0,
      uniqueUnpaidPackingCodes: result[0]?.unique_unpaid_packing_codes ?? 0,
      uniqueUnpaidDates: result[0]?.unique_unpaid_dates ?? 0
    });

    res.json({
      success: true,
      data: {
        totalUnpaidShippingCost,
        totalUnpaidRecords: result[0]?.total_unpaid_records ?? 0,
        uniqueUnpaidPackingCodes: result[0]?.unique_unpaid_packing_codes ?? 0,
        uniqueUnpaidDates: result[0]?.unique_unpaid_dates ?? 0
      }
    });

  } catch (error) {
    console.error('❌ [LogisticPayment] 미지급 배송비 정보 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '미지급 배송비 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// logistic_payment에서 배송비 지급 예정 정보 조회 (is_paid = 0인 데이터들의 logistic_fee 합계)
router.get('/shipping-payment-schedule', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('💰 [LogisticPayment] 배송비 지급 예정 정보 조회 시작');

    const [result] = await connection.execute(`
      SELECT 
        SUM(CAST(logistic_fee AS DECIMAL(15,2))) as total_shipping_payment_schedule,
        COUNT(*) as total_schedule_records,
        COUNT(DISTINCT packing_code) as unique_schedule_packing_codes,
        COUNT(DISTINCT pl_date) as unique_schedule_dates
      FROM logistic_payment 
      WHERE logistic_fee IS NOT NULL 
        AND logistic_fee > 0
        AND is_paid = 0
    `);

    const totalShippingPaymentSchedule = Number(result[0]?.total_shipping_payment_schedule ?? 0) || 0;
    
    console.log(`✅ [LogisticPayment] 배송비 지급 예정 정보 조회 완료: ${totalShippingPaymentSchedule} CNY`);
    console.log(`📊 [LogisticPayment] 배송비 지급 예정 상세 정보:`, {
      totalShippingPaymentSchedule,
      totalScheduleRecords: result[0]?.total_schedule_records ?? 0,
      uniqueSchedulePackingCodes: result[0]?.unique_schedule_packing_codes ?? 0,
      uniqueScheduleDates: result[0]?.unique_schedule_dates ?? 0
    });

    // 상세 프로젝트 정보도 조회 (프로젝트명 대신 포장코드와 설명 사용)
    const [detailRows] = await connection.execute(`
      SELECT 
        lp.id,
        lp.packing_code,
        lp.pl_date,
        lp.logistic_fee,
        lp.is_paid,
        lp.description
      FROM logistic_payment lp
      WHERE lp.logistic_fee IS NOT NULL 
        AND lp.logistic_fee > 0
        AND lp.is_paid = 0
      ORDER BY lp.logistic_fee DESC
    `);

    console.log(`[LogisticPayment] 배송비 지급 예정 상세 정보:`);
    detailRows.forEach((row, index) => {
      console.log(`  ${index + 1}. 포장코드: ${row.packing_code}, 배송비: ${row.logistic_fee} CNY, 설명: ${row.description || '없음'}`);
    });

    const responseData = {
      totalShippingPaymentSchedule,
      totalScheduleRecords: result[0]?.total_schedule_records ?? 0,
      uniqueSchedulePackingCodes: result[0]?.unique_schedule_packing_codes ?? 0,
      uniqueScheduleDates: result[0]?.unique_schedule_dates ?? 0,
      projects: detailRows
    };

    res.json({
      success: true,
      message: '배송비 지급 예정 정보를 성공적으로 조회했습니다.',
      data: responseData
    });

  } catch (error) {
    console.error('❌ [LogisticPayment] 배송비 지급 예정 정보 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '배송비 지급 예정 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 물류 결제 정보 삭제
router.delete('/:id', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    
    console.log('🗑️ [LogisticPayment] 데이터 삭제:', id);

    const [result] = await connection.execute(`
      DELETE FROM logistic_payment WHERE id = ?
    `, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '삭제할 데이터를 찾을 수 없습니다.'
      });
    }

    console.log(`✅ [LogisticPayment] 삭제 완료: ID ${id}`);

    res.json({
      success: true,
      message: '물류 결제 정보가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ [LogisticPayment] 삭제 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '데이터 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 배송비 지급 예정 상세 목록 조회
router.get('/shipping-payment-details', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    // is_paid = 0인 배송비 지급 예정 정보를 pl_date 기준으로 그룹화하여 조회
    const [rows] = await connection.execute(`
      SELECT 
        pl_date,
        COUNT(*) as box_count,
        SUM(logistic_fee) as total_logistic_fee,
        GROUP_CONCAT(DISTINCT packing_code ORDER BY packing_code SEPARATOR ', ') as packing_codes,
        GROUP_CONCAT(DISTINCT logistic_company ORDER BY logistic_company SEPARATOR ', ') as logistic_companies
      FROM logistic_payment 
      WHERE is_paid = 0
        AND logistic_fee > 0
      GROUP BY pl_date
      ORDER BY 
        CASE 
          WHEN pl_date IS NULL THEN 1 
          ELSE 0 
        END,
        pl_date ASC
    `);
    
    const shippingPayments = rows.map((row, index) => ({
      id: `shipping_${row.pl_date || 'no_date'}_${index}`, // 고유 ID 생성
      pl_date: row.pl_date,
      total_boxes: row.box_count, // box_count를 total_boxes로 변경
      total_logistic_fee: row.total_logistic_fee,
      packing_codes: row.packing_codes,
      logistic_companies: row.logistic_companies
    }));
    
    console.log(`✅ [LogisticPayment] 배송비 지급 예정 상세 조회 성공 - Count: ${shippingPayments.length}`);
    
    res.json({
      success: true,
      message: '배송비 지급 예정 상세 정보를 성공적으로 조회했습니다.',
      data: {
        shippingPayments
      }
    });
    
  } catch (error) {
    console.error('❌ [LogisticPayment] 배송비 지급 예정 상세 조회 실패:', error);
    
    res.status(500).json({
      success: false,
      message: '배송비 지급 예정 상세 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// 바코드 스캔을 통한 입고 확인 API
router.post('/scan-barcode', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { barcode_number, arrived_by } = req.body;
    const userId = req.user.id;
    
    console.log('📱 [barcode-scan] 바코드 스캔 요청:', {
      barcode_number, arrived_by, userId
    });
    
    // 필수 필드 검증
    if (!barcode_number || barcode_number.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '바코드 번호를 입력해주세요.'
      });
    }
    
    // 바코드 번호로 해당 레코드 찾기
    const [records] = await connection.execute(`
      SELECT 
        lp.id,
        lp.packing_code,
        lp.box_no,
        lp.barcode_number,
        lp.tracking_number,
        lp.logistic_company,
        lp.is_arrived,
        lp.arrived_date,
        lp.arrived_by,
        mpl.product_name
      FROM logistic_payment lp
      LEFT JOIN mj_packing_list mpl ON lp.mj_packing_list_id = mpl.id
      WHERE lp.barcode_number = ?
    `, [barcode_number.trim()]);
    
    if (records.length === 0) {
      console.log('❌ [barcode-scan] 바코드 일치하는 레코드 없음:', barcode_number);
      return res.status(404).json({
        success: false,
        error: '해당 바코드 번호와 일치하는 물류 정보를 찾을 수 없습니다.',
        barcode_number: barcode_number
      });
    }
    
    const record = records[0];
    
    // 이미 입고 확인된 경우
    if (record.is_arrived) {
      console.log('⚠️ [barcode-scan] 이미 입고 확인된 바코드:', barcode_number);
      return res.status(409).json({
        success: false,
        error: '이미 입고 확인된 바코드입니다.',
        data: {
          packing_code: record.packing_code,
          box_no: record.box_no,
          arrived_date: record.arrived_date,
          arrived_by: record.arrived_by
        }
      });
    }
    
    // 입고 확인 처리
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    const arrivedBy = arrived_by || req.user.username || '바코드스캔';
    
    await connection.execute(`
      UPDATE logistic_payment 
      SET 
        is_arrived = true,
        arrived_date = ?,
        arrived_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [currentDate, arrivedBy, record.id]);
    
    console.log('✅ [barcode-scan] 입고 확인 완료:', {
      barcode_number,
      packing_code: record.packing_code,
      box_no: record.box_no,
      arrived_date: currentDate,
      arrived_by: arrivedBy
    });
    
    res.json({
      success: true,
      message: '입고 확인이 완료되었습니다.',
      data: {
        id: record.id,
        packing_code: record.packing_code,
        box_no: record.box_no,
        barcode_number: record.barcode_number,
        tracking_number: record.tracking_number,
        logistic_company: record.logistic_company,
        product_name: record.product_name,
        is_arrived: true,
        arrived_date: currentDate,
        arrived_by: arrivedBy
      }
    });
    
  } catch (error) {
    console.error('❌ [barcode-scan] 바코드 스캔 오류:', error);
    res.status(500).json({
      success: false,
      error: '바코드 스캔 처리 중 오류가 발생했습니다.'
    });
  } finally {
    connection.release();
  }
});

// 바코드 유효성 검증 API (일치 여부만 확인)
router.post('/validate-barcode', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { barcode_number } = req.body;
    
    console.log('🔍 [barcode-validate] 바코드 유효성 검증 요청:', {
      barcode_number
    });
    
    // 필수 필드 검증
    if (!barcode_number || barcode_number.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '바코드 번호를 입력해주세요.'
      });
    }
    
    // 바코드 번호로 해당 레코드 찾기
    const [records] = await connection.execute(`
      SELECT 
        lp.id,
        lp.packing_code,
        lp.box_no,
        lp.barcode_number,
        lp.tracking_number,
        lp.logistic_company,
        lp.is_arrived,
        lp.arrived_date,
        lp.arrived_by,
        mpl.product_name
      FROM logistic_payment lp
      LEFT JOIN mj_packing_list mpl ON lp.mj_packing_list_id = mpl.id
      WHERE lp.barcode_number = ?
    `, [barcode_number.trim()]);
    
    if (records.length === 0) {
      console.log('❌ [barcode-validate] 바코드 일치하는 레코드 없음:', barcode_number);
      return res.status(404).json({
        success: false,
        error: '해당 바코드 번호와 일치하는 물류 정보를 찾을 수 없습니다.',
        barcode_number: barcode_number
      });
    }
    
    const record = records[0];
    
    console.log('✅ [barcode-validate] 바코드 일치 확인:', {
      barcode_number,
      packing_code: record.packing_code,
      box_no: record.box_no,
      is_arrived: record.is_arrived
    });
    
    res.json({
      success: true,
      message: '바코드가 일치합니다.',
      data: {
        id: record.id,
        packing_code: record.packing_code,
        box_no: record.box_no,
        barcode_number: record.barcode_number,
        tracking_number: record.tracking_number,
        logistic_company: record.logistic_company,
        product_name: record.product_name,
        is_arrived: record.is_arrived,
        arrived_date: record.arrived_date,
        arrived_by: record.arrived_by
      }
    });
    
  } catch (error) {
    console.error('❌ [barcode-validate] 바코드 유효성 검증 오류:', error);
    res.status(500).json({
      success: false,
      error: '바코드 유효성 검증 중 오류가 발생했습니다.'
    });
  } finally {
    connection.release();
  }
});

// 바코드로 입고 확인 업데이트 API (바코드가 일치할 때만)
router.post('/update-arrival-by-barcode', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { barcode_number, arrived_by } = req.body;
    const userId = req.user.id;
    
    console.log('📦 [barcode-arrival-update] 바코드로 입고 확인 업데이트 요청:', {
      barcode_number, arrived_by, userId
    });
    
    // 필수 필드 검증
    if (!barcode_number || barcode_number.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '바코드 번호를 입력해주세요.'
      });
    }
    
    // 바코드 번호로 해당 레코드 찾기
    const [records] = await connection.execute(`
      SELECT 
        lp.id,
        lp.packing_code,
        lp.box_no,
        lp.barcode_number,
        lp.is_arrived
      FROM logistic_payment lp
      WHERE lp.barcode_number = ?
    `, [barcode_number.trim()]);
    
    if (records.length === 0) {
      console.log('❌ [barcode-arrival-update] 바코드 일치하는 레코드 없음:', barcode_number);
      return res.status(404).json({
        success: false,
        error: '해당 바코드 번호와 일치하는 물류 정보를 찾을 수 없습니다.',
        barcode_number: barcode_number
      });
    }
    
    const record = records[0];
    
    // 이미 입고 확인된 경우
    if (record.is_arrived) {
      console.log('⚠️ [barcode-arrival-update] 이미 입고 확인된 바코드:', barcode_number);
      return res.status(409).json({
        success: false,
        error: '이미 입고 확인된 바코드입니다.',
        data: {
          packing_code: record.packing_code,
          box_no: record.box_no
        }
      });
    }
    
    // 입고 확인 처리
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    const arrivedBy = arrived_by || req.user.username || '바코드스캔';
    
    await connection.execute(`
      UPDATE logistic_payment 
      SET 
        is_arrived = true,
        arrived_date = ?,
        arrived_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [currentDate, arrivedBy, record.id]);
    
    console.log('✅ [barcode-arrival-update] 입고 확인 업데이트 완료:', {
      barcode_number,
      packing_code: record.packing_code,
      box_no: record.box_no,
      arrived_date: currentDate,
      arrived_by: arrivedBy
    });
    
    res.json({
      success: true,
      message: '입고 확인이 성공적으로 업데이트되었습니다.',
      data: {
        id: record.id,
        packing_code: record.packing_code,
        box_no: record.box_no,
        barcode_number: record.barcode_number,
        is_arrived: true,
        arrived_date: currentDate,
        arrived_by: arrivedBy
      }
    });
    
  } catch (error) {
    console.error('❌ [barcode-arrival-update] 바코드 입고 확인 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: '입고 확인 업데이트 중 오류가 발생했습니다.'
    });
  } finally {
    connection.release();
  }
});

// 개별 항목 입고 확인 업데이트 API (체크박스용)
router.put('/:id/arrival', auth, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    const { is_arrived, arrived_date, arrived_by } = req.body;
    const userId = req.user.id;
    
    console.log('📦 [individual-arrival] 개별 입고 확인 업데이트 요청:', {
      id, is_arrived, arrived_date, arrived_by, userId
    });
    
    // ID 유효성 검사
    if (!id || isNaN(parseInt(id))) {
      console.error('❌ [individual-arrival] 잘못된 ID:', id);
      return res.status(400).json({
        success: false,
        error: '잘못된 ID 형식입니다.'
      });
    }
    
    // 레코드 존재 여부 확인
    const [existingRecords] = await connection.execute(
      'SELECT id, packing_code, box_no, is_arrived FROM logistic_payment WHERE id = ?',
      [id]
    );
    
    if (existingRecords.length === 0) {
      return res.status(404).json({
        success: false,
        error: '해당 물류 결제 정보를 찾을 수 없습니다.'
      });
    }
    
    const record = existingRecords[0];
    
    // 입고 확인 처리
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    const finalArrivedDate = is_arrived ? (arrived_date || currentDate) : null;
    const finalArrivedBy = is_arrived ? (arrived_by || req.user.username || '체크박스입력') : null;
    
    await connection.execute(`
      UPDATE logistic_payment 
      SET 
        is_arrived = ?,
        arrived_date = ?,
        arrived_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [is_arrived, finalArrivedDate, finalArrivedBy, id]);
    
            console.log('✅ [individual-arrival] 개별 입고 확인 업데이트 완료:', {
              id,
              packing_code: record.packing_code,
              box_no: record.box_no,
              is_arrived,
              arrived_date: finalArrivedDate,
              arrived_by: finalArrivedBy
            });
            
            res.json({
              success: true,
              message: '입고 확인 상태가 성공적으로 업데이트되었습니다.',
              data: {
                id: parseInt(id),
                packing_code: record.packing_code,
                box_no: record.box_no,
                is_arrived,
                arrived_date: finalArrivedDate,
                arrived_by: finalArrivedBy
              }
            });
    
  } catch (error) {
    console.error('❌ [individual-arrival] 개별 입고 확인 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      error: '입고 확인 상태 업데이트 중 오류가 발생했습니다.'
    });
  } finally {
    connection.release();
  }
});


module.exports = router; 