const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { devLog, errorLog } = require('../utils/logger');

// 입고기록 CRUD API
// 입고기록 생성
router.post('/entries', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId, entryDate, shippingDate, quantity } = req.body;
    
    if (!projectId || !entryDate || !shippingDate || !quantity) {
      return res.status(400).json({ 
        error: '필수 필드가 누락되었습니다. (projectId, entryDate, shippingDate, quantity)' 
      });
    }
    

    
    // 입고기록 생성
    const [result] = await connection.execute(`
      INSERT INTO warehouse_entries 
      (project_id, entry_date, shipping_date, quantity, status)
      VALUES (?, ?, ?, ?, '입고중')
    `, [projectId, entryDate, shippingDate, quantity]);
    
    const entryId = result.insertId;
    
    // 생성된 입고기록 조회
    const [entries] = await connection.execute(`
      SELECT * FROM warehouse_entries WHERE id = ?
    `, [entryId]);
    
    if (entries.length === 0) {
      throw new Error('생성된 입고기록을 찾을 수 없습니다.');
    }
    
    const newEntry = entries[0];
    

    
    res.status(201).json({
      success: true,
      message: '입고기록이 성공적으로 생성되었습니다.',
      entry: {
        id: newEntry.id,
        projectId: newEntry.project_id,
        entryDate: newEntry.entry_date,
        shippingDate: newEntry.shipping_date,
        quantity: newEntry.quantity,
        status: newEntry.status,
        createdAt: newEntry.created_at,
        updatedAt: newEntry.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ Warehouse 입고기록 생성 오류:', error);
    res.status(500).json({ 
      error: '입고기록 생성 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 프로젝트별 입고기록 목록 조회
router.get('/project/:projectId/entries', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId } = req.params;
    
    const [entries] = await connection.execute(`
      SELECT * FROM warehouse_entries 
      WHERE project_id = ?
      ORDER BY created_at ASC
    `, [projectId]);
    
    // 각 입고기록에 연결된 이미지 정보도 함께 조회
    const responseData = await Promise.all(entries.map(async (entry) => {
      // 해당 entry에 연결된 이미지들 조회
      const [images] = await connection.execute(`
        SELECT id, original_filename, stored_filename, file_size, mime_type, created_at
        FROM warehouse_images 
        WHERE entry_id = ?
        ORDER BY created_at ASC
      `, [entry.id]);
      
      // 이미지 조회 결과 확인
      
      // 이미지 데이터 매핑
      const mappedImages = images.map(image => ({
        id: image.id,
        name: image.original_filename,
        size: image.file_size,
        url: `/uploads/project/mj/warehouse/${image.stored_filename}`,
        thumbnailUrl: `/uploads/project/mj/warehouse/${image.stored_filename}`,
        storedName: image.stored_filename,
        filename: image.original_filename,
        mimeType: image.mime_type,
        createdAt: image.created_at
      }));
      
      // 매핑된 이미지
      
      return {
        id: entry.id,
        projectId: entry.project_id,
        entryDate: entry.entry_date,
        shippingDate: entry.shipping_date,
        quantity: entry.quantity,
        status: entry.status,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
        images: mappedImages
      };
    }));
    
    // 최종 응답 데이터 확인
    
    res.json({
      success: true,
      entries: responseData
    });
    
  } catch (error) {
    console.error('❌ Warehouse 입고기록 목록 조회 오류:', error);
    res.status(500).json({ 
      error: '입고기록 목록 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 입고기록 수정
router.put('/entries/:entryId', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { entryId } = req.params;
    const { entryDate, shippingDate, quantity, status } = req.body;
    
    if (!entryDate || !shippingDate || !quantity) {
      return res.status(400).json({ 
        error: '필수 필드가 누락되었습니다. (entryDate, shippingDate, quantity)' 
      });
    }
    

    
    // 입고기록 수정
    await connection.execute(`
      UPDATE warehouse_entries 
      SET entry_date = ?, shipping_date = ?, quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [entryDate, shippingDate, quantity, status || '입고중', entryId]);
    
    // 수정된 입고기록 조회
    const [entries] = await connection.execute(`
      SELECT * FROM warehouse_entries WHERE id = ?
    `, [entryId]);
    
    if (entries.length === 0) {
      return res.status(404).json({ error: '입고기록을 찾을 수 없습니다.' });
    }
    
    const updatedEntry = entries[0];
    

    
    res.json({
      success: true,
      message: '입고기록이 성공적으로 수정되었습니다.',
      entry: {
        id: updatedEntry.id,
        projectId: updatedEntry.project_id,
        entryDate: updatedEntry.entry_date,
        shippingDate: updatedEntry.shipping_date,
        quantity: updatedEntry.quantity,
        status: updatedEntry.status,
        createdAt: updatedEntry.created_at,
        updatedAt: updatedEntry.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ Warehouse 입고기록 수정 오류:', error);
    res.status(500).json({ 
      error: '입고기록 수정 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 입고기록 삭제
router.delete('/entries/:entryId', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { entryId } = req.params;
    

    
    // 입고기록에 연결된 이미지들 조회
    const [images] = await connection.execute(`
      SELECT * FROM warehouse_images WHERE entry_id = ?
    `, [entryId]);
    
    // 연결된 이미지들 파일 시스템에서 삭제
    for (const image of images) {
      try {
        await fs.unlink(image.file_path);
        // 연결된 이미지 파일 삭제 완료
      } catch (fileError) {
        // 연결된 이미지 파일 삭제 실패
      }
    }
    
    // 연결된 이미지들 DB에서 삭제
    if (images.length > 0) {
      await connection.execute(`
        DELETE FROM warehouse_images WHERE entry_id = ?
      `, [entryId]);
    }
    
    // 입고기록 삭제
    const [result] = await connection.execute(`
      DELETE FROM warehouse_entries WHERE id = ?
    `, [entryId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '입고기록을 찾을 수 없습니다.' });
    }
    

    
    res.json({
      success: true,
      message: '입고기록이 성공적으로 삭제되었습니다.',
      deletedImages: images.length
    });
    
  } catch (error) {
    console.error('❌ Warehouse 입고기록 삭제 오류:', error);
    res.status(500).json({ 
      error: '입고기록 삭제 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 입고기록 상태 업데이트
router.patch('/entries/:entryId/status', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { entryId } = req.params;
    const { status } = req.body;
    
    if (!status || !['입고중', '입고완료'].includes(status)) {
      return res.status(400).json({ 
        error: '유효하지 않은 상태입니다. (입고중, 입고완료)' 
      });
    }
    

    
    // 상태 업데이트
    await connection.execute(`
      UPDATE warehouse_entries 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, entryId]);
    
    // 업데이트된 입고기록 조회
    const [entries] = await connection.execute(`
      SELECT * FROM warehouse_entries WHERE id = ?
    `, [entryId]);
    
    if (entries.length === 0) {
      return res.status(404).json({ error: '입고기록을 찾을 수 없습니다.' });
    }
    
    const updatedEntry = entries[0];
    

    
    res.json({
      success: true,
      message: '입고기록 상태가 성공적으로 업데이트되었습니다.',
      entry: {
        id: updatedEntry.id,
        projectId: updatedEntry.project_id,
        entryDate: updatedEntry.entry_date,
        shippingDate: updatedEntry.shipping_date,
        quantity: updatedEntry.quantity,
        status: updatedEntry.status,
        createdAt: updatedEntry.created_at,
        updatedAt: updatedEntry.updated_at
      }
    });
    
  } catch (error) {
    console.error('❌ Warehouse 입고기록 상태 업데이트 오류:', error);
    res.status(500).json({ 
      error: '입고기록 상태 업데이트 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// multer 설정 - 이미지 파일 업로드 (단순화된 경로)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // uploads/project/mj/warehouse 경로로 단순화 (하위 폴더 없음)
      const uploadPath = path.join(__dirname, '..', 'uploads', 'project', 'mj', 'warehouse');
      
      // 디렉토리가 없으면 생성
      await fs.mkdir(uploadPath, { recursive: true });
      
      // 이미지 업로드 경로 확인
      
      cb(null, uploadPath);
    } catch (error) {
      console.error('업로드 디렉토리 생성 오류:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // 파일명: timestamp_originalname
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    
    const filename = `${timestamp}_${nameWithoutExt}${extension}`;
    cb(null, filename);
  }
});

// 파일 필터링 - 이미지 파일만 허용
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('지원하지 않는 파일 형식입니다. 이미지 파일만 업로드 가능합니다.'), false);
  }
};

// multer 설정
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // 최대 5개 파일
  }
});

// 이미지 업로드 API
router.post('/upload-images', authMiddleware, upload.array('images', 5), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId, entryId } = req.body;
    const uploadedFiles = req.files;
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ error: '업로드된 파일이 없습니다.' });
    }
    

    
    // entry_id 유효성 검증
    const [entries] = await connection.execute(
      'SELECT id FROM warehouse_entries WHERE id = ? AND project_id = ?',
      [entryId, projectId]
    );
    
    if (entries.length === 0) {
      return res.status(400).json({ 
        error: '유효하지 않은 입고기록 ID입니다. 입고기록을 먼저 저장한 후 이미지를 업로드해주세요.' 
      });
    }
    
    // 업로드된 이미지 정보를 DB에 저장
    const imageRecords = [];
    
    for (const file of uploadedFiles) {
      // 업로드된 파일 정보 확인
      
      const imageRecord = {
        project_id: parseInt(projectId),
        entry_id: parseInt(entryId),
        original_filename: file.originalname,
        stored_filename: file.filename,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        created_at: new Date()
      };
      
      imageRecords.push(imageRecord);
    }
    
    // DB에 이미지 정보 저장
    const insertPromises = imageRecords.map(record => {
      const query = `
        INSERT INTO warehouse_images 
        (project_id, entry_id, original_filename, stored_filename, file_path, file_size, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      return connection.execute(query, [
        record.project_id,
        record.entry_id,
        record.original_filename,
        record.stored_filename,
        record.file_path,
        record.file_size,
        record.mime_type,
        record.created_at
      ]);
    });
    
    await Promise.all(insertPromises);
    
    // 응답 데이터 구성
    const responseData = imageRecords.map(record => ({
      id: record.id,
      originalName: record.original_filename,
      storedName: record.stored_filename,
      filePath: record.file_path,
      fileSize: record.file_size,
      mimeType: record.mime_type,
      url: `/uploads/project/mj/warehouse/${record.stored_filename}`,
      thumbnailUrl: `/uploads/project/mj/warehouse/${record.stored_filename}`
    }));
    

    
    res.json({
      success: true,
      message: `${responseData.length}개의 이미지가 성공적으로 업로드되었습니다.`,
      images: responseData
    });
    
  } catch (error) {
    console.error('❌ Warehouse 이미지 업로드 오류:', error);
    res.status(500).json({ 
      error: '이미지 업로드 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 이미지 삭제 API
router.delete('/delete-image/:imageId', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { imageId } = req.params;
    
    // 이미지 정보 조회
    const [images] = await connection.execute(
      'SELECT * FROM warehouse_images WHERE id = ?',
      [imageId]
    );
    
    if (images.length === 0) {
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }
    
    const image = images[0];
    
    // 파일 시스템에서 이미지 삭제
    try {
      await fs.unlink(image.file_path);
      // 파일 시스템에서 이미지 삭제 완료
    } catch (fileError) {
      // 파일 시스템에서 이미지 삭제 실패 (DB에서만 삭제)
    }
    
    // DB에서 이미지 정보 삭제
    await connection.execute(
      'DELETE FROM warehouse_images WHERE id = ?',
      [imageId]
    );
    
    res.json({
      success: true,
      message: '이미지가 성공적으로 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ Warehouse 이미지 삭제 오류:', error);
    res.status(500).json({ 
      error: '이미지 삭제 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 프로젝트별 이미지 목록 조회 API
router.get('/project/:projectId/images', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId } = req.params;
    
    const [images] = await connection.execute(`
      SELECT wi.*, we.entry_date, we.shipping_date, we.quantity
      FROM warehouse_images wi
      JOIN warehouse_entries we ON wi.entry_id = we.id
      WHERE wi.project_id = ?
      ORDER BY we.entry_date DESC, wi.created_at DESC
    `, [projectId]);
    
    const responseData = images.map(image => ({
      id: image.id,
      entryId: image.entry_id,
      originalName: image.original_filename,
      storedName: image.stored_filename,
      fileSize: image.file_size,
      mimeType: image.mime_type,
      url: `/uploads/project/mj/warehouse/${image.stored_filename}`,
      entryDate: image.entry_date,
      shippingDate: image.shipping_date,
      quantity: image.quantity,
      createdAt: image.created_at
    }));
    
    res.json({
      success: true,
      images: responseData
    });
    
  } catch (error) {
    console.error('❌ Warehouse 이미지 목록 조회 오류:', error);
    res.status(500).json({ 
      error: '이미지 목록 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 프로젝트별 warehouse_entries의 총 quantity 조회
router.get('/project/:projectId/total-quantity', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { projectId } = req.params;
    
    // 프로젝트별 총 quantity 조회
    
    // 해당 프로젝트의 warehouse_entries에서 quantity 합산
    const [result] = await connection.execute(`
      SELECT COALESCE(SUM(quantity), 0) as total_quantity
      FROM warehouse_entries 
      WHERE project_id = ?
    `, [projectId]);
    
    const totalQuantity = result[0]?.total_quantity || 0;
    
    // 프로젝트별 총 quantity 조회 완료
    
    res.json({
      success: true,
      project_id: projectId,
      total_quantity: totalQuantity,
      message: '프로젝트별 총 quantity 조회 완료'
    });
    
  } catch (error) {
    console.error('❌ [warehouse] 프로젝트별 총 quantity 조회 오류:', error);
    res.status(500).json({ 
      error: '프로젝트별 총 quantity 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 이미지 프록시 엔드포인트 (CORS 문제 해결용)
router.get('/image/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const fs = require('fs');
    const path = require('path');
    
    // 상용서버와 개발서버 모두에서 작동하도록 경로 설정
    const imagePath = path.join(__dirname, '../uploads/project/mj/registImage', filename);
    
    // 파일 존재 확인
    if (!fs.existsSync(imagePath)) {
      // 이미지 파일을 찾을 수 없음
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }
    
    // 파일 읽기
    const imageBuffer = fs.readFileSync(imagePath);
    const stats = fs.statSync(imagePath);
    
    // MIME 타입 추정
    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'image/jpeg'; // 기본값
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    
    // CORS 헤더 설정
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    // 이미지 응답
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1년 캐시
    res.send(imageBuffer);
    
    // 이미지 제공 성공
    
  } catch (error) {
    console.error('❌ [warehouse] 이미지 프록시 오류:', error);
    res.status(500).json({ error: '이미지 로드 중 오류가 발생했습니다.' });
  }
});

// mj_project에서 remain_quantity > 0인 프로젝트 목록 조회 (패킹리스트용)
router.get('/products-with-remain-quantity', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    devLog('🔄 [warehouse] remain_quantity > 0인 프로젝트 목록 조회 시작');
    
    // mj_project에서 remain_quantity > 0인 프로젝트들을 조회
    const [products] = await connection.execute(`
      SELECT 
        mp.id as project_id,
        mp.project_name,
        mp.description as product_description,
        mp.quantity as project_quantity,
        mp.target_price,
        mp.status as project_status,
        mp.entry_quantity,
        mp.export_quantity,
        mp.remain_quantity,
        mp.created_at,
        mp.updated_at
      FROM mj_project mp
      WHERE mp.remain_quantity > 0
      ORDER BY mp.project_name ASC, mp.description ASC
    `);

    // 각 프로젝트에 연결된 첫 번째 이미지 정보도 함께 조회
    const responseData = await Promise.all(products.map(async (product) => {
      // 해당 프로젝트의 첫 번째 이미지 조회 (mj_project_images 테이블 사용)
      const [images] = await connection.execute(`
        SELECT id, file_name, file_path, original_name, created_at
        FROM mj_project_images 
        WHERE project_id = ?
        ORDER BY created_at ASC
        LIMIT 1
      `, [product.project_id]);

      // firstImage 변수 정의
      const firstImage = images.length > 0 ? images[0] : null;

      // 이미지 파일 경로 검증 (상용 환경에서는 로그 비활성화)

      const responseDataItem = {
        project_id: product.project_id,
        project_name: product.project_name,
        product_name: product.product_description || product.project_name,
        description: product.product_description,
        project_quantity: product.project_quantity,
        target_price: product.target_price,
        project_status: product.project_status,
        entry_quantity: product.entry_quantity,
        export_quantity: product.export_quantity,
        remain_quantity: product.remain_quantity,
        created_at: product.created_at,
        updated_at: product.updated_at,
        // 첫 번째 이미지 정보 추가 (프록시 엔드포인트 사용)
        first_image: firstImage ? {
          id: firstImage.id,
          original_filename: firstImage.original_name,
          stored_filename: firstImage.file_name, // file_name 사용
          file_path: firstImage.file_path, // file_path 저장
          created_at: firstImage.created_at,
          // 프록시 엔드포인트를 통해 이미지 제공 (CORS 문제 해결)
          url: `/api/warehouse/image/${firstImage.file_name}`,
          thumbnail_url: `/api/warehouse/image/${firstImage.file_name}`,
          // 대체 URL도 제공 (상용서버 호환성)
          fallback_url: `/uploads/project/mj/registImage/${firstImage.file_name}`
        } : null
      };

      // 이미지 정보 로깅 (상용 환경에서는 비활성화)

      return responseDataItem;
    }));

    // 조회 완료 (상용 환경에서는 로그 비활성화)

    res.json({
      success: true,
      products: responseData,
      message: 'remain_quantity > 0인 프로젝트 목록 조회 완료'
    });

  } catch (error) {
    errorLog('❌ [warehouse] remain_quantity > 0인 프로젝트 목록 조회 오류:', error);
    res.status(500).json({ 
      error: 'remain_quantity > 0인 프로젝트 목록 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 기존 API 엔드포인트도 remain_quantity > 0 조건으로 변경 (호환성 유지)
router.get('/products-with-entry-quantity', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    devLog('🔄 [warehouse] remain_quantity > 0인 프로젝트 목록 조회 (기존 API 호환성)');
    
    // mj_project에서 remain_quantity > 0인 프로젝트들을 조회
    const [products] = await connection.execute(`
      SELECT 
        mp.id as project_id,
        mp.project_name,
        mp.description as product_description,
        mp.quantity as project_quantity,
        mp.target_price,
        mp.status as project_status,
        mp.entry_quantity,
        mp.export_quantity,
        mp.remain_quantity,
        mp.created_at,
        mp.updated_at
      FROM mj_project mp
      WHERE mp.remain_quantity > 0
      ORDER BY mp.project_name ASC, mp.description ASC
    `);

    // 각 프로젝트에 연결된 첫 번째 이미지 정보도 함께 조회
    const responseData = await Promise.all(products.map(async (product) => {
      // 해당 프로젝트의 첫 번째 이미지 조회 (mj_project_images 테이블 사용)
      const [images] = await connection.execute(`
        SELECT id, file_name, file_path, original_name, created_at
        FROM mj_project_images 
        WHERE project_id = ?
        ORDER BY created_at ASC
        LIMIT 1
      `, [product.project_id]);

      // firstImage 변수 정의
      const firstImage = images.length > 0 ? images[0] : null;

      // 이미지 파일 경로 검증
      if (firstImage) {
        const fs = require('fs');
        const path = require('path');
        const imagePath = path.join(__dirname, '../uploads/project/mj/registImage', firstImage.file_name);
        
        // 이미지 파일 존재 확인
      }
      
      // 프로젝트 이미지 조회

      const responseDataItem = {
        project_id: product.project_id,
        project_name: product.project_name,
        product_name: product.product_description || product.project_name,
        description: product.product_description,
        project_quantity: product.project_quantity,
        target_price: product.target_price,
        project_status: product.project_status,
        entry_quantity: product.entry_quantity,
        export_quantity: product.export_quantity,
        remain_quantity: product.remain_quantity,
        created_at: product.created_at,
        updated_at: product.updated_at,
        // 첫 번째 이미지 정보 추가 (프록시 엔드포인트 사용)
        first_image: firstImage ? {
          id: firstImage.id,
          original_filename: firstImage.original_name,
          stored_filename: firstImage.file_name, // file_name 사용
          file_path: firstImage.file_path, // file_path 저장
          created_at: firstImage.created_at,
          // 프록시 엔드포인트를 통해 이미지 제공 (CORS 문제 해결)
          url: `/api/warehouse/image/${firstImage.file_name}`,
          thumbnail_url: `/api/warehouse/image/${firstImage.file_name}`,
          // 대체 URL도 제공 (상용서버 호환성)
          fallback_url: `/uploads/project/mj/registImage/${firstImage.file_name}`
        } : null
      };

      // 이미지 정보 로깅

      return responseDataItem;
    }));

    // remain_quantity > 0인 프로젝트 조회 완료



    res.json({
      success: true,
      products: responseData,
      message: 'remain_quantity > 0인 프로젝트 목록 조회 완료 (기존 API 호환성)'
    });

  } catch (error) {
    console.error('❌ [warehouse] remain_quantity > 0인 프로젝트 목록 조회 오류 (기존 API):', error);
    res.status(500).json({ 
      error: 'remain_quantity > 0인 프로젝트 목록 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

// 재고가 있는 상품 목록 조회 (패킹리스트용) - 기존 코드 유지
router.get('/products-with-stock', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    // warehouse_entries에서 stock > 0인 상품들을 조회 (재고가 있는 상품만)
    // mj_project와 JOIN하여 프로젝트 정보도 함께 가져옴
    const [products] = await connection.execute(`
      SELECT DISTINCT
        mp.id as project_id,
        mp.project_name,
        mp.description as product_description,
        mp.quantity as project_quantity,
        mp.target_price,
        mp.status as project_status,
        SUM(we.stock) as total_available_stock,
        SUM(we.stock) as total_warehouse_quantity,
        SUM(we.out_quantity) as total_out_quantity,
        COUNT(we.id) as entry_count
      FROM mj_project mp
      LEFT JOIN warehouse_entries we ON mp.id = we.project_id
      WHERE we.stock > 0
      GROUP BY mp.id, mp.project_name, mp.description, mp.quantity, mp.target_price, mp.status
      ORDER BY mp.project_name ASC, mp.description ASC
    `);

    const responseData = products.map(product => ({
      project_id: product.project_id,
      project_name: product.project_name,
      product_name: product.product_description || product.project_name,
      description: product.product_description,
      project_quantity: product.project_quantity,
      target_price: product.target_price,
      project_status: product.project_status,
      available_stock: product.total_available_stock,
      total_warehouse_quantity: product.total_warehouse_quantity,
      total_out_quantity: product.total_out_quantity,
      entry_count: product.entry_count
    }));

    res.json({
      success: true,
      products: responseData
    });

  } catch (error) {
    console.error('❌ 재고 상품 목록 조회 오류:', error);
    res.status(500).json({ 
      error: '재고 상품 목록 조회 중 오류가 발생했습니다.',
      details: error.message 
    });
  } finally {
    connection.release();
  }
});

module.exports = router; 