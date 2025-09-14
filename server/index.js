const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// 환경 설정 로드 (환경별 설정 사용)
const config = require('./config/environment-loader');

// JWT_SECRET을 환경 변수로 설정 (기존 코드와의 호환성을 위해)
process.env.JWT_SECRET = config.JWT_SECRET;

// 시간대 설정 - 한국 시간대(KST)로 통일
process.env.TZ = config.TZ;

const { 
  testConnection, 
  createUsersTable, 
  createMJProjectTable, 
  createMJProjectReferenceLinksTable, 
  createMJProjectImagesTable,
  migratePaymentColumns,
  runAllMigrations
} = require('./config/database');

const app = express();
const PORT = config.PORT;
const NODE_ENV = config.NODE_ENV;

// 서버 타임아웃 설정 (30초)
const serverTimeout = 30000;

// 환경별 설정
const isProduction = NODE_ENV === 'production';
console.log(`🌍 서버 환경: ${NODE_ENV} (${isProduction ? '상용' : '개발'})`);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // CSP 비활성화로 이미지 로딩 문제 해결
}));
// CORS 설정 - 환경별 설정 사용
const corsOptions = {
  origin: function (origin, callback) {
    // 환경별 CORS 설정 사용
    const allowedOrigins = [
      config.CORS_ORIGIN,
      'http://localhost:3000', 
      'http://127.0.0.1:3000',
      'http://localhost:5000',  // 개발서버 자체 origin 허용
      'https://labsemble.com',
      'https://www.labsemble.com',
      'http://labsemble.com',   // HTTP도 허용 (상용서버 호환성)
      'http://www.labsemble.com'
    ];
    
    // 동적 IP 주소 지원 (환경변수에서 설정)
    if (process.env.SERVER_HOST && process.env.SERVER_HOST !== 'localhost') {
      allowedOrigins.push(`http://${process.env.SERVER_HOST}:3000`);
      allowedOrigins.push(`http://${process.env.SERVER_HOST}:5000`);
    }
    
    // origin이 없는 경우 (Postman, curl 등) 허용
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS 차단된 origin: ${origin}`);
      // 상용환경에서도 일부 origin은 허용 (보안 강화 필요 시 수정)
      if (NODE_ENV === 'development') {
        console.log(`⚠️ 개발환경에서 CORS origin 차단을 무시하고 허용: ${origin}`);
        callback(null, true);
      } else if (origin && (origin.includes('labsemble.com') || origin.includes('localhost'))) {
        console.log(`⚠️ 상용환경에서 허용된 origin 허용: ${origin}`);
        callback(null, true);
      } else {
        console.log(`❌ 상용환경에서 CORS origin 차단: ${origin}`);
        callback(new Error('CORS 정책에 의해 차단되었습니다.'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// 로깅 설정 - 환경별로 다르게
if (isProduction) {
  app.use(morgan('combined')); // 상용환경: 기본 로그
} else {
  app.use(morgan('dev')); // 개발환경: 상세 로그
}
// JSON 및 URL 파싱 미들웨어 - shop 라우트 제외
app.use((req, res, next) => {
  // shop 관련 라우트 확인 (api/shop 또는 shop으로 시작)
  const isShopRoute = req.path.startsWith('/api/shop') || req.path.startsWith('/shop');
  const isPostOrPut = req.method === 'POST' || req.method === 'PUT';
  
  if (isShopRoute && isPostOrPut) {
    // shop 라우트의 POST/PUT 요청은 multer가 처리하므로 JSON/URL 파싱 건너뛰기
    console.log('🔍 [MIDDLEWARE] shop 라우트 JSON/URL 파싱 건너뛰기:', req.path, req.method);
    next();
  } else {
    // 다른 모든 요청은 JSON 파싱 적용
    console.log('🔍 [MIDDLEWARE] JSON 파싱 적용:', req.path, req.method);
    express.json({ limit: '10mb' })(req, res, (err) => {
      if (err) {
        console.error('❌ [MIDDLEWARE] JSON 파싱 오류:', err.message);
        return next(err);
      }
      // JSON 파싱 후 URL 파싱 적용
      express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
    });
  }
});

// 정적 파일 제공 (업로드된 이미지) - CORS 헤더 추가
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Cache-Control', 'public, max-age=31536000'); // 1년 캐시
  next();
}, express.static('uploads'));

// 추가 정적 파일 경로 (프로젝트 이미지용)
app.use('/api/warehouse/image', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Cache-Control', 'public, max-age=31536000'); // 1년 캐시
  next();
}, express.static('uploads/project/mj/registImage'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  // X-Forwarded-For 헤더 관련 경고 해결
  skip: (req) => req.headers['x-forwarded-for']
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/users', require('./routes/users'));
app.use('/api/mj-project', require('./routes/mj-project'));
app.use('/api/warehouse', require('./routes/warehouse'));
app.use('/api/packing-list', require('./routes/packing-list'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/logistic-payment', require('./routes/logistic-payment'));
app.use('/api/payment-request', require('./routes/payment-request'));
app.use('/api/mobile/finance', require('./routes/mobile-finance'));
app.use('/api/app-update', require('./routes/app-update'));
app.use('/api/inventory', require('./routes/inventory'));

// app.use('/api/products', require('./routes/products'));
// app.use('/api/orders', require('./routes/orders'));
// app.use('/api/quotations', require('./routes/quotations'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Manufacturing API is running' });
});

// Migration status check
app.get('/api/migration/status', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    
    // mj_project 테이블 마이그레이션 상태 확인
    const [projects] = await pool.execute(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN additional_cost_items IS NOT NULL THEN 1 END) as projects_with_additional_costs,
        COUNT(CASE WHEN unit_price IS NOT NULL THEN 1 END) as projects_with_unit_price,
        COUNT(CASE WHEN unit_weight IS NOT NULL THEN 1 END) as projects_with_unit_weight,
        COUNT(CASE WHEN packaging_method IS NOT NULL THEN 1 END) as projects_with_packaging_method,
        COUNT(CASE WHEN box_dimensions IS NOT NULL THEN 1 END) as projects_with_box_dimensions,
        COUNT(CASE WHEN box_weight IS NOT NULL THEN 1 END) as projects_with_box_weight,
        COUNT(CASE WHEN factory_delivery_days IS NOT NULL THEN 1 END) as projects_with_delivery_days,
        COUNT(CASE WHEN actual_order_date IS NOT NULL THEN 1 END) as projects_with_actual_order_date,
        COUNT(CASE WHEN expected_factory_shipping_date IS NOT NULL THEN 1 END) as projects_with_expected_shipping_date,
        COUNT(CASE WHEN actual_factory_shipping_date IS NOT NULL THEN 1 END) as projects_with_actual_shipping_date,
        COUNT(CASE WHEN is_order_completed = 1 THEN 1 END) as projects_with_completed_orders,
        COUNT(CASE WHEN is_factory_shipping_completed = 1 THEN 1 END) as projects_with_completed_factory_shipping,
        COUNT(CASE WHEN entry_quantity IS NOT NULL THEN 1 END) as projects_with_entry_quantity,
        COUNT(CASE WHEN export_quantity IS NOT NULL THEN 1 END) as projects_with_export_quantity,
        COUNT(CASE WHEN remain_quantity IS NOT NULL THEN 1 END) as projects_with_remain_quantity
      FROM mj_project
    `);

    // warehouse stock 필드 마이그레이션 상태 확인
    let warehouseStockStatus = { has_stock_fields: false, total_entries: 0, entries_with_stock: 0 };
    try {
      const [stockColumns] = await pool.execute(
        "SHOW COLUMNS FROM warehouse_entries LIKE 'stock_quantity'"
      );
      warehouseStockStatus.has_stock_fields = stockColumns.length > 0;
      
      if (warehouseStockStatus.has_stock_fields) {
        const [stockData] = await pool.execute(
          "SELECT COUNT(*) as total, COUNT(CASE WHEN stock_quantity IS NOT NULL THEN 1 END) as with_stock FROM warehouse_entries"
        );
        warehouseStockStatus.total_entries = stockData[0].total;
        warehouseStockStatus.entries_with_stock = stockData[0].with_stock;
      }
    } catch (error) {
      console.error('warehouse stock 상태 확인 오류:', error);
    }

    // logistic_payment 테이블 마이그레이션 상태 확인
    let logisticPaymentStatus = { table_exists: false, total_records: 0, table_structure: [] };
    try {
      const [logisticTables] = await pool.execute(
        "SHOW TABLES LIKE 'logistic_payment'"
      );
      logisticPaymentStatus.table_exists = logisticTables.length > 0;
      
      if (logisticPaymentStatus.table_exists) {
        const [logisticData] = await pool.execute(
          "SELECT COUNT(*) as total FROM logistic_payment"
        );
        logisticPaymentStatus.total_records = logisticData[0].total;
        
        const [logisticColumns] = await pool.execute(
          "DESCRIBE logistic_payment"
        );
        logisticPaymentStatus.table_structure = logisticColumns.map(col => ({
          field: col.Field,
          type: col.Type,
          null: col.Null,
          default: col.Default,
          key: col.Key
        }));
      }
    } catch (error) {
      console.error('logistic_payment 상태 확인 오류:', error);
    }

    // mj_project 테이블 quantity 필드 마이그레이션 상태 확인
    let mjProjectQuantityStatus = { has_quantity_fields: false, total_projects: 0, projects_with_quantity: 0 };
    try {
      const [quantityColumns] = await pool.execute("SHOW COLUMNS FROM mj_project LIKE 'entry_quantity'");
      const [quantityData] = await pool.execute("SELECT COUNT(*) as total, COUNT(CASE WHEN entry_quantity IS NOT NULL THEN 1 END) as with_entry_quantity FROM mj_project");
      
      mjProjectQuantityStatus = {
        has_quantity_fields: quantityColumns.length > 0,
        total_projects: quantityData[0].total,
        projects_with_entry_quantity: quantityData[0].with_entry_quantity
      };
    } catch (error) {
      console.log('mj_project 테이블 quantity 필드 확인 중 오류 (무시됨):', error.message);
    }

    // 소프트 삭제 필드 마이그레이션 상태 확인
    let softDeleteStatus = { has_soft_delete_fields: false, total_packing_items: 0, deleted_items: 0 };
    try {
      const [softDeleteColumns] = await pool.execute("SHOW COLUMNS FROM mj_packing_list LIKE 'is_deleted'");
      const [softDeleteData] = await pool.execute("SELECT COUNT(*) as total, COUNT(CASE WHEN is_deleted = TRUE THEN 1 END) as deleted FROM mj_packing_list");
      
      softDeleteStatus = {
        has_soft_delete_fields: softDeleteColumns.length > 0,
        total_packing_items: softDeleteData[0].total,
        deleted_items: softDeleteData[0].deleted
      };
    } catch (error) {
      console.log('소프트 삭제 필드 확인 중 오류 (무시됨):', error.message);
    }

    const migration_status = {
      // mj_project 테이블 상태
      has_additional_costs: projects[0].projects_with_additional_costs > 0,
      has_unit_price: projects[0].projects_with_unit_price > 0,
      has_unit_weight: projects[0].projects_with_unit_weight > 0,
      has_packaging_method: projects[0].projects_with_packaging_method > 0,
      has_box_dimensions: projects[0].projects_with_box_dimensions > 0,
      has_box_weight: projects[0].projects_with_box_weight > 0,
      has_delivery_days: projects[0].projects_with_delivery_days > 0,
      has_actual_order_date: projects[0].projects_with_actual_order_date > 0,
      has_expected_shipping_date: projects[0].projects_with_expected_shipping_date > 0,
      has_actual_shipping_date: projects[0].projects_with_actual_shipping_date > 0,
      has_completed_orders: projects[0].projects_with_completed_orders > 0,
      has_completed_factory_shipping: projects[0].projects_with_completed_factory_shipping > 0,
      has_entry_quantity: projects[0].projects_with_entry_quantity > 0,
      has_export_quantity: projects[0].projects_with_export_quantity > 0,
      has_remain_quantity: projects[0].projects_with_remain_quantity > 0,
      total_projects: projects[0].total_projects,
      
      // warehouse_entries 테이블 상태
      warehouse_stock: warehouseStockStatus,
      
      // logistic_payment 테이블 상태
      logistic_payment: logisticPaymentStatus,
      
      // mj_project 테이블 quantity 필드 상태
      mj_project_quantity: mjProjectQuantityStatus,
      
      // 소프트 삭제 필드 상태
      soft_delete: softDeleteStatus
    };

    res.json({ migration_status });
  } catch (error) {
    console.error('마이그레이션 상태 확인 오류:', error);
    res.status(500).json({ error: '마이그레이션 상태 확인 중 오류가 발생했습니다.' });
  }
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working correctly!' });
});

// unit_price 데이터 확인용 테스트 엔드포인트
app.get('/api/test/unit-price', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    const [projects] = await pool.execute(`
      SELECT id, project_name, unit_price, target_price, quantity 
      FROM mj_project 
      LIMIT 5
    `);
    
    res.json({ 
      message: 'unit_price 데이터 확인',
      projects: projects,
      total_count: projects.length
    });
  } catch (error) {
    console.error('unit_price 테스트 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// warehouse stock 필드 상태 확인용 테스트 엔드포인트
app.get('/api/test/warehouse-stock', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    
    // warehouse_entries 테이블 구조 확인
    const [columns] = await pool.execute('DESCRIBE warehouse_entries');
    
    // stock 필드가 있는지 확인
    const hasStockField = columns.some(col => col.Field === 'stock');
    const hasOutQuantityField = columns.some(col => col.Field === 'out_quantity');
    
    // 데이터 샘플 확인
    let sampleData = [];
    if (hasStockField) {
      const [data] = await pool.execute(`
        SELECT id, project_id, quantity, stock, out_quantity, entry_date, status
        FROM warehouse_entries 
        LIMIT 5
      `);
      sampleData = data;
    }
    
    res.json({ 
      message: 'warehouse stock 필드 상태 확인',
      table_structure: {
        has_stock_field: hasStockField,
        has_out_quantity_field: hasOutQuantityField,
        total_columns: columns.length
      },
      sample_data: sampleData,
      columns: columns.map(col => ({
        field: col.Field,
        type: col.Type,
        null: col.Null,
        default: col.Default,
        comment: col.Comment
      }))
    });
  } catch (error) {
    console.error('warehouse stock 테스트 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// mj_project quantity 필드 상태 확인용 테스트 엔드포인트
app.get('/api/test/mj-project-quantity', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    
    // mj_project 테이블 구조 확인
    const [columns] = await pool.execute('DESCRIBE mj_project');
    
    // quantity 필드들이 있는지 확인
    const hasEntryQuantityField = columns.some(col => col.Field === 'entry_quantity');
    const hasExportQuantityField = columns.some(col => col.Field === 'export_quantity');
    const hasRemainQuantityField = columns.some(col => col.Field === 'remain_quantity');
    
    // 데이터 샘플 확인
    let sampleData = [];
    if (hasEntryQuantityField && hasExportQuantityField && hasRemainQuantityField) {
      const [data] = await pool.execute(`
        SELECT id, project_name, quantity, entry_quantity, export_quantity, remain_quantity,
               (entry_quantity - export_quantity) as calculated_remaining_quantity
        FROM mj_project 
        LIMIT 5
      `);
      sampleData = data;
    }
    
    res.json({ 
      message: 'mj_project quantity 필드 상태 확인',
      table_structure: {
        has_entry_quantity_field: hasEntryQuantityField,
        has_export_quantity_field: hasExportQuantityField,
        has_remain_quantity_field: hasRemainQuantityField,
        total_columns: columns.length
      },
      sample_data: sampleData,
      columns: columns.filter(col => 
        col.Field === 'entry_quantity' || 
        col.Field === 'export_quantity' || 
        col.Field === 'remain_quantity' || 
        col.Field === 'quantity'
      ).map(col => ({
        field: col.Field,
        type: col.Type,
        null: col.Null,
        default: col.Default,
        comment: col.Comment
      }))
    });
  } catch (error) {
    console.error('mj_project quantity 테스트 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 서버 시작 및 데이터베이스 초기화
const startServer = async () => {
  try {
    // 데이터베이스 연결 테스트
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ 데이터베이스 연결 실패로 서버를 시작할 수 없습니다.');
      process.exit(1);
    }

    // 데이터베이스 마이그레이션 실행
    console.log('🔧 데이터베이스 마이그레이션 실행 중...');
    try {
      await runAllMigrations();
      console.log('✅ 모든 마이그레이션이 성공적으로 완료되었습니다!');
    } catch (error) {
      console.error('❌ 마이그레이션 실행 중 오류 발생:', error);
      console.log('⚠️  서버는 계속 실행되지만 일부 기능이 제한될 수 있습니다.');
    }
    
    console.log('✅ 데이터베이스 초기화 완료!');
    
    // 서버 시작 (모든 IP에서 접근 가능하도록 설정)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Manufacturing API 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`🌍 서버 환경: ${NODE_ENV} (${isProduction ? '상용' : '개발'})`);
      console.log(`🌍 Timezone: ${process.env.TZ}`);
      console.log(`📊 마이그레이션 상태 확인: http://localhost:${PORT}/api/migration/status`);
      console.log(`📱 모바일 앱 접근: http://${process.env.SERVER_HOST || 'localhost'}:${PORT}/api/mj-project`);
      console.log(`⏱️  서버 타임아웃: ${serverTimeout}ms`);
      console.log('💡 서버가 완전히 시작되기까지 몇 초 정도 소요될 수 있습니다.');
    });

    // 서버 타임아웃 설정
    server.timeout = serverTimeout;
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
};

// 서버 시작
startServer(); 