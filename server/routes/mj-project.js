const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { 
  getCurrentKSTString, 
  formatDate, 
  convertUTCToKST,
  isValidDate 
} = require('../utils/timezone');
const { devLog, errorLog } = require('../utils/logger');

const router = express.Router();

// Payment 지급일 데이터는 이제 Finance API에서 mj_project 테이블을 직접 읽어와서 표시
// 기존의 자동 동기화 로직은 제거됨

// 이미지 업로드를 위한 multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 절대 경로로 변경하여 상용서버에서도 작동하도록 수정
    const uploadPath = path.join(__dirname, '..', 'uploads', 'project', 'mj', 'registImage');
    
    // 폴더가 없으면 생성
    if (!fs.existsSync(uploadPath)) {
      try {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(`✅ [mj-project] 업로드 디렉토리 생성: ${uploadPath}`);
      } catch (error) {
        console.error(`❌ [mj-project] 업로드 디렉토리 생성 실패: ${uploadPath}`, error);
        return cb(error);
      }
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // 파일명 중복 방지를 위해 타임스탬프 추가
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = 'mj-project-' + uniqueSuffix + ext;
    console.log(`📁 [mj-project] 파일명 생성: ${filename}`);
    cb(null, filename);
  }
});

// 제품 이미지 업로드를 위한 multer 설정
const realImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 절대 경로로 변경하여 상용서버에서도 작동하도록 수정
    const uploadPath = path.join(__dirname, '..', 'uploads', 'project', 'mj', 'realImage');
    
    // 폴더가 없으면 생성
    if (!fs.existsSync(uploadPath)) {
      try {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(`✅ [mj-project] realImage 업로드 디렉토리 생성: ${uploadPath}`);
      } catch (error) {
        console.error(`❌ [mj-project] realImage 업로드 디렉토리 생성 실패: ${uploadPath}`, error);
        return cb(error);
      }
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // 파일명 중복 방지를 위해 타임스탬프 추가
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = 'mj-real-image-' + uniqueSuffix + ext;
    console.log(`📁 [mj-project] realImage 파일명 생성: ${filename}`);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 제한
  },
  fileFilter: function (req, file, cb) {
    // 이미지 파일만 허용
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
    }
  }
}).array('images', 10);

// multer 에러 핸들링 미들웨어
const handleMulterError = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('❌ [mj-project] Multer 에러:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '파일 크기가 너무 큽니다. 10MB 이하의 파일만 업로드 가능합니다.' });
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: '파일 개수가 너무 많습니다. 최대 10개까지만 업로드 가능합니다.' });
      } else {
        return res.status(400).json({ error: `파일 업로드 오류: ${err.message}` });
      }
    } else if (err) {
      console.error('❌ [mj-project] 파일 업로드 에러:', err);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

const realImageUpload = multer({ 
  storage: realImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 제한
  },
  fileFilter: function (req, file, cb) {
    // 이미지와 비디오 파일 허용
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 또는 비디오 파일만 업로드 가능합니다.'), false);
    }
  }
});

// MJ 프로젝트 등록
router.post('/register', authMiddleware, handleMulterError, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('🚀 [mj-project] 프로젝트 등록 시작:', {
      body: req.body,
      files: req.files ? req.files.length : 0,
      user: req.user
    });
    
    await connection.beginTransaction();
    
    const { projectName, description, quantity, targetPrice, referenceLinks, selectedUserId } = req.body;
    
    // admin 사용자의 경우 선택된 사용자 ID 사용, 그렇지 않으면 현재 로그인한 사용자 ID 사용
    let projectOwnerId = req.user?.userId;  // 프로젝트 소유자 ID
    let projectCreatorId = req.user?.userId; // 프로젝트 등록자 ID
    let isAdminUser = req.user?.isAdmin;
    
    console.log('👤 [mj-project] 사용자 정보:', {
      projectOwnerId,
      projectCreatorId,
      isAdminUser,
      selectedUserId
    });
    
    // JWT에서 admin 권한이 제대로 전달되지 않은 경우, 데이터베이스에서 직접 확인
    if (isAdminUser === undefined || isAdminUser === null) {
      try {
        const [adminCheck] = await connection.execute(
          'SELECT is_admin FROM users WHERE id = ?',
          [req.user.userId]
        );
        if (adminCheck.length > 0) {
          isAdminUser = adminCheck[0].is_admin;
          console.log('🔍 [mj-project] DB에서 admin 권한 확인:', isAdminUser);
        }
      } catch (error) {
        console.error('❌ [mj-project] admin 권한 확인 오류:', error);
        isAdminUser = false;
      }
    }
    
    if (selectedUserId && isAdminUser) {
      projectOwnerId = parseInt(selectedUserId);  // 문자열을 숫자로 변환
      projectCreatorId = req.user.userId; // 현재 로그인한 admin
      console.log('👑 [mj-project] Admin 사용자로 프로젝트 등록:', { projectOwnerId, projectCreatorId });
    }
    
    // referenceLinks가 문자열인 경우 JSON으로 파싱
    let parsedReferenceLinks = [];
    if (referenceLinks) {
      try {
        parsedReferenceLinks = typeof referenceLinks === 'string' 
          ? JSON.parse(referenceLinks) 
          : referenceLinks;
        console.log('🔗 [mj-project] 참고링크 파싱 완료:', parsedReferenceLinks);
      } catch (error) {
        console.error('❌ [mj-project] 참고링크 파싱 오류:', error);
        parsedReferenceLinks = [];
      }
    }
    
    // 프로젝트 등록 데이터 준비 완료 // JWT에서 사용자 ID 추출 (인증 미들웨어 필요)
    
    if (!projectOwnerId) {
      console.error('❌ [mj-project] 사용자 인증 실패: projectOwnerId 없음');
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    // 필수 필드 검증
    if (!projectName || !quantity) {
      console.error('❌ [mj-project] 필수 필드 누락:', { projectName, quantity });
      return res.status(400).json({ error: '프로젝트명과 수량은 필수입니다.' });
    }
    
    console.log('✅ [mj-project] 프로젝트 등록 데이터 검증 완료:', {
      projectName,
      description,
      quantity,
      targetPrice,
      projectOwnerId,
      projectCreatorId
    });
    
    // 1. MJ 프로젝트 생성
    const [projectResult] = await connection.execute(
      'INSERT INTO mj_project (project_name, description, quantity, target_price, user_id, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [projectName, description || null, quantity, targetPrice || null, projectOwnerId, projectCreatorId]
    );
    
    const projectId = projectResult.insertId;
    console.log('✅ [mj-project] 프로젝트 생성 완료, ID:', projectId);
    
    // 2. 참고링크 저장
    if (parsedReferenceLinks && parsedReferenceLinks.length > 0) {
      console.log('🔗 [mj-project] 참고링크 저장 시작:', parsedReferenceLinks.length, '개');
      for (const link of parsedReferenceLinks) {
        await connection.execute(
          'INSERT INTO mj_project_reference_links (project_id, url) VALUES (?, ?)',
          [projectId, link.url]
        );
      }
      console.log('✅ [mj-project] 참고링크 저장 완료');
    }
    
    // 3. 이미지 저장
    if (req.files && req.files.length > 0) {
      console.log('🖼️ [mj-project] 이미지 저장 시작:', req.files.length, '개');
      for (const file of req.files) {
        console.log('📁 [mj-project] 이미지 파일 정보:', {
          filename: file.filename,
          originalname: file.originalname,
          path: file.path,
          size: file.size
        });
        
        await connection.execute(
          'INSERT INTO mj_project_images (project_id, file_name, file_path, original_name) VALUES (?, ?, ?, ?)',
          [projectId, file.filename, file.filename, file.originalname]
        );
      }
      console.log('✅ [mj-project] 이미지 저장 완료');
    }
    
    await connection.commit();
    console.log('✅ [mj-project] 프로젝트 등록 트랜잭션 커밋 완료');
    
    res.status(201).json({
      message: 'MJ 프로젝트가 성공적으로 등록되었습니다.',
      projectId: projectId
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ [mj-project] 프로젝트 등록 오류:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno
    });
    res.status(500).json({ 
      error: '프로젝트 등록 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : '내부 서버 오류'
    });
  } finally {
    connection.release();
  }
});

// MJ 프로젝트 목록 조회
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const isAdmin = req.user.isAdmin;
    const { 
      search, 
      page = 1, 
      limit = 10, 
      orderStatus, 
      shippingStatus, 
      warehouseStatus 
    } = req.query;
    
    let sql = `
      SELECT 
        p.id,
        p.project_name,
        p.description,
        p.quantity,
        p.target_price,
        p.unit_price,
        p.total_amount,
        p.status,
        p.is_order_completed,
        p.actual_order_date,
        p.expected_factory_shipping_date,
        p.actual_factory_shipping_date,
        p.factory_shipping_status,
        p.entry_quantity,
        p.export_quantity,
        p.remain_quantity,
        p.supplier_name,
        p.user_id,
        p.created_by,
        p.created_at,
        u.username,
        u.company_name,
        c.username as created_by_username,
        c.company_name as created_by_company,
        (SELECT file_name FROM mj_project_images WHERE project_id = p.id ORDER BY id ASC LIMIT 1) as representative_image_filename,
        (SELECT COALESCE(SUM(quantity), 0) FROM warehouse_entries WHERE project_id = p.id) as warehouse_quantity
      FROM mj_project p
      JOIN users u ON p.user_id = u.id
      JOIN users c ON p.created_by = c.id
    `;
    
    let params = [];
    let whereConditions = [];
    
    // 사용자 권한 확인 및 필터링 조건 설정
    let isMjPartner = false;
    
    if (!isAdmin) {
      // MJ유통 파트너스 사용자인지 확인
      const [userInfo] = await pool.execute(
        'SELECT partner_name FROM users WHERE id = ?',
        [userId]
      );
      
      if (userInfo.length > 0 && userInfo[0].partner_name === 'MJ유통') {
        // MJ유통 파트너스 사용자는 모든 프로젝트 조회 가능
        isMjPartner = true;
        console.log('🔍 [mj-project] MJ유통 파트너스 사용자 - 모든 프로젝트 조회 권한 부여');
      } else {
        // 일반 사용자는 자신의 프로젝트만 조회
        whereConditions.push('p.user_id = ?');
        params.push(userId);
        console.log('🔍 [mj-project] 일반 사용자 - 자신의 프로젝트만 조회');
      }
    } else {
      console.log('🔍 [mj-project] 관리자 - 모든 프로젝트 조회 권한');
    }
    
    // 검색 조건 추가
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push('(p.project_name LIKE ? OR p.supplier_name LIKE ?)');
      params.push(searchTerm, searchTerm);
    }
    
    // 발주상태 필터 추가
    if (orderStatus && orderStatus !== 'all') {
      if (orderStatus === 'completed') {
        whereConditions.push('p.is_order_completed = 1');
      } else if (orderStatus === 'waiting') {
        whereConditions.push('p.is_order_completed = 0');
      }
    }
    
    // 공장출고 상태 필터 추가
    if (shippingStatus && shippingStatus !== 'all') {
      if (shippingStatus === '미설정') {
        whereConditions.push('(p.factory_shipping_status IS NULL OR p.factory_shipping_status = "")');
      } else {
        whereConditions.push('p.factory_shipping_status = ?');
        params.push(shippingStatus);
      }
    }
    
    // 입고상태 필터 추가 (서브쿼리로 warehouse_quantity 계산)
    if (warehouseStatus && warehouseStatus !== 'all') {
      const warehouseSubquery = `
        (SELECT COALESCE(SUM(quantity), 0) FROM warehouse_entries WHERE project_id = p.id)
      `;
      
      switch (warehouseStatus) {
        case '입고완료':
          whereConditions.push(`(${warehouseSubquery} >= p.quantity AND ${warehouseSubquery} > 0)`);
          break;
        case '입고중':
          whereConditions.push(`(p.quantity > ${warehouseSubquery} AND ${warehouseSubquery} > 0)`);
          break;
        case '입고 대기':
          whereConditions.push(`${warehouseSubquery} = 0`);
          break;
      }
    }
    
    // WHERE 조건 적용
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    sql += ' ORDER BY COALESCE(p.actual_order_date, p.created_at) DESC';
    
    // 페이지네이션 적용
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [projects] = await pool.execute(sql, params);
    
    // 총 개수 조회 (페이지네이션을 위한)
    let countSql = `
      SELECT COUNT(*) as total
      FROM mj_project p
      JOIN users u ON p.user_id = u.id
      JOIN users c ON p.created_by = c.id
    `;
    
    let countParams = [];
    let countWhereConditions = [];
    
    // 사용자 권한에 따른 총 개수 조회 필터링 조건 설정
    if (!isAdmin) {
      if (isMjPartner) {
        // MJ유통 파트너스 사용자는 모든 프로젝트 조회 가능
        // 필터링 조건 추가하지 않음
        console.log('🔍 [mj-project] 총 개수 조회 - MJ유통 파트너스 사용자 권한');
      } else {
        // 일반 사용자는 자신의 프로젝트만 조회
        countWhereConditions.push('p.user_id = ?');
        countParams.push(userId);
        console.log('🔍 [mj-project] 총 개수 조회 - 일반 사용자 권한');
      }
    } else {
      console.log('🔍 [mj-project] 총 개수 조회 - 관리자 권한');
    }
    
    // 검색 조건 추가
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      countWhereConditions.push('(p.project_name LIKE ? OR p.supplier_name LIKE ?)');
      countParams.push(searchTerm, searchTerm);
    }
    
    // 발주상태 필터 추가
    if (orderStatus && orderStatus !== 'all') {
      if (orderStatus === 'completed') {
        countWhereConditions.push('p.is_order_completed = 1');
      } else if (orderStatus === 'waiting') {
        countWhereConditions.push('p.is_order_completed = 0');
      }
    }
    
    // 공장출고 상태 필터 추가
    if (shippingStatus && shippingStatus !== 'all') {
      if (shippingStatus === '미설정') {
        countWhereConditions.push('(p.factory_shipping_status IS NULL OR p.factory_shipping_status = "")');
      } else {
        countWhereConditions.push('p.factory_shipping_status = ?');
        countParams.push(shippingStatus);
      }
    }
    
    // 입고상태 필터 추가 (서브쿼리로 warehouse_quantity 계산)
    if (warehouseStatus && warehouseStatus !== 'all') {
      const warehouseSubquery = `
        (SELECT COALESCE(SUM(quantity), 0) FROM warehouse_entries WHERE project_id = p.id)
      `;
      
      switch (warehouseStatus) {
        case '입고완료':
          countWhereConditions.push(`(${warehouseSubquery} >= p.quantity AND ${warehouseSubquery} > 0)`);
          break;
        case '입고중':
          countWhereConditions.push(`(p.quantity > ${warehouseSubquery} AND ${warehouseSubquery} > 0)`);
          break;
        case '입고 대기':
          countWhereConditions.push(`${warehouseSubquery} = 0`);
          break;
      }
    }
    
    // WHERE 조건 적용
    if (countWhereConditions.length > 0) {
      countSql += ' WHERE ' + countWhereConditions.join(' AND ');
    }
    
    const [countResult] = await pool.execute(countSql, countParams);
    const totalCount = countResult[0].total;
    
    // 이미지 정보를 SearchModal과 동일한 방식으로 구성
    const projectsWithImages = projects.map(project => {
      if (project.representative_image_filename) {
        return {
          ...project,
          representative_image: {
            filename: project.representative_image_filename,
            url: `/api/warehouse/image/${project.representative_image_filename}`,
            fallback_url: `/uploads/project/mj/registImage/${project.representative_image_filename}`
          }
        };
      }
      return project;
    });
    
    res.json({ 
      success: true, 
      projects: projectsWithImages,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('MJ 프로젝트 목록 조회 오류:', error);
    res.status(500).json({ success: false, error: '프로젝트 목록 조회 중 오류가 발생했습니다.' });
  }
 });

// MJ 프로젝트 상세 조회 (탭별 최적화)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tab } = req.query; // 탭 정보를 쿼리 파라미터로 받음
    
    // 프로젝트 기본 정보
    const [projects] = await pool.execute(`
      SELECT 
        p.*,
        u.username,
        u.company_name,
        u.phone,
        u.email,
        u.contact_person,
        u.partner_name,
        c.username as created_by_username,
        c.company_name as created_by_company
      FROM mj_project p
      JOIN users u ON p.user_id = u.id
      JOIN users c ON p.created_by = c.id
      WHERE p.id = ?
    `, [id]);
    
    if (projects.length === 0) {
      return res.status(404).json({ success: false, error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    const project = projects[0];
    
    // 탭별로 필요한 데이터만 조회
    let additionalData = {};
    
    // 기본정보 탭 또는 전체 데이터가 필요한 경우
    if (!tab || tab === 'basic') {
      // 참고링크 조회
      const [links] = await pool.execute(
        'SELECT * FROM mj_project_reference_links WHERE project_id = ?',
        [id]
      );
      
      // 이미지 조회
      const [images] = await pool.execute(
        'SELECT * FROM mj_project_images WHERE project_id = ?',
        [id]
      );
      
      // 이미지 정보를 SearchModal과 동일한 방식으로 구성
      const imagesWithUrls = images.map(image => ({
        ...image,
        url: `/api/warehouse/image/${image.file_name}`,
        fallback_url: `/uploads/project/mj/registImage/${image.file_name}`
      }));
      
      additionalData = {
        referenceLinks: links,
        images: imagesWithUrls
      };
    }
    
    // 결제정보 탭인 경우 추가 결제 데이터 조회
    if (tab === 'payment' || tab === 'paymentInfo') {
      // 결제 정보 조회 (JSON 형식)
      const [paymentRows] = await pool.execute(`
        SELECT payment_status, payment_dates, payment_amounts
        FROM mj_project_payments
        WHERE project_id = ?
      `, [id]);
      
      if (paymentRows.length > 0) {
        const row = paymentRows[0];
        additionalData.paymentData = {
          payment_status: row.payment_status ? JSON.parse(row.payment_status) : {},
          payment_dates: row.payment_dates ? JSON.parse(row.payment_dates) : {},
          payment_amounts: row.payment_amounts ? JSON.parse(row.payment_amounts) : {}
        };
      }
    }
    
    // 물류 정보 탭인 경우 추가 물류 데이터 조회
    if (tab === 'shipping') {
      // 입고 히스토리 조회
      const [entryHistory] = await pool.execute(`
        SELECT 
          id,
          quantity,
          entry_date,
          created_at
        FROM warehouse_entries 
        WHERE project_id = ? 
        ORDER BY entry_date ASC, created_at ASC
      `, [id]);
      
      // 출고 히스토리 조회
      const [exportHistory] = await pool.execute(`
        SELECT 
          id,
          SUM(box_count * packaging_count * packaging_method) as quantity,
          pl_date as export_date,
          'completed' as status,
          created_at
        FROM mj_packing_list 
        WHERE project_id = ? 
        GROUP BY pl_date, created_at
        ORDER BY export_date ASC, created_at ASC
      `, [id]);
      
      additionalData.logisticData = {
        entryHistory,
        exportHistory,
        totalEntryQuantity: entryHistory.reduce((sum, entry) => sum + Number(entry.quantity), 0),
        totalExportQuantity: exportHistory.reduce((sum, exportItem) => sum + Number(exportItem.quantity), 0)
      };
    }
    
    console.log(`✅ 프로젝트 ${id} 상세 조회 완료 (탭: ${tab || '전체'})`);
    
    res.json({
      success: true,
      project: {
        ...project,
        ...additionalData
      }
    });
    
  } catch (error) {
    console.error('MJ 프로젝트 상세 조회 오류:', error);
    res.status(500).json({ success: false, error: '프로젝트 상세 조회 중 오류가 발생했습니다.' });
  }
});

// MJ 프로젝트 상태 업데이트
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
    }
    
    await pool.execute(
      'UPDATE mj_project SET status = ? WHERE id = ?',
      [status, id]
    );
    
    res.json({ message: '프로젝트 상태가 업데이트되었습니다.' });
    
  } catch (error) {
    console.error('MJ 프로젝트 상태 업데이트 오류:', error);
    res.status(500).json({ error: '프로젝트 상태 업데이트 중 오류가 발생했습니다.' });
  }
});

// MJ 프로젝트 정보 업데이트 (기존 API - 웹용)
router.patch('/:id', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    const updateData = req.body;
    
    console.log('📝 [mj-project] 프로젝트 정보 업데이트 요청:', {
      projectId,
      userId: req.user?.userId,
      updateData
    });
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      console.log('❌ [mj-project] 프로젝트를 찾을 수 없음:', projectId);
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (프로젝트 소유자 또는 admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      console.log('❌ [mj-project] 사용자를 찾을 수 없음:', req.user.userId);
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin && project[0].user_id !== req.user.userId) {
      console.log('❌ [mj-project] 권한 없음:', {
        isAdmin: user[0].is_admin,
        projectUserId: project[0].user_id,
        requestUserId: req.user.userId
      });
      return res.status(403).json({ error: '프로젝트를 수정할 권한이 없습니다.' });
    }
    
    // 허용된 필드들만 업데이트 (웹용 - 모든 필드)
    const allowedFields = [
      'unit_weight', 'packaging_method', 'box_dimensions', 'box_weight', 'factory_delivery_days',
      'supplier_name', 'actual_order_date', 'expected_factory_shipping_date', 'actual_factory_shipping_date', 'is_order_completed',
      'is_factory_shipping_completed', 'factory_shipping_status',
      'project_name', 'description', 'quantity', 'target_price', 'unit_price', 'reference_links'
    ];

    // 업데이트할 데이터 필터링
    const filteredData = {};
    for (const field of allowedFields) {
      if (updateData.hasOwnProperty(field)) {
        filteredData[field] = updateData[field];
      }
    }

    console.log('🔍 [mj-project] 필터링된 업데이트 데이터:', filteredData);

    // 실제 공장 출고일이 설정되면 공장 출고 완료 상태를 true로 자동 업데이트
    if (filteredData.actual_factory_shipping_date && filteredData.actual_factory_shipping_date !== null) {
      filteredData.is_factory_shipping_completed = true;
    }

    // 업데이트 실행
    if (Object.keys(filteredData).length > 0) {
      const updateFields = Object.keys(filteredData).map(field => `${field} = ?`).join(', ');
      const updateValues = Object.values(filteredData);
      
      const query = `UPDATE mj_project SET ${updateFields}, updated_at = NOW() WHERE id = ?`;
      console.log('🔧 [mj-project] 실행할 SQL:', {
        query,
        values: [...updateValues, projectId]
      });
      
      await connection.execute(query, [...updateValues, projectId]);
      
      console.log('✅ [mj-project] 프로젝트 정보 업데이트 완료:', projectId);
    } else {
      console.log('⚠️ [mj-project] 업데이트할 데이터 없음');
    }
    
    res.json({ 
      success: true,
      message: '프로젝트 정보가 성공적으로 업데이트되었습니다.',
      updatedFields: Object.keys(filteredData)
    });
    
  } catch (error) {
    console.error('❌ [mj-project] 프로젝트 정보 업데이트 오류:', error);
    console.error('오류 상세:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
    res.status(500).json({ 
      error: '프로젝트 정보 업데이트 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

// MJ 프로젝트 정보 업데이트 (모바일 전용 API)
router.patch('/:id/mobile', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    const updateData = req.body;
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin) {
      return res.status(403).json({ error: 'admin 권한이 필요합니다.' });
    }
    
    // 모바일에서 수정 가능한 필드들만 (실제 DB에 존재하는 필드들)
    const mobileAllowedFields = [
      'description', 'quantity', 'unit_price', 
      'supplier_name', 'factory_delivery_days'
    ];

    // 업데이트할 데이터 필터링
    const filteredData = {};
    for (const field of mobileAllowedFields) {
      if (updateData.hasOwnProperty(field)) {
        filteredData[field] = updateData[field];
      }
    }

    // 업데이트 실행
    if (Object.keys(filteredData).length > 0) {
      const updateFields = Object.keys(filteredData).map(field => `${field} = ?`).join(', ');
      const updateValues = Object.values(filteredData);
      
      await connection.execute(
        `UPDATE mj_project SET ${updateFields}, updated_at = NOW() WHERE id = ?`,
        [...updateValues, projectId]
      );
      
      console.log('📱 [mj-project] 모바일 업데이트 완료:', {
        projectId,
        updatedFields: Object.keys(filteredData),
        updateValues
      });
    }
    
    res.json({ 
      success: true,
      message: '프로젝트 정보가 성공적으로 업데이트되었습니다.',
      updatedFields: Object.keys(filteredData)
    });
    
  } catch (error) {
    console.error('MJ 프로젝트 모바일 업데이트 오류:', error);
    res.status(500).json({ error: '프로젝트 정보 업데이트 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// 제품 이미지/비디오 업로드
router.post('/:id/real-images', authMiddleware, realImageUpload.array('files', 10), async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (프로젝트 소유자 또는 admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin && project[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: '프로젝트를 수정할 권한이 없습니다.' });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '업로드할 파일이 없습니다.' });
    }
    
    // 업로드된 파일 정보 수집
    const uploadedFiles = req.files.map(file => ({
      original_name: file.originalname,
      file_path: file.path,
      file_size: file.size,
      mime_type: file.mimetype,
      project_id: projectId
    }));
    
    // 데이터베이스에 파일 정보 저장
    for (const fileInfo of uploadedFiles) {
      await connection.execute(
        'INSERT INTO mj_project_real_images (original_name, file_path, file_size, mime_type, project_id) VALUES (?, ?, ?, ?, ?)',
        [fileInfo.original_name, fileInfo.file_path, fileInfo.file_size, fileInfo.mime_type, fileInfo.project_id]
      );
    }
    
    res.json({ 
      message: `${uploadedFiles.length}개 파일이 성공적으로 업로드되었습니다.`,
      files: uploadedFiles
    });
    
  } catch (error) {
    console.error('제품 이미지 업로드 오류:', error);
    res.status(500).json({ error: '제품 이미지 업로드 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// 제품 이미지/비디오 조회
router.get('/:id/real-images', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (프로젝트 소유자 또는 admin만 조회 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin && project[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: '프로젝트를 조회할 권한이 없습니다.' });
    }
    
    // 프로젝트의 모든 이미지/비디오 조회
    const [files] = await connection.execute(
      'SELECT * FROM mj_project_real_images WHERE project_id = ? ORDER BY created_at DESC',
      [projectId]
    );
    
    res.json({ files });
    
  } catch (error) {
    console.error('제품 이미지 조회 오류:', error);
    res.status(500).json({ error: '제품 이미지 조회 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// 제품 이미지/비디오 삭제
router.delete('/:id/real-images/:imageId', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id: projectId, imageId } = req.params;
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (프로젝트 소유자 또는 admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin && project[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: '프로젝트를 수정할 권한이 없습니다.' });
    }
    
    // 이미지 정보 조회
    const [image] = await connection.execute(
      'SELECT * FROM mj_project_real_images WHERE id = ? AND project_id = ?',
      [imageId, projectId]
    );
    
    if (image.length === 0) {
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }
    
    // 파일 시스템에서 파일 삭제
    if (fs.existsSync(image[0].file_path)) {
      fs.unlinkSync(image[0].file_path);
    }
    
    // 데이터베이스에서 이미지 정보 삭제
    await connection.execute(
      'DELETE FROM mj_project_real_images WHERE id = ?',
      [imageId]
    );
    
    res.json({ message: '이미지가 성공적으로 삭제되었습니다.' });
    
  } catch (error) {
    console.error('제품 이미지 삭제 오류:', error);
    res.status(500).json({ error: '제품 이미지 삭제 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// 상품 이미지 추가 (registImage)
router.post('/:id/product-images', authMiddleware, handleMulterError, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    
    console.log('📸 [mj-project] 상품 이미지 추가 요청:', {
      projectId,
      filesCount: req.files?.length || 0
    });
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin) {
      return res.status(403).json({ error: 'admin 권한이 필요합니다.' });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '업로드할 이미지를 선택해주세요.' });
    }
    
    // 이미지 정보를 DB에 저장
    const uploadedImages = [];
    for (const file of req.files) {
      const [result] = await connection.execute(
        'INSERT INTO mj_project_images (project_id, file_name, file_path, original_name) VALUES (?, ?, ?, ?)',
        [projectId, file.filename, file.filename, file.originalname]
      );
      
      uploadedImages.push({
        id: result.insertId,
        file_name: file.filename,
        original_name: file.originalname,
        url: `/api/warehouse/image/${file.filename}`,
        fallback_url: `/uploads/project/mj/registImage/${file.filename}`
      });
    }
    
    console.log('✅ [mj-project] 상품 이미지 추가 완료:', uploadedImages.length);
    
    res.json({ 
      success: true,
      message: '상품 이미지가 성공적으로 추가되었습니다.',
      images: uploadedImages
    });
    
  } catch (error) {
    console.error('❌ [mj-project] 상품 이미지 추가 오류:', error);
    res.status(500).json({ error: '상품 이미지 추가 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// 상품 이미지 변경 (registImage)
router.patch('/:id/product-images/:imageId', authMiddleware, handleMulterError, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id: projectId, imageId } = req.params;
    
    console.log('🔄 [mj-project] 상품 이미지 변경 요청:', {
      projectId,
      imageId,
      hasFile: !!req.files && req.files.length > 0
    });
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin) {
      return res.status(403).json({ error: 'admin 권한이 필요합니다.' });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '새 이미지를 선택해주세요.' });
    }
    
    // 기존 이미지 정보 조회
    const [image] = await connection.execute(
      'SELECT * FROM mj_project_images WHERE id = ? AND project_id = ?',
      [imageId, projectId]
    );
    
    if (image.length === 0) {
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }
    
    // 기존 파일 삭제
    const oldFilePath = path.join(__dirname, '..', 'uploads', 'project', 'mj', 'registImage', image[0].file_name);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
      console.log('🗑️ [mj-project] 기존 파일 삭제 완료:', oldFilePath);
    }
    
    // 새 이미지 정보로 업데이트
    const newFile = req.files[0];
    await connection.execute(
      'UPDATE mj_project_images SET file_name = ?, file_path = ?, original_name = ? WHERE id = ?',
      [newFile.filename, newFile.filename, newFile.originalname, imageId]
    );
    
    console.log('✅ [mj-project] 상품 이미지 변경 완료:', {
      imageId,
      oldFileName: image[0].file_name,
      newFileName: newFile.filename
    });
    
    const updatedImage = {
      id: imageId,
      file_name: newFile.filename,
      original_name: newFile.originalname,
      url: `/api/warehouse/image/${newFile.filename}`,
      fallback_url: `/uploads/project/mj/registImage/${newFile.filename}`
    };
    
    res.json({ 
      success: true,
      message: '상품 이미지가 성공적으로 변경되었습니다.',
      image: updatedImage
    });
    
  } catch (error) {
    console.error('❌ [mj-project] 상품 이미지 변경 오류:', error);
    res.status(500).json({ error: '상품 이미지 변경 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// 상품 이미지 삭제 (registImage)
router.delete('/:id/product-images/:imageId', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id: projectId, imageId } = req.params;
    
    console.log('🗑️ [mj-project] 상품 이미지 삭제 요청:', {
      projectId,
      imageId
    });
    
    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin) {
      return res.status(403).json({ error: 'admin 권한이 필요합니다.' });
    }
    
    // 이미지 정보 조회
    const [image] = await connection.execute(
      'SELECT * FROM mj_project_images WHERE id = ? AND project_id = ?',
      [imageId, projectId]
    );
    
    if (image.length === 0) {
      return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
    }
    
    // 파일 시스템에서 파일 삭제
    const filePath = path.join(__dirname, '..', 'uploads', 'project', 'mj', 'registImage', image[0].file_name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ [mj-project] 파일 삭제 완료:', filePath);
    }
    
    // 데이터베이스에서 이미지 정보 삭제
    await connection.execute(
      'DELETE FROM mj_project_images WHERE id = ?',
      [imageId]
    );
    
    console.log('✅ [mj-project] 상품 이미지 삭제 완료:', imageId);
    
    res.json({ 
      success: true,
      message: '상품 이미지가 성공적으로 삭제되었습니다.' 
    });
    
  } catch (error) {
    console.error('❌ [mj-project] 상품 이미지 삭제 오류:', error);
    res.status(500).json({ error: '상품 이미지 삭제 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// Delivery 데이터 저장
router.post('/:id/delivery', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    
    // Delivery 데이터 추출 - Frontend 필드명과 매핑
    const {
      is_order_completed,  // Frontend에서 전송하는 필드명
      actual_order_date,   // Frontend에서 전송하는 필드명
      expected_factory_shipping_date,
      changed_factory_shipping_date,
      is_factory_shipping_completed,
      actual_factory_shipping_date,
      factory_shipping_status,
      delivery_status,
      balance_due_date,    // 잔금 지급예정일
      payment_due_dates    // 결제예정일 JSON
    } = req.body;



    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }


    
    // 권한 확인 (admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin) {
      return res.status(403).json({ error: 'Delivery 데이터 수정은 admin 권한이 필요합니다.' });
    }

    // 날짜 형식 처리 함수 - Timezone 문제 해결
    const processDate = (dateValue) => {
      // undefined인 경우 undefined를 그대로 반환 (null로 변환하지 않음)
      if (dateValue === undefined) {
        return undefined;
      }
      
      // null이나 빈 문자열인 경우 null 반환
      if (dateValue === null || dateValue === '') {
        return null;
      }
      
      try {
        // 이미 YYYY-MM-DD 형식인 경우 그대로 사용 (Frontend에서 한국 시간대로 전송)
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          return dateValue;
        }
        
        // ISO 문자열인 경우 한국 시간대로 처리
        if (typeof dateValue === 'string' && dateValue.includes('T')) {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            return null;
          }
          
          // 한국 시간대(KST)로 변환하여 YYYY-MM-DD 형식 반환
          const kstDate = convertUTCToKST(dateValue);
          return kstDate ? formatDate(kstDate) : null;
        }
        
        // Date 객체인 경우
        if (dateValue instanceof Date) {
          if (isNaN(dateValue.getTime())) {
            return null;
          }
          // 한국 시간대로 변환
          const kstDate = convertUTCToKST(dateValue);
          return kstDate ? formatDate(kstDate) : null;
        }
        
        return null;
      } catch (error) {
        return null;
      }
    };

    // 날짜 데이터 처리
    const processedActualOrderDate = processDate(actual_order_date);
    const processedExpectedFactoryShippingDate = processDate(expected_factory_shipping_date);
    const processedChangedFactoryShippingDate = processDate(changed_factory_shipping_date);
    const processedActualFactoryShippingDate = processDate(actual_factory_shipping_date);
    const processedBalanceDueDate = processDate(balance_due_date);


    



    // Delivery 데이터 업데이트 - 부분 업데이트 지원
    let updateFields = [];
    let updateValues = [];
    
    // 각 필드가 undefined가 아닌 경우에만 업데이트 (null 값은 허용하되 undefined는 제외)
    if (is_order_completed !== undefined) {
      updateFields.push('is_order_completed = ?');
      updateValues.push(is_order_completed);
    }
    
    if (processedActualOrderDate !== undefined) {
      updateFields.push('actual_order_date = ?');
      updateValues.push(processedActualOrderDate);
    }
    
    if (processedExpectedFactoryShippingDate !== undefined) {
      updateFields.push('expected_factory_shipping_date = ?');
      updateValues.push(processedExpectedFactoryShippingDate);
    }
    
    if (processedChangedFactoryShippingDate !== undefined) {
      updateFields.push('changed_factory_shipping_date = ?');
      updateValues.push(processedChangedFactoryShippingDate);
    }
    
    if (is_factory_shipping_completed !== undefined) {
      updateFields.push('is_factory_shipping_completed = ?');
      updateValues.push(is_factory_shipping_completed);
    }
    
    if (processedActualFactoryShippingDate !== undefined) {
      updateFields.push('actual_factory_shipping_date = ?');
      updateValues.push(processedActualFactoryShippingDate);
    }
    
    if (factory_shipping_status !== undefined) {
      updateFields.push('factory_shipping_status = ?');
      updateValues.push(factory_shipping_status);
    }
    
    if (delivery_status !== undefined) {
      updateFields.push('delivery_status = ?');
      updateValues.push(delivery_status);
    }
    
    if (processedBalanceDueDate !== undefined) {
      updateFields.push('balance_due_date = ?');
      updateValues.push(processedBalanceDueDate);
    }
    
    if (payment_due_dates !== undefined) {
      updateFields.push('payment_due_dates = ?');
      updateValues.push(payment_due_dates);
    }
    
    // updated_at은 항상 업데이트
    updateFields.push('updated_at = NOW()');
    
    // projectId 추가
    updateValues.push(projectId);
    
    if (updateFields.length > 1) { // updated_at + projectId 외에 다른 필드가 있는 경우
      const updateSQL = `UPDATE mj_project SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await connection.execute(updateSQL, updateValues);
      
      // 업데이트 확인을 위한 추가 쿼리 실행
      if (processedChangedFactoryShippingDate !== undefined) {
        const [verifyResult] = await connection.execute(
          'SELECT changed_factory_shipping_date FROM mj_project WHERE id = ?',
          [projectId]
        );
      }
    }
    
    // 저장된 데이터 확인
    const [savedProject] = await connection.execute(
      'SELECT is_order_completed, actual_order_date, expected_factory_shipping_date, changed_factory_shipping_date, is_factory_shipping_completed, actual_factory_shipping_date, factory_shipping_status, delivery_status FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (savedProject.length > 0) {
      // 저장된 데이터 확인 완료
    }
    
    res.json({ message: 'Delivery 데이터가 성공적으로 저장되었습니다.' });
    
  } catch (error) {
    console.error('Delivery 데이터 저장 오류:', error);
    res.status(500).json({ error: 'Delivery 데이터 저장 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// Payment 데이터 저장
router.post('/:id/payment', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    // Payment 데이터 추출
    const {
      unitPrice,
      selectedFeeRate,
      paymentStatus,
      paymentDates,
      balanceDueDate,
      advanceDueDate,
      paymentDueDates,
      factoryShippingCost,
      subtotal,
      fee,
      totalAmount,
      advancePayment,
      additionalCostItems
    } = req.body;

    // 숫자 타입으로 변환 (undefined 방지)
    const numericUnitPrice = Number(unitPrice) || 0;
    const numericSelectedFeeRate = Number(selectedFeeRate) || 0;
    const numericFactoryShippingCost = Number(factoryShippingCost) || 0;
    const numericSubtotal = Number(subtotal) || 0;
    const numericFee = Number(fee) || 0;
    const numericTotalAmount = Number(totalAmount) || 0;
    const numericAdvancePayment = Number(advancePayment) || 0;
    
    // 배열 및 객체 기본값 설정 (undefined 방지)
    const safePaymentStatus = paymentStatus || {};
    const safePaymentDates = paymentDates || [];
    const safePaymentDueDates = paymentDueDates || [];
    const safeAdditionalCostItems = additionalCostItems || '[]';

    // 프로젝트 존재 여부 확인
    const [project] = await connection.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [projectId]
    );
    
    if (project.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    // 권한 확인 (프로젝트 소유자 또는 admin만 수정 가능)
    const [user] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (user.length === 0) {
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    if (!user[0].is_admin && project[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: '프로젝트를 수정할 권한이 없습니다.' });
    }
    
    // 날짜 형식 처리 함수
    const processDate = (dateValue) => {
      if (!dateValue || dateValue === '') {
        return null;
      }
      
      // ISO 문자열인 경우 YYYY-MM-DD 형식으로 변환
      if (typeof dateValue === 'string' && dateValue.includes('T')) {
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            return null; // 유효하지 않은 날짜
          }
          return date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        } catch (error) {
          console.error('날짜 변환 오류:', error);
          return null;
        }
      }
      
      // 이미 YYYY-MM-DD 형식인 경우 그대로 사용
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      
      return null;
    };
    
    // balance_due_date 처리
    const processedBalanceDueDate = processDate(balanceDueDate);
    
    // advance_due_date 처리
    const processedAdvanceDueDate = processDate(advanceDueDate);
    
    // balance_amount 계산
    let totalAdditionalCosts = 0;
    if (safeAdditionalCostItems && safeAdditionalCostItems !== '[]') {
      try {
        const items = JSON.parse(safeAdditionalCostItems);
        totalAdditionalCosts = items.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
      } catch (error) {
        console.error('추가 비용 항목 파싱 실패:', error);
        totalAdditionalCosts = 0;
      }
    }
    
    const numericBalanceAmount = numericFee + numericFactoryShippingCost + totalAdditionalCosts;
    
    // balance_amount 계산 완료

    // Payment 데이터 업데이트
    await connection.execute(
      `UPDATE mj_project SET 
        unit_price = ?,
        fee_rate = ?,
        payment_status = ?,
        payment_dates = ?,
        balance_due_date = ?,
        advance_due_date = ?,
        payment_due_dates = ?,
        factory_shipping_cost = ?,
        subtotal = ?,
        fee = ?,
        balance_amount = ?,
        total_amount = ?,
        advance_payment = ?,
        additional_cost_items = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [
        numericUnitPrice,
        numericSelectedFeeRate,
        JSON.stringify(safePaymentStatus),
        JSON.stringify(safePaymentDates),
        processedBalanceDueDate,
        processedAdvanceDueDate,
        JSON.stringify(safePaymentDueDates),
        numericFactoryShippingCost,
        numericSubtotal,
        numericFee,
        numericBalanceAmount,
        numericTotalAmount,
        numericAdvancePayment,
        safeAdditionalCostItems,
        projectId
      ]
    );

    // Payment 지급일 데이터는 이제 Finance API에서 mj_project 테이블을 직접 읽어와서 표시
    

    
    // additional_cost_items가 있는 경우 기존 additional_cost 필드도 동기화 (하위 호환성)
    if (safeAdditionalCostItems && safeAdditionalCostItems !== '[]') {
      try {
        const items = JSON.parse(safeAdditionalCostItems);
        if (items && items.length > 0) {
          const totalAdditionalCost = items.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
          const firstItemDescription = items[0]?.description || '';
          
          await connection.execute(
            'UPDATE mj_project SET additional_cost = ?, additional_cost_description = ? WHERE id = ?',
            [totalAdditionalCost, firstItemDescription, projectId]
          );
        }
      } catch (error) {
        console.error('추가 비용 항목 동기화 실패:', error);
      }
    }
    
    res.json({ message: 'Payment 데이터가 성공적으로 저장되었습니다.' });
    
  } catch (error) {
    console.error('Payment 데이터 저장 오류:', error);
    res.status(500).json({ error: 'Payment 데이터 저장 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// MJ 프로젝트 패킹리스트 생성
router.post('/:id/packing-list', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { packingMethod, boxDimensions, boxWeight } = req.body;
    
    // 프로젝트 존재 여부 확인
    const [projects] = await pool.execute(
      'SELECT * FROM mj_project WHERE id = ?',
      [id]
    );
    
    if (projects.length === 0) {
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    const project = projects[0];
    
    // 패킹리스트 정보 업데이트
    await pool.execute(`
      UPDATE mj_project 
      SET 
        packing_method = ?,
        box_dimensions = ?,
        box_weight = ?,
        packing_list_created = 1,
        updated_at = NOW()
      WHERE id = ?
    `, [packingMethod, boxDimensions, boxWeight, id]);
    
    // 패킹리스트 PDF 생성 로직 (실제 구현에서는 PDF 생성 라이브러리 사용)
    // 여기서는 간단한 JSON 응답으로 대체
    
    res.json({ 
      success: true, 
      message: '패킹리스트가 생성되었습니다.',
      packingList: {
        projectId: id,
        projectName: project.project_name,
        quantity: project.quantity,
        packingMethod,
        boxDimensions,
        boxWeight,
        createdAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('패킹리스트 생성 오류:', error);
    res.status(500).json({ error: '패킹리스트 생성 중 오류가 발생했습니다.' });
  }
});

// MJ 프로젝트 패킹리스트 삭제
router.delete('/:id/packing-list', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 패킹리스트 정보 초기화
    await pool.execute(`
      UPDATE mj_project 
      SET 
        packing_method = NULL,
        box_dimensions = NULL,
        box_weight = NULL,
        packing_list_created = 0,
        updated_at = NOW()
      WHERE id = ?
    `, [id]);
    
    res.json({ 
      success: true, 
      message: '패킹리스트가 삭제되었습니다.' 
    });
    
  } catch (error) {
    console.error('패킹리스트 삭제 오류:', error);
    res.status(500).json({ error: '패킹리스트 삭제 중 오류가 발생했습니다.' });
  }
});

// MJ 프로젝트 entry_quantity 업데이트
router.put('/:id/entry-quantity', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { entry_quantity } = req.body;
    
    devLog('🔄 [mj-project] entry_quantity 업데이트 시작:', { 
      projectId: id, 
      entry_quantity,
      requestBody: req.body 
    });
    
    // 프로젝트 존재 여부 확인
    const [projects] = await pool.execute(
      'SELECT id, project_name FROM mj_project WHERE id = ?',
      [id]
    );
    
    if (projects.length === 0) {
      devLog('❌ [mj-project] 프로젝트를 찾을 수 없음:', { projectId: id });
      return res.status(404).json({ error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    devLog('✅ [mj-project] 프로젝트 확인 완료:', { 
      projectId: id, 
      projectName: projects[0].project_name 
    });
    
    // entry_quantity 업데이트
    await pool.execute(`
      UPDATE mj_project 
      SET 
        entry_quantity = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [entry_quantity, id]);
    
    devLog('✅ [mj-project] entry_quantity 업데이트 완료:', { 
      projectId: id, 
      entry_quantity 
    });
    
    // remain_quantity도 자동으로 계산하여 업데이트
    const [projectData] = await pool.execute(
      'SELECT export_quantity FROM mj_project WHERE id = ?',
      [id]
    );
    
    const export_quantity = projectData[0]?.export_quantity || 0;
    const remain_quantity = Math.max(0, entry_quantity - export_quantity);
    
    devLog('🔄 [mj-project] remain_quantity 계산:', { 
      projectId: id, 
      entry_quantity, 
      export_quantity, 
      remain_quantity 
    });
    
    await pool.execute(`
      UPDATE mj_project 
      SET 
        remain_quantity = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [remain_quantity, id]);
    
    devLog('✅ [mj-project] remain_quantity 업데이트 완료:', { 
      projectId: id, 
      remain_quantity 
    });
    
    const responseData = {
      project_id: id,
      entry_quantity,
      export_quantity,
      remain_quantity,
      updated_at: new Date().toISOString()
    };
    
    devLog('✅ [mj-project] entry_quantity 업데이트 완료, 응답:', responseData);
    
    res.json({ 
      success: true, 
      message: 'entry_quantity가 업데이트되었습니다.',
      data: responseData
    });
    
  } catch (error) {
    errorLog('❌ [mj-project] entry_quantity 업데이트 오류:', error);
    res.status(500).json({ error: 'entry_quantity 업데이트 중 오류가 발생했습니다.' });
  }
});

// MJ 프로젝트 삭제
router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // 이미지 파일 삭제
    const [images] = await connection.execute(
      'SELECT file_path FROM mj_project_images WHERE project_id = ?',
      [req.params.id]
    );
    
    for (const image of images) {
      if (fs.existsSync(image.file_path)) {
        fs.unlinkSync(image.file_path);
      }
    }
    
    // 프로젝트 삭제 (CASCADE로 관련 데이터도 자동 삭제)
    await connection.execute('DELETE FROM mj_project WHERE id = ?', [id]);
    
    await connection.commit();
    
    res.json({ message: '프로젝트가 삭제되었습니다.' });
    
  } catch (error) {
    await connection.rollback();
    console.error('MJ 프로젝트 삭제 오류:', error);
    res.status(500).json({ error: '프로젝트 삭제 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

// MJ 프로젝트 물류 정보 조회
router.get('/:id/logistic', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 프로젝트 기본 정보 조회 (실제 존재하는 필드만)
    const [projects] = await pool.execute(`
      SELECT 
        id,
        project_name,
        quantity
      FROM mj_project 
      WHERE id = ?
    `, [id]);
    
    if (projects.length === 0) {
      return res.status(404).json({ success: false, error: '프로젝트를 찾을 수 없습니다.' });
    }
    
    const project = projects[0];
    
    // 입고 히스토리 조회 (warehouse_entries 테이블) - 날짜 오래된 순서로 정렬
    const [entryHistory] = await pool.execute(`
      SELECT 
        id,
        quantity,
        entry_date,
        created_at
      FROM warehouse_entries 
      WHERE project_id = ? 
      ORDER BY entry_date ASC, created_at ASC
    `, [id]);
    
    // 출고 히스토리 조회 (mj_packing_list 테이블) - 날짜 오래된 순서로 정렬
    const [exportHistory] = await pool.execute(`
      SELECT 
        id,
        SUM(box_count * packaging_count * packaging_method) as quantity,
        pl_date as export_date,
        'completed' as status,
        created_at
      FROM mj_packing_list 
      WHERE project_id = ? 
      GROUP BY pl_date, created_at
      ORDER BY export_date ASC, created_at ASC
    `, [id]);
    
    // 총 입고 수량 계산
    const totalEntryQuantity = entryHistory.reduce((sum, entry) => sum + Number(entry.quantity), 0);
    
    // 총 출고 수량 계산
    const totalExportQuantity = exportHistory.reduce((sum, exportItem) => sum + Number(exportItem.quantity), 0);
    
    // 물류 데이터 구성 (실제 존재하는 필드만 사용)
    const logisticData = {
      orderQuantity: Number(project.quantity) || 0,
      entryHistory: entryHistory.map(entry => ({
        entry_date: entry.entry_date,
        quantity: Number(entry.quantity) || 0,
        created_at: entry.created_at
      })),
      exportHistory: exportHistory.map(exportItem => ({
        export_date: exportItem.export_date,
        quantity: Number(exportItem.quantity) || 0,
        status: exportItem.status,
        created_at: exportItem.created_at
      })),
      remainingEntry: Math.max(0, Number(project.quantity) - totalEntryQuantity),
      remainingExport: Math.max(0, totalEntryQuantity - totalExportQuantity)
    };
    
    res.json({
      success: true,
      logisticData
    });
    
  } catch (error) {
    console.error('MJ 프로젝트 물류 정보 조회 오류:', error);
    res.status(500).json({ success: false, error: '물류 정보 조회 중 오류가 발생했습니다.' });
  }
});

// MJ 프로젝트 발주 일정 조회 (캘린더용)
router.get('/calendar/order-events', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  const startTime = Date.now();
  
  try {
    console.log('📅 [Calendar] 발주 일정 조회 시작');
    
    // 발주 날짜가 있는 프로젝트들을 조회
    const [projects] = await connection.execute(`
      SELECT 
        p.id,
        p.project_name,
        p.actual_order_date,
        p.expected_factory_shipping_date,
        p.actual_factory_shipping_date,
        p.quantity,
        p.target_price,
        p.unit_price,
        p.supplier_name,
        p.is_order_completed,
        p.is_factory_shipping_completed,
        p.factory_shipping_status,
        p.entry_quantity,
        p.export_quantity,
        p.remain_quantity,
        p.factory_delivery_days,
        p.created_at,
        p.updated_at,
        u.username as assignee,
        (SELECT file_path FROM mj_project_images WHERE project_id = p.id ORDER BY id ASC LIMIT 1) as representative_image
      FROM mj_project p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.actual_order_date IS NOT NULL
      ORDER BY p.actual_order_date ASC
    `);


    // 캘린더 이벤트 형식으로 변환
    const events = projects.map(project => {
      // 발주일 + 공장 납기소요일 계산
      const orderDate = new Date(project.actual_order_date);
      const deliveryDays = project.factory_delivery_days || 7; // 기본값 7일
      const expectedDeliveryDate = new Date(orderDate);
      expectedDeliveryDate.setDate(orderDate.getDate() + deliveryDays);
      
      // 이미지 경로 처리 - ProjectSearchModal과 동일한 방식 사용
      let imageData = null;
              if (project.representative_image) {
          // 파일명 추출 (전체 경로에서 파일명만)
          const fileName = project.representative_image.split('/').pop();
          
          imageData = {
            url: `/api/warehouse/image/${fileName}`,
            thumbnail_url: `/api/warehouse/image/${fileName}`,
            stored_filename: fileName,
            file_path: project.representative_image
          };
        }
      
      return {
        id: project.id,
        title: project.project_name,
        date: project.actual_order_date,
        time: '09:00', // 기본 시간
        location: project.supplier_name || '공급자 미지정',
        description: `발주 수량: ${project.quantity}개, 단가: ${(parseFloat(project.unit_price) || parseFloat(project.target_price)) ? (parseFloat(project.unit_price) || parseFloat(project.target_price)).toLocaleString() : '미정'}CNY`,
        assignee: project.assignee || '담당자 미지정',
        productName: project.project_name,
        quantity: project.quantity || 0,
        unit: '개',
        unitPrice: parseFloat(project.unit_price) || parseFloat(project.target_price) || 0,
        targetPrice: project.target_price || 0,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        // 추가 정보
        isOrderCompleted: project.is_order_completed === 1,
        isFactoryShippingCompleted: project.is_factory_shipping_completed === 1,
        factoryShippingStatus: project.factory_shipping_status,
        entryQuantity: project.entry_quantity,
        exportQuantity: project.export_quantity,
        remainQuantity: project.remain_quantity,
        representativeImage: imageData, // 이미지 객체로 변경
        // 공장 납기 관련
        factoryDeliveryDays: deliveryDays,
        expectedDeliveryDate: expectedDeliveryDate.toISOString().split('T')[0],
        actualFactoryShippingDate: project.actual_factory_shipping_date
      };
    });

    const processingTime = Date.now() - startTime;
    console.log(`📅 [Calendar] 발주 일정 조회 완료: ${events.length}개 이벤트 (${processingTime}ms)`);

    res.json({
      success: true,
      data: events,
      message: '발주 일정 조회 성공',
      processingTime: processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`📅 [Calendar] 발주 일정 조회 오류 (${processingTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: '발주 일정 조회 중 오류가 발생했습니다.',
      details: error.message,
      processingTime: processingTime
    });
  } finally {
    connection.release();
  }
});

// MJ 프로젝트 물류 일정 조회 (캘린더용)
router.get('/calendar/logistics-events', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  const startTime = Date.now();
  
  try {
    console.log('📅 [Calendar] 물류 일정 조회 시작');
    
    // 공장 출고 날짜가 있는 프로젝트들을 조회
    const [projects] = await connection.execute(`
      SELECT 
        p.id,
        p.project_name,
        p.expected_factory_shipping_date,
        p.actual_factory_shipping_date,
        p.quantity,
        p.export_quantity,
        p.remain_quantity,
        p.factory_shipping_status,
        p.is_factory_shipping_completed,
        p.supplier_name,
        p.created_at,
        p.updated_at,
        u.username as assignee,
        (SELECT file_path FROM mj_project_images WHERE project_id = p.id ORDER BY id ASC LIMIT 1) as representative_image
      FROM mj_project p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.expected_factory_shipping_date IS NOT NULL OR p.actual_factory_shipping_date IS NOT NULL
      ORDER BY COALESCE(p.actual_factory_shipping_date, p.expected_factory_shipping_date) ASC
    `);

    console.log(`📅 [Calendar] 조회된 물류 프로젝트 수: ${projects.length}개`);

    // 캘린더 이벤트 형식으로 변환
    const events = projects.map(project => {
      const shippingDate = project.actual_factory_shipping_date || project.expected_factory_shipping_date;
      const isActual = !!project.actual_factory_shipping_date;
      
              // 이미지 경로 처리 - ProjectSearchModal과 동일한 방식 사용
        let imageData = null;
        
        if (project.representative_image) {
          // 파일명 추출 (전체 경로에서 파일명만)
          const fileName = project.representative_image.split('/').pop();
          
          imageData = {
            url: `/api/warehouse/image/${fileName}`,
            thumbnail_url: `/api/warehouse/image/${fileName}`,
            stored_filename: fileName,
            file_path: project.representative_image
          };
        }
      
      return {
        id: project.id,
        title: `${isActual ? '출고 완료' : '예정 출고'}: ${project.project_name}`,
        date: shippingDate,
        time: '08:00', // 기본 시간
        location: project.supplier_name || '공급자 미지정',
        description: `출고 수량: ${project.export_quantity || 0}개, 잔여 수량: ${project.remain_quantity || 0}개`,
        assignee: project.assignee || '담당자 미지정',
        productName: project.project_name,
        quantity: project.export_quantity || project.quantity || 0,
        unit: '개',
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        // 추가 정보
        isActualShipping: isActual,
        factoryShippingStatus: project.factory_shipping_status,
        isFactoryShippingCompleted: project.is_factory_shipping_completed === 1,
        entryQuantity: project.entry_quantity,
        exportQuantity: project.export_quantity,
        remainQuantity: project.remain_quantity,
        representativeImage: imageData
      };
    });

    const processingTime = Date.now() - startTime;
    console.log(`📅 [Calendar] 물류 일정 조회 완료: ${events.length}개 이벤트 (${processingTime}ms)`);

    res.json({
      success: true,
      data: events,
      message: '물류 일정 조회 성공',
      processingTime: processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`📅 [Calendar] 물류 일정 조회 오류 (${processingTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: '물류 일정 조회 중 오류가 발생했습니다.',
      details: error.message,
      processingTime: processingTime
    });
  } finally {
    connection.release();
  }
});

// 선금 지급 예정 금액 조회 - FinanceQuickStats와 동일한 로직 사용
router.get('/advance-payment-schedule', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('[MJ-Project] 선금 지급 예정 금액 조회 시작');
    
    // FinanceQuickStats의 총 선금과 동일한 쿼리 사용
    const [rows] = await connection.execute(`
      SELECT 
        SUM(CAST(advance_payment AS DECIMAL(15,2))) as total_advance_payment_schedule,
        COUNT(*) as total_records,
        COUNT(DISTINCT id) as unique_projects
      FROM mj_project 
      WHERE advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    
    const totalAdvancePaymentSchedule = rows[0]?.total_advance_payment_schedule || 0;
    const totalRecords = rows[0]?.total_records || 0;
    const uniqueProjects = rows[0]?.unique_projects || 0;
    
    console.log('[MJ-Project] 선금 지급 예정 계산 결과:');
    console.log(`  - 총 프로젝트 수: ${uniqueProjects}`);
    console.log(`  - 총 선금 지급 예정 (CNY): ${totalAdvancePaymentSchedule}`);
    console.log(`  - 데이터 소스: advance_payment 컬럼 직접 사용 (FinanceQuickStats와 동일)`);
    
    res.json({
      success: true,
      data: {
        total_advance_payment_schedule: totalAdvancePaymentSchedule,
        total_records: totalRecords,
        unique_projects: uniqueProjects
      },
      message: '선금 지급 예정 금액 조회 성공'
    });
    
  } catch (error) {
    console.error('[MJ-Project] 선금 지급 예정 금액 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '선금 지급 예정 금액 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

// MJ 프로젝트 결제 정보 저장 API
router.post('/:id/payment-to-supplier', authMiddleware, async (req, res) => {
  console.log('🔍 [DEBUG] POST /api/mj-project/:id/payment-to-supplier 엔드포인트 호출됨');
  console.log('🔍 [DEBUG] req.params:', req.params);
  console.log('🔍 [DEBUG] req.user:', req.user);
  console.log('🔍 [DEBUG] req.body:', req.body);
  
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;
    const { paymentData } = req.body;
    
    console.log('🔍 [DEBUG] projectId:', projectId, 'userId:', userId, 'paymentData:', paymentData);

    if (!paymentData) {
      console.log('🔍 [DEBUG] 결제 데이터가 없음 - 400 응답 반환');
      return res.status(400).json({
        success: false,
        message: '결제 데이터가 필요합니다.'
      });
    }

    // 프로젝트 존재 여부 확인 (Admin은 모든 프로젝트 조회 가능)
    console.log('🔍 [DEBUG] 프로젝트 존재 여부 확인 중...');
    console.log('🔍 [DEBUG] req.user.isAdmin:', req.user.isAdmin);
    
    let projectRows;
    if (req.user.isAdmin) {
      // Admin은 모든 프로젝트 조회 가능
      console.log('🔍 [DEBUG] Admin 권한으로 프로젝트 조회');
      [projectRows] = await connection.execute(
        'SELECT id FROM mj_project WHERE id = ?',
        [projectId]
      );
    } else {
      // 일반 사용자는 자신의 프로젝트만 조회 가능
      console.log('🔍 [DEBUG] 일반 사용자 권한으로 프로젝트 조회');
      [projectRows] = await connection.execute(
        'SELECT id FROM mj_project WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );
    }
    console.log('🔍 [DEBUG] 프로젝트 쿼리 결과:', projectRows);

    if (projectRows.length === 0) {
      console.log('🔍 [DEBUG] 프로젝트를 찾을 수 없음 - 404 응답 반환');
      return res.status(404).json({
        success: false,
        message: '프로젝트를 찾을 수 없습니다.'
      });
    }
    console.log('🔍 [DEBUG] 프로젝트 존재 확인 완료');

    // 트랜잭션 시작
    await connection.beginTransaction();

    try {
      // JSON 데이터 구조 생성
      const paymentStatus = {};
      const paymentDates = {};
      const paymentAmounts = {};

      const paymentTypes = ['advance', 'interim1', 'interim2', 'interim3', 'balance'];
      
      for (const paymentType of paymentTypes) {
        const data = paymentData[paymentType];
        if (!data) continue;

        const { amount, isPaid, paymentDate } = data;
        
        paymentStatus[paymentType] = Boolean(isPaid);
        paymentDates[paymentType] = isPaid && paymentDate ? paymentDate : null;
        paymentAmounts[paymentType] = Number(amount) || 0;
      }

      // 기존 레코드 확인
      const [existingRows] = await connection.execute(
        'SELECT id FROM mj_project_payments WHERE project_id = ?',
        [projectId]
      );

      if (existingRows.length > 0) {
        // 업데이트
        await connection.execute(`
          UPDATE mj_project_payments 
          SET payment_status = ?, payment_dates = ?, payment_amounts = ?, updated_at = CURRENT_TIMESTAMP
          WHERE project_id = ?
        `, [JSON.stringify(paymentStatus), JSON.stringify(paymentDates), JSON.stringify(paymentAmounts), projectId]);
      } else {
        // 삽입
        await connection.execute(`
          INSERT INTO mj_project_payments (project_id, payment_status, payment_dates, payment_amounts)
          VALUES (?, ?, ?, ?)
        `, [projectId, JSON.stringify(paymentStatus), JSON.stringify(paymentDates), JSON.stringify(paymentAmounts)]);
      }

      // 트랜잭션 커밋
      await connection.commit();

      res.json({
        success: true,
        message: '결제 정보가 성공적으로 저장되었습니다.'
      });

    } catch (error) {
      // 트랜잭션 롤백
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    errorLog(`[MJ-Project] 결제 정보 저장 오류: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '결제 정보 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// MJ 프로젝트 결제 정보 조회 API
router.get('/:id/payment-to-supplier', authMiddleware, async (req, res) => {
  console.log('🔍 [DEBUG] GET /api/mj-project/:id/payment-to-supplier 엔드포인트 호출됨');
  console.log('🔍 [DEBUG] req.params:', req.params);
  console.log('🔍 [DEBUG] req.user:', req.user);
  
  const connection = await pool.getConnection();
  
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;
    
    console.log('🔍 [DEBUG] projectId:', projectId, 'userId:', userId);

    // 프로젝트 존재 여부 확인 (Admin은 모든 프로젝트 조회 가능)
    console.log('🔍 [DEBUG] 프로젝트 존재 여부 확인 중...');
    console.log('🔍 [DEBUG] req.user.isAdmin:', req.user.isAdmin);
    
    let projectRows;
    if (req.user.isAdmin) {
      // Admin은 모든 프로젝트 조회 가능
      console.log('🔍 [DEBUG] Admin 권한으로 프로젝트 조회');
      [projectRows] = await connection.execute(
        'SELECT id FROM mj_project WHERE id = ?',
        [projectId]
      );
    } else {
      // 일반 사용자는 자신의 프로젝트만 조회 가능
      console.log('🔍 [DEBUG] 일반 사용자 권한으로 프로젝트 조회');
      [projectRows] = await connection.execute(
        'SELECT id FROM mj_project WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );
    }
    console.log('🔍 [DEBUG] 프로젝트 쿼리 결과:', projectRows);

    if (projectRows.length === 0) {
      console.log('🔍 [DEBUG] 프로젝트를 찾을 수 없음 - 404 응답 반환');
      return res.status(404).json({
        success: false,
        message: '프로젝트를 찾을 수 없습니다.'
      });
    }
    console.log('🔍 [DEBUG] 프로젝트 존재 확인 완료');

    // 결제 정보 조회 (JSON 형식)
    const [paymentRows] = await connection.execute(`
      SELECT payment_status, payment_dates, payment_amounts
      FROM mj_project_payments
      WHERE project_id = ?
    `, [projectId]);

    // 결제 데이터 구조화
    const paymentData = {
      advance: { isPaid: false, amount: 0, paymentDate: '' },
      interim1: { isPaid: false, amount: 0, paymentDate: '' },
      interim2: { isPaid: false, amount: 0, paymentDate: '' },
      interim3: { isPaid: false, amount: 0, paymentDate: '' },
      balance: { isPaid: false, amount: 0, paymentDate: '' }
    };

    // JSON 데이터를 paymentData에 매핑
    if (paymentRows.length > 0) {
      const row = paymentRows[0];
      const paymentStatus = row.payment_status ? JSON.parse(row.payment_status) : {};
      const paymentDates = row.payment_dates ? JSON.parse(row.payment_dates) : {};
      const paymentAmounts = row.payment_amounts ? JSON.parse(row.payment_amounts) : {};

      ['advance', 'interim1', 'interim2', 'interim3', 'balance'].forEach(paymentType => {
        paymentData[paymentType] = {
          isPaid: Boolean(paymentStatus[paymentType]),
          amount: Number(paymentAmounts[paymentType]) || 0,
          paymentDate: paymentDates[paymentType] || ''
        };
      });
    }

    res.json({
      success: true,
      message: '결제 정보를 성공적으로 조회했습니다.',
      data: paymentData
    });

  } catch (error) {
    errorLog(`[MJ-Project] 결제 정보 조회 오류: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: '결제 정보 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// MJ 프로젝트 캘린더용 데이터 조회 (모바일 앱용)
router.get('/calendar/projects', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('📅 [mj-project] 모바일 캘린더용 프로젝트 데이터 조회 시작');
    
    // mj_project 테이블에서 actual_order_date가 있는 프로젝트들만 조회
    const [projects] = await connection.execute(`
      SELECT 
        id,
        project_name,
        actual_order_date,
        actual_factory_shipping_date,
        quantity,
        unit_price,
        target_price,
        is_order_completed,
        factory_delivery_days,
        created_at
      FROM mj_project 
      WHERE actual_order_date IS NOT NULL
      ORDER BY actual_order_date ASC
    `);

    console.log('📅 [mj-project] 조회된 프로젝트 수:', projects.length);

    // 캘린더 이벤트 형식으로 변환
    const events = projects.map(project => {
      return {
        id: project.id,
        project_name: project.project_name,
        actual_order_date: project.actual_order_date,
        actual_factory_shipping_date: project.actual_factory_shipping_date,
        quantity: project.quantity || 0,
        unit_price: project.unit_price || 0,
        target_price: project.target_price || 0,
        is_order_completed: project.is_order_completed === 1,
        factory_delivery_days: project.factory_delivery_days || 0,
        created_at: project.created_at
      };
    });

    console.log('📅 [mj-project] 변환된 이벤트 수:', events.length);

    res.json({
      success: true,
      data: events,
      message: '모바일 캘린더용 프로젝트 데이터 조회 성공'
    });

  } catch (error) {
    console.error('📅 [mj-project] 모바일 캘린더용 프로젝트 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '모바일 캘린더용 프로젝트 데이터 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

// MJ 프로젝트 Client 전용 달력 데이터 조회 (발주/입고예정/입고완료 상태별)
router.get('/calendar/client-events', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  const startTime = Date.now();
  
  try {
    
    // 발주일이 있는 모든 프로젝트 조회 (상태별 구분을 위해)
    const [projects] = await connection.execute(`
      SELECT 
        p.id,
        p.project_name,
        p.actual_order_date,
        p.expected_factory_shipping_date,
        p.actual_factory_shipping_date,
        p.quantity,
        p.target_price,
        p.supplier_name,
        p.is_order_completed,
        p.is_factory_shipping_completed,
        p.factory_shipping_status,
        p.entry_quantity,
        p.export_quantity,
        p.remain_quantity,
        p.factory_delivery_days,
        p.created_at,
        p.updated_at,
        u.username as assignee,
        (SELECT file_path FROM mj_project_images WHERE project_id = p.id ORDER BY id ASC LIMIT 1) as representative_image
      FROM mj_project p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.actual_order_date IS NOT NULL
      ORDER BY p.actual_order_date ASC
    `);


    // 상태별 이벤트 생성
    const events = [];
    
    projects.forEach(project => {
      // 1. 발주일 이벤트 (항상 생성)
      const orderDate = new Date(project.actual_order_date);
      const deliveryDays = project.factory_delivery_days || 7;
      const expectedDeliveryDate = new Date(orderDate);
      expectedDeliveryDate.setDate(orderDate.getDate() + deliveryDays);
      
      // 이미지 처리
      let imageData = null;
      if (project.representative_image) {
        const fileName = project.representative_image.split('/').pop();
        imageData = {
          url: `/api/warehouse/image/${fileName}`,
          thumbnail_url: `/api/warehouse/image/${fileName}`,
          alt: project.project_name
        };
      }

      // 발주일 이벤트
      events.push({
        id: `${project.id}_order`,
        projectId: project.id,
        title: project.project_name,
        date: project.actual_order_date,
        time: '09:00',
        location: project.supplier_name || '공급자 미지정',
        description: `발주 수량: ${project.quantity}개, 목표가: ${project.target_price ? project.target_price.toLocaleString() : '미정'}원`,
        assignee: project.assignee || '담당자 미지정',
        productName: project.project_name,
        quantity: project.quantity || 0,
        unit: '개',
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        representativeImage: imageData,
        
        // 상태 정보
        eventType: 'order', // 발주일
        status: project.is_order_completed ? 'completed' : 'pending',
        isOrderCompleted: project.is_order_completed === 1,
        factoryDeliveryDays: deliveryDays,
        expectedDeliveryDate: expectedDeliveryDate.toISOString().split('T')[0]
      });

      // 2. 입고예정일 이벤트 (발주일 + 공장납기소요일)
      if (deliveryDays > 0) {
        events.push({
          id: `${project.id}_expected_delivery`,
          projectId: project.id,
          title: `입고예정: ${project.project_name}`,
          date: expectedDeliveryDate.toISOString().split('T')[0],
          time: '17:00',
          location: project.supplier_name || '공급자 미지정',
          description: `입고예정일 (발주일 + ${deliveryDays}일)`,
          assignee: project.assignee || '담당자 미지정',
          productName: project.project_name,
          quantity: project.quantity || 0,
          unit: '개',
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          representativeImage: imageData,
          
          // 상태 정보
          eventType: 'expected_delivery', // 입고예정일
          status: 'expected',
          isOrderCompleted: project.is_order_completed === 1,
          factoryDeliveryDays: deliveryDays,
          expectedDeliveryDate: expectedDeliveryDate.toISOString().split('T')[0]
        });
      }

      // 3. 입고완료일 이벤트 (실제 입고일이 있는 경우)
      if (project.actual_factory_shipping_date) {
        events.push({
          id: `${project.id}_actual_delivery`,
          projectId: project.id,
          title: `입고완료: ${project.project_name}`,
          date: project.actual_factory_shipping_date,
          time: '17:00',
          location: project.supplier_name || '공급자 미지정',
          description: `입고완료일 (실제 입고일)`,
          assignee: project.assignee || '담당자 미지정',
          productName: project.project_name,
          quantity: project.quantity || 0,
          unit: '개',
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          representativeImage: imageData,
          
          // 상태 정보
          eventType: 'actual_delivery', // 입고완료일
          status: 'completed',
          isOrderCompleted: project.is_order_completed === 1,
          isFactoryShippingCompleted: project.is_factory_shipping_completed === 1,
          factoryShippingStatus: project.factory_shipping_status,
          entryQuantity: project.entry_quantity,
          exportQuantity: project.export_quantity,
          remainQuantity: project.remain_quantity
        });
      }
    });

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      data: events,
      message: 'Client 달력 데이터 조회 성공',
      processingTime: processingTime,
      summary: {
        totalEvents: events.length,
        orderEvents: events.filter(e => e.eventType === 'order').length,
        expectedDeliveryEvents: events.filter(e => e.eventType === 'expected_delivery').length,
        actualDeliveryEvents: events.filter(e => e.eventType === 'actual_delivery').length
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`📅 [Calendar] Client 달력 데이터 조회 오류 (${processingTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: 'Client 달력 데이터 조회 중 오류가 발생했습니다.',
      details: error.message,
      processingTime: processingTime
    });
  } finally {
    connection.release();
  }
});

// 모바일 전용 프로젝트 등록 API (확장된 필드 포함)
router.post('/mobile/register', authMiddleware, handleMulterError, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('📱 [mobile-project] 모바일 프로젝트 등록 시작:', {
      body: req.body,
      files: req.files ? req.files.length : 0,
      user: req.user
    });
    
    await connection.beginTransaction();
    
    const { 
      projectName, 
      description, 
      quantity, 
      targetPrice, 
      unitPrice,
      supplierName,
      factoryDeliveryDays,
      factoryShippingCost,
      packingMethod,
      referenceLinks, 
      selectedUserId,
      feeRate = 10.0  // 기본값 10%
    } = req.body;
    
    // admin 사용자의 경우 선택된 사용자 ID 사용, 그렇지 않으면 현재 로그인한 사용자 ID 사용
    let projectOwnerId = req.user?.userId;
    let projectCreatorId = req.user?.userId;
    let isAdminUser = req.user?.isAdmin;
    
    console.log('👤 [mobile-project] 사용자 정보:', {
      projectOwnerId,
      projectCreatorId,
      isAdminUser,
      selectedUserId
    });
    
    // JWT에서 admin 권한이 제대로 전달되지 않은 경우, 데이터베이스에서 직접 확인
    if (isAdminUser === undefined || isAdminUser === null) {
      try {
        const [adminCheck] = await connection.execute(
          'SELECT is_admin FROM users WHERE id = ?',
          [req.user.userId]
        );
        if (adminCheck.length > 0) {
          isAdminUser = adminCheck[0].is_admin;
          console.log('🔍 [mobile-project] DB에서 admin 권한 확인:', isAdminUser);
        }
      } catch (error) {
        console.error('❌ [mobile-project] admin 권한 확인 오류:', error);
        isAdminUser = false;
      }
    }
    
    if (selectedUserId && isAdminUser) {
      projectOwnerId = parseInt(selectedUserId);
      projectCreatorId = req.user.userId;
      console.log('👑 [mobile-project] Admin 사용자로 프로젝트 등록:', { projectOwnerId, projectCreatorId });
    }
    
    // referenceLinks가 문자열인 경우 JSON으로 파싱
    let parsedReferenceLinks = [];
    if (referenceLinks) {
      try {
        parsedReferenceLinks = typeof referenceLinks === 'string' 
          ? JSON.parse(referenceLinks) 
          : referenceLinks;
        console.log('🔗 [mobile-project] 참고링크 파싱 완료:', parsedReferenceLinks);
      } catch (error) {
        console.error('❌ [mobile-project] 참고링크 파싱 오류:', error);
        parsedReferenceLinks = [];
      }
    }
    
    if (!projectOwnerId) {
      console.error('❌ [mobile-project] 사용자 인증 실패: projectOwnerId 없음');
      return res.status(401).json({ error: '사용자 인증이 필요합니다.' });
    }
    
    // 필수 필드 검증
    if (!projectName || !quantity) {
      console.error('❌ [mobile-project] 필수 필드 누락:', { projectName, quantity });
      return res.status(400).json({ error: '프로젝트명과 수량은 필수입니다.' });
    }
    
    // 숫자 타입 변환 및 검증
    const numericQuantity = parseInt(quantity) || 0;
    const numericTargetPrice = parseFloat(targetPrice) || null;
    const numericUnitPrice = parseFloat(unitPrice) || null;
    const numericFactoryDeliveryDays = parseInt(factoryDeliveryDays) || null;
    const numericFactoryShippingCost = parseFloat(factoryShippingCost) || null;
    const numericFeeRate = parseFloat(feeRate) || 10.0;  // 기본값 10%
    
    if (numericQuantity <= 0) {
      return res.status(400).json({ error: '수량은 0보다 큰 값이어야 합니다.' });
    }
    
    console.log('✅ [mobile-project] 프로젝트 등록 데이터 검증 완료:', {
      projectName,
      description,
      quantity: numericQuantity,
      targetPrice: numericTargetPrice,
      unitPrice: numericUnitPrice,
      supplierName,
      factoryDeliveryDays: numericFactoryDeliveryDays,
      factoryShippingCost: numericFactoryShippingCost,
      packingMethod,
      feeRate: numericFeeRate,
      projectOwnerId,
      projectCreatorId
    });
    
    // 🔢 자동 계산 로직
    console.log('🧮 [mobile-project] 자동 계산 시작...');
    
    // 1. 총계 계산 (단가 × 수량)
    const subtotal = (numericUnitPrice || 0) * numericQuantity;
    console.log('💰 [mobile-project] 총계 계산:', {
      unitPrice: numericUnitPrice,
      quantity: numericQuantity,
      subtotal: subtotal
    });
    
    // 2. 수수료 계산 (총계 × 수수료율)
    const fee = (subtotal * numericFeeRate) / 100;
    console.log('💸 [mobile-project] 수수료 계산:', {
      subtotal: subtotal,
      feeRate: numericFeeRate,
      fee: fee
    });
    
    // 3. 추가 비용 총합 계산 (참고링크에서 추가비용 추출)
    let totalAdditionalCosts = 0;
    if (parsedReferenceLinks && parsedReferenceLinks.length > 0) {
      totalAdditionalCosts = parsedReferenceLinks.reduce((sum, item) => {
        return sum + (parseFloat(item.cost) || 0);
      }, 0);
    }
    console.log('📊 [mobile-project] 추가 비용 계산:', {
      referenceLinks: parsedReferenceLinks,
      totalAdditionalCosts: totalAdditionalCosts
    });
    
    // 4. 잔금 계산 (수수료 + 공장배송비 + 추가비용)
    const balanceAmount = fee + (numericFactoryShippingCost || 0) + totalAdditionalCosts;
    console.log('💳 [mobile-project] 잔금 계산:', {
      fee: fee,
      factoryShippingCost: numericFactoryShippingCost || 0,
      additionalCosts: totalAdditionalCosts,
      balanceAmount: balanceAmount
    });
    
    // 5. 최종 금액 계산 (총계 + 공장배송비 + 수수료 + 추가비용)
    const totalAmount = subtotal + (numericFactoryShippingCost || 0) + fee + totalAdditionalCosts;
    console.log('🎯 [mobile-project] 최종 금액 계산:', {
      subtotal: subtotal,
      factoryShippingCost: numericFactoryShippingCost || 0,
      fee: fee,
      additionalCosts: totalAdditionalCosts,
      totalAmount: totalAmount
    });
    
    // 6. 선금 계산 (총계와 동일)
    const advancePayment = subtotal;
    console.log('💵 [mobile-project] 선금 계산:', {
      advancePayment: advancePayment
    });
    
    console.log('✅ [mobile-project] 자동 계산 완료:', {
      subtotal,
      fee,
      balanceAmount,
      totalAmount,
      advancePayment,
      totalAdditionalCosts
    });
    
    // 1. MJ 프로젝트 생성 (확장된 필드 + 계산된 값들 포함)
    const [projectResult] = await connection.execute(
      `INSERT INTO mj_project (
        project_name, description, quantity, target_price, unit_price,
        supplier_name, factory_delivery_days, factory_shipping_cost, packing_method,
        user_id, created_by, reference_links, fee_rate,
        subtotal, fee, balance_amount, total_amount, advance_payment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectName, 
        description || null, 
        numericQuantity, 
        numericTargetPrice, 
        numericUnitPrice,
        supplierName || null,
        numericFactoryDeliveryDays,
        numericFactoryShippingCost,
        packingMethod || null,
        projectOwnerId, 
        projectCreatorId,
        parsedReferenceLinks.length > 0 ? JSON.stringify(parsedReferenceLinks) : null,
        numericFeeRate,
        subtotal,
        fee,
        balanceAmount,
        totalAmount,
        advancePayment
      ]
    );
    
    const projectId = projectResult.insertId;
    console.log('✅ [mobile-project] 프로젝트 생성 완료:', { projectId });
    
    // 2. 이미지 파일 처리
    if (req.files && req.files.length > 0) {
      console.log(`📸 [mobile-project] 이미지 처리 시작: ${req.files.length}개 파일`);
      
      for (const file of req.files) {
        try {
          const [imageResult] = await connection.execute(
            'INSERT INTO mj_project_images (project_id, file_name, file_path, original_name) VALUES (?, ?, ?, ?)',
            [projectId, file.filename, file.path, file.originalname]
          );
          console.log('✅ [mobile-project] 이미지 저장 완료:', {
            imageId: imageResult.insertId,
            filename: file.filename,
            originalName: file.originalname
          });
        } catch (imageError) {
          console.error('❌ [mobile-project] 이미지 저장 실패:', imageError);
          // 이미지 저장 실패해도 프로젝트는 계속 진행
        }
      }
    }
    
    await connection.commit();
    console.log('✅ [mobile-project] 프로젝트 등록 완료:', { projectId });
    
    res.json({
      success: true,
      message: '모바일 프로젝트가 성공적으로 등록되었습니다.',
      projectId: projectId,
      data: {
        id: projectId,
        projectName,
        description,
        quantity: numericQuantity,
        targetPrice: numericTargetPrice,
        unitPrice: numericUnitPrice,
        supplierName,
        factoryDeliveryDays: numericFactoryDeliveryDays,
        factoryShippingCost: numericFactoryShippingCost,
        packingMethod,
        feeRate: numericFeeRate,
        referenceLinks: parsedReferenceLinks,
        imageCount: req.files ? req.files.length : 0,
        // 🔢 자동 계산된 값들
        calculatedValues: {
          subtotal: subtotal,
          fee: fee,
          balanceAmount: balanceAmount,
          totalAmount: totalAmount,
          advancePayment: advancePayment,
          totalAdditionalCosts: totalAdditionalCosts
        }
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ [mobile-project] 프로젝트 등록 오류:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno
    });
    res.status(500).json({ 
      error: '모바일 프로젝트 등록 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : '내부 서버 오류'
    });
  } finally {
    connection.release();
  }
});

// 웹용 자동 상품명 생성 API
router.get('/generate-product-name', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('🌐 [web-generate-name] 웹용 자동 상품명 생성 요청:', {
      user: req.user
    });
    
    // 현재 한국 시간으로 오늘 날짜 계산
    const now = new Date();
    const kstOffset = 9 * 60; // UTC+9 (한국 시간)
    const kstTime = new Date(now.getTime() + (kstOffset * 60 * 1000));
    
    // YYMMDD 형식으로 날짜 생성
    const year = kstTime.getFullYear().toString().slice(-2); // YY
    const month = (kstTime.getMonth() + 1).toString().padStart(2, '0'); // MM
    const day = kstTime.getDate().toString().padStart(2, '0'); // DD
    const dateString = `${year}${month}${day}`;
    
    console.log('📅 [web-generate-name] 오늘 날짜:', dateString);
    
    // 오늘 날짜에 등록된 프로젝트 개수 조회
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM mj_project 
       WHERE DATE(created_at) = CURDATE()`,
      []
    );
    
    const todayCount = parseInt(countResult[0].count) || 0;
    const nextNumber = todayCount + 1;
    
    // YYMMDD#N 형식으로 상품명 생성 (숫자를 명시적으로 숫자로 처리)
    const generatedProductName = `${dateString}#${nextNumber}`;
    
    console.log('✅ [web-generate-name] 상품명 생성 완료:', {
      dateString,
      todayCount,
      nextNumber,
      nextNumberType: typeof nextNumber,
      generatedProductName
    });
    
    res.json({
      success: true,
      data: {
        productName: generatedProductName,
        dateString: dateString,
        todayCount: todayCount,
        nextNumber: nextNumber
      }
    });
    
  } catch (error) {
    console.error('❌ [web-generate-name] 상품명 생성 오류:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: '상품명 생성 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : '내부 서버 오류'
    });
  } finally {
    connection.release();
  }
});

// 모바일 전용 자동 상품명 생성 API (기존 API 유지)
router.get('/mobile/generate-product-name', authMiddleware, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('📱 [mobile-generate-name] 자동 상품명 생성 요청:', {
      user: req.user
    });
    
    // 현재 한국 시간으로 오늘 날짜 계산
    const now = new Date();
    const kstOffset = 9 * 60; // UTC+9 (한국 시간)
    const kstTime = new Date(now.getTime() + (kstOffset * 60 * 1000));
    
    // YYMMDD 형식으로 날짜 생성
    const year = kstTime.getFullYear().toString().slice(-2); // YY
    const month = (kstTime.getMonth() + 1).toString().padStart(2, '0'); // MM
    const day = kstTime.getDate().toString().padStart(2, '0'); // DD
    const dateString = `${year}${month}${day}`;
    
    console.log('📅 [mobile-generate-name] 오늘 날짜:', dateString);
    
    // 오늘 날짜에 등록된 프로젝트 개수 조회
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM mj_project 
       WHERE DATE(created_at) = CURDATE()`,
      []
    );
    
    const todayCount = parseInt(countResult[0].count) || 0;
    const nextNumber = todayCount + 1;
    
    // YYMMDD#N 형식으로 상품명 생성 (숫자를 명시적으로 숫자로 처리)
    const generatedProductName = `${dateString}#${nextNumber}`;
    
    console.log('✅ [mobile-generate-name] 상품명 생성 완료:', {
      dateString,
      todayCount,
      nextNumber,
      nextNumberType: typeof nextNumber,
      generatedProductName
    });
    
    res.json({
      success: true,
      data: {
        productName: generatedProductName,
        dateString: dateString,
        todayCount: todayCount,
        nextNumber: nextNumber
      }
    });
    
  } catch (error) {
    console.error('❌ [mobile-generate-name] 상품명 생성 오류:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: '상품명 생성 중 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : '내부 서버 오류'
    });
  } finally {
    connection.release();
  }
});

// 등록된 라우트 확인
console.log('🔍 [DEBUG] mj-project 라우트 등록 완료');
console.log('🔍 [DEBUG] 등록된 라우트들:');
router.stack.forEach((middleware, index) => {
  if (middleware.route) {
    console.log(`  ${index}: ${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
  }
});

module.exports = router;