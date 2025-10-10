const mysql = require('mysql2/promise');
const config = require('./environment-loader');

// 데이터베이스 연결 설정 (환경별 설정 사용)
const dbConfig = {
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+09:00', // 한국 시간대 (KST)
  charset: 'utf8mb4',
  // 추가 시간대 설정
  dateStrings: true, // 날짜를 문자열로 반환
  supportBigNumbers: true,
  bigNumberStrings: true,
  // MariaDB/MySQL 인증 플러그인 설정
  authPlugins: {
    mysql_native_password: () => () => Buffer.alloc(0)
  },
  // MariaDB 호환성 설정
  insecureAuth: true
};

console.log(`🔗 데이터베이스 연결 설정: ${config.DB_HOST}:${config.DB_NAME} (${config.NODE_ENV})`);

// 연결 풀 생성
const pool = mysql.createPool(dbConfig);

// factory_shipping_status 필드 마이그레이션 함수
async function migrateFactoryShippingStatus() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 factory_shipping_status 필드 마이그레이션 시작...');
    
    // factory_shipping_status 필드 존재 여부 확인
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM mj_project LIKE 'factory_shipping_status'"
    );

    if (columns.length === 0) {
      // 필드가 없으면 추가
      await connection.execute(`
        ALTER TABLE mj_project 
        ADD COLUMN factory_shipping_status VARCHAR(50) DEFAULT '출고 대기' 
        COMMENT '공장 출고 상태 (정시출고, 조기출고, 출고연기, 출고 대기)'
      `);
      
      console.log('✅ factory_shipping_status 필드 추가 완료');
      
      // 기존 데이터에 대한 기본값 설정
      await connection.execute(`
        UPDATE mj_project 
        SET factory_shipping_status = '출고 대기' 
        WHERE factory_shipping_status IS NULL
      `);
      
      console.log('✅ 기존 데이터 기본값 설정 완료');
      
      return { success: true, added: true, message: 'factory_shipping_status 필드 마이그레이션이 완료되었습니다.' };
    } else {
      console.log('ℹ️ factory_shipping_status 필드가 이미 존재합니다.');
      return { success: true, added: false, message: 'factory_shipping_status 필드가 이미 존재합니다.' };
    }
    
  } catch (error) {
    console.error('❌ factory_shipping_status 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}

// warehouse 관련 테이블 마이그레이션 함수
async function migrateWarehouseTables() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 warehouse 관련 테이블 마이그레이션 시작...');
    
    // warehouse_entries 테이블 존재 여부 확인
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'warehouse_entries'"
    );

    if (tables.length === 0) {
      // warehouse_entries 테이블 생성
      await connection.execute(`
        CREATE TABLE warehouse_entries (
          id INT PRIMARY KEY AUTO_INCREMENT,
          project_id INT NOT NULL,
          entry_date DATE NOT NULL COMMENT '입고 날짜',
          shipping_date DATE NOT NULL COMMENT '출고 날짜',
          quantity INT NOT NULL COMMENT '입고 수량',
          status ENUM('입고중', '입고완료') DEFAULT '입고중' COMMENT '입고 상태',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          INDEX idx_project_id (project_id),
          INDEX idx_entry_date (entry_date),
          INDEX idx_shipping_date (shipping_date),
          INDEX idx_status (status),
          
          FOREIGN KEY (project_id) REFERENCES mj_project(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='입고 기록 테이블'
      `);
      
      console.log('✅ warehouse_entries 테이블 생성 완료');
    } else {
      console.log('ℹ️ warehouse_entries 테이블이 이미 존재합니다.');
    }

    // warehouse_images 테이블 존재 여부 확인
    const [imageTables] = await connection.execute(
      "SHOW TABLES LIKE 'warehouse_images'"
    );

    if (imageTables.length === 0) {
      // warehouse_images 테이블 생성
      await connection.execute(`
        CREATE TABLE warehouse_images (
          id INT PRIMARY KEY AUTO_INCREMENT,
          project_id INT NOT NULL COMMENT '프로젝트 ID',
          entry_id INT NOT NULL COMMENT '입고 기록 ID',
          original_filename VARCHAR(255) NOT NULL COMMENT '원본 파일명',
          stored_filename VARCHAR(255) NOT NULL COMMENT '저장된 파일명',
          file_path VARCHAR(500) NOT NULL COMMENT '파일 경로',
          file_size INT NOT NULL COMMENT '파일 크기 (bytes)',
          mime_type VARCHAR(100) NOT NULL COMMENT 'MIME 타입',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_project_id (project_id),
          INDEX idx_entry_id (entry_id),
          INDEX idx_created_at (created_at),
          
          FOREIGN KEY (project_id) REFERENCES mj_project(id) ON DELETE CASCADE,
          FOREIGN KEY (entry_id) REFERENCES warehouse_entries(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='입고 이미지 테이블'
      `);
      
      console.log('✅ warehouse_images 테이블 생성 완료');
    } else {
      console.log('ℹ️ warehouse_images 테이블이 이미 존재합니다.');
    }

    // 기존 테이블에 누락된 컬럼이 있는지 확인하고 추가
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM warehouse_entries LIKE 'status'"
    );

    if (columns.length === 0) {
      // status 컬럼 추가
      await connection.execute(`
        ALTER TABLE warehouse_entries 
        ADD COLUMN status ENUM('입고중', '입고완료') DEFAULT '입고중' 
        COMMENT '입고 상태'
      `);
      
      console.log('✅ warehouse_entries 테이블에 status 컬럼 추가 완료');
    }

    return { success: true, message: 'warehouse 관련 테이블 마이그레이션이 완료되었습니다.' };
    
  } catch (error) {
    console.error('❌ warehouse 테이블 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}

// Payment 관련 컬럼 마이그레이션 함수
const migratePaymentColumns = async () => {
  try {
    const connection = await pool.getConnection();
    
    // unit_price 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,2) DEFAULT NULL');
      console.log('✅ unit_price 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // fee_rate 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS fee_rate DECIMAL(5,2) DEFAULT 0');
      console.log('✅ fee_rate 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // payment_status 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS payment_status JSON DEFAULT NULL');
      console.log('✅ payment_status 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // payment_dates 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS payment_dates JSON DEFAULT NULL');
      console.log('✅ payment_dates 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // balance_due_date 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS balance_due_date DATE DEFAULT NULL');
      console.log('✅ balance_due_date 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // supplier_name 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200) DEFAULT NULL COMMENT "공급자 이름"');
      console.log('✅ supplier_name 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // balance_amount 컬럼 추가
    try {
      await connection.execute('ALTER TABLE mj_project ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(15,2) DEFAULT 0 COMMENT "잔금 총액 (수수료 + 배송비 + 추가비용)"');
      console.log('✅ balance_amount 필드 추가/확인 완료');
    } catch (error) {
      // 필드가 이미 존재하는 경우 무시
    }
    
    // balance_amount 인덱스 추가
    try {
      await connection.execute('CREATE INDEX IF NOT EXISTS idx_balance_amount ON mj_project(balance_amount)');
      console.log('✅ balance_amount 인덱스 추가/확인 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ balance_amount 인덱스가 이미 존재합니다.');
      } else {
        console.log('ℹ️ balance_amount 인덱스 추가 중 오류 (무시됨):', error.message);
      }
    }
    
    // 기존 데이터에 대한 balance_amount 계산 및 업데이트
    try {
      const [updateResult] = await connection.execute(`
        UPDATE mj_project 
        SET balance_amount = COALESCE(fee, 0) + COALESCE(factory_shipping_cost, 0) + 
            CASE 
                WHEN additional_cost_items IS NOT NULL AND additional_cost_items != '[]' 
                THEN (
                    SELECT COALESCE(SUM(CAST(JSON_EXTRACT(value, '$.cost') AS DECIMAL(15,2))), 0)
                    FROM JSON_TABLE(additional_cost_items, '$[*]' COLUMNS (value JSON PATH '$')) AS jt
                )
                ELSE 0 
            END
        WHERE balance_amount IS NULL OR balance_amount = 0
      `);
      
      if (updateResult.affectedRows > 0) {
        console.log(`✅ ${updateResult.affectedRows}개 프로젝트의 balance_amount가 계산되어 업데이트되었습니다.`);
      } else {
        console.log('ℹ️ 업데이트할 balance_amount가 없습니다.');
      }
    } catch (error) {
      console.log('ℹ️ balance_amount 계산 업데이트 중 오류 (무시됨):', error.message);
    }
    
    connection.release();
    return { success: true, message: 'Payment 관련 컬럼 마이그레이션이 완료되었습니다.' };
  } catch (error) {
    console.error('❌ Payment 컬럼 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  }
};

// mj_project 테이블 entry_quantity, export_quantity 필드 마이그레이션 함수
async function migrateMJProjectQuantityFields() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 mj_project 테이블 quantity 필드 마이그레이션 시작...');
    
    // entry_quantity 필드 존재 여부 확인
    const [entryQuantityColumns] = await connection.execute(
      "SHOW COLUMNS FROM mj_project LIKE 'entry_quantity'"
    );
    
    // export_quantity 필드 존재 여부 확인
    const [exportQuantityColumns] = await connection.execute(
      "SHOW COLUMNS FROM mj_project LIKE 'export_quantity'"
    );
    
    // remain_quantity 필드 존재 여부 확인
    const [remainQuantityColumns] = await connection.execute(
      "SHOW COLUMNS FROM mj_project LIKE 'remain_quantity'"
    );
    
    // entry_quantity 필드가 없으면 추가
    if (entryQuantityColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE mj_project 
        ADD COLUMN entry_quantity INT DEFAULT 0 COMMENT '입고 수량'
      `);
      console.log('✅ entry_quantity 필드 추가 완료');
    } else {
      console.log('ℹ️ entry_quantity 필드가 이미 존재합니다.');
    }
    
    // export_quantity 필드가 없으면 추가
    if (exportQuantityColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE mj_project 
        ADD COLUMN export_quantity INT DEFAULT 0 COMMENT '출고 수량'
      `);
      console.log('✅ export_quantity 필드 추가 완료');
    } else {
      console.log('ℹ️ export_quantity 필드가 이미 존재합니다.');
    }
    
    // remain_quantity 필드가 없으면 추가
    if (remainQuantityColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE mj_project 
        ADD COLUMN remain_quantity INT DEFAULT 0 COMMENT '잔여 수량 (입고 - 출고)'
      `);
      console.log('✅ remain_quantity 필드 추가 완료');
    } else {
      console.log('ℹ️ remain_quantity 필드가 이미 존재합니다.');
    }
    
    // 기존 데이터에 대한 초기값 설정
    if (entryQuantityColumns.length === 0) {
      await connection.execute(`
        UPDATE mj_project 
        SET entry_quantity = 0 
        WHERE entry_quantity IS NULL
      `);
      console.log('✅ entry_quantity 필드 초기값 설정 완료');
    }
    
    if (exportQuantityColumns.length === 0) {
      await connection.execute(`
        UPDATE mj_project 
        SET export_quantity = 0 
        WHERE export_quantity IS NULL
      `);
      console.log('✅ export_quantity 필드 초기값 설정 완료');
    }
    
    if (remainQuantityColumns.length === 0) {
      await connection.execute(`
        UPDATE mj_project 
        SET remain_quantity = 0 
        WHERE remain_quantity IS NULL
      `);
      console.log('✅ remain_quantity 필드 초기값 설정 완료');
    }
    
    // 인덱스 추가
    try {
      await connection.execute(`
        CREATE INDEX idx_entry_quantity ON mj_project(entry_quantity)
      `);
      console.log('✅ entry_quantity 인덱스 추가/확인 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ entry_quantity 인덱스가 이미 존재합니다.');
      } else {
        throw error;
      }
    }
    
    try {
      await connection.execute(`
        CREATE INDEX idx_export_quantity ON mj_project(export_quantity)
      `);
      console.log('✅ export_quantity 인덱스 추가/확인 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ export_quantity 인덱스가 이미 존재합니다.');
      } else {
        throw error;
      }
    }
    
    try {
      await connection.execute(`
        CREATE INDEX idx_remain_quantity ON mj_project(remain_quantity)
      `);
      console.log('✅ remain_quantity 인덱스 추가/확인 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ remain_quantity 인덱스가 이미 존재합니다.');
      } else {
        throw error;
      }
    }
    
    // 제약조건 추가 (기존 제약조건 확인 후 추가)
    try {
      // 기존 제약조건 확인
      const [constraints] = await connection.execute(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'mj_project' 
        AND CONSTRAINT_TYPE = 'CHECK'
      `);
      
      const existingConstraints = constraints.map(c => c.CONSTRAINT_NAME);
      
      // entry_quantity 양수 제약조건
      if (!existingConstraints.includes('chk_entry_quantity_positive')) {
        await connection.execute(`
          ALTER TABLE mj_project 
          ADD CONSTRAINT chk_entry_quantity_positive CHECK (entry_quantity >= 0)
        `);
        console.log('✅ entry_quantity 양수 제약조건 추가 완료');
      } else {
        console.log('ℹ️ entry_quantity 양수 제약조건이 이미 존재합니다.');
      }
      
      // export_quantity 양수 제약조건
      if (!existingConstraints.includes('chk_export_quantity_positive')) {
        await connection.execute(`
          ALTER TABLE mj_project 
          ADD CONSTRAINT chk_export_quantity_positive CHECK (export_quantity >= 0)
        `);
        console.log('✅ export_quantity 양수 제약조건 추가 완료');
      } else {
        console.log('ℹ️ export_quantity 양수 제약조건이 이미 존재합니다.');
      }
      
      // export_quantity 제한 제약조건
      if (!existingConstraints.includes('chk_export_quantity_limit')) {
        await connection.execute(`
          ALTER TABLE mj_project 
          ADD CONSTRAINT chk_export_quantity_limit CHECK (export_quantity <= entry_quantity)
        `);
        console.log('✅ export_quantity 제한 제약조건 추가 완료');
      } else {
        console.log('ℹ️ export_quantity 제한 제약조건이 이미 존재합니다.');
      }
      
      // remain_quantity 양수 제약조건
      if (!existingConstraints.includes('chk_remain_quantity_positive')) {
        await connection.execute(`
          ALTER TABLE mj_project 
          ADD CONSTRAINT chk_remain_quantity_positive CHECK (remain_quantity >= 0)
        `);
        console.log('✅ remain_quantity 양수 제약조건 추가 완료');
      } else {
        console.log('ℹ️ remain_quantity 양수 제약조건이 이미 존재합니다.');
      }
      
    } catch (error) {
      console.log('ℹ️ 제약조건 추가 중 오류 (무시됨):', error.message);
    }
    
    return { success: true, message: 'mj_project 테이블 quantity 필드 마이그레이션이 완료되었습니다.' };
    
  } catch (error) {
    console.error('❌ mj_project quantity 필드 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}

// mj_project_payments 테이블 마이그레이션 함수
async function migrateMJProjectPaymentsTable() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 mj_project_payments 테이블 마이그레이션 시작...');
    
    // mj_project_payments 테이블 존재 여부 확인
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'mj_project_payments'"
    );

    if (tables.length === 0) {
      console.log('📋 mj_project_payments 테이블이 존재하지 않습니다. 생성 중...');
      
      // SQL 파일 읽기
      const fs = require('fs');
      const path = require('path');
      const migrationPath = path.join(__dirname, '..', 'migrations', 'create_mj_project_payments_table.sql');
      
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // SQL 문을 세미콜론으로 분리하여 실행
        const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            await connection.execute(statement.trim());
          }
        }
        
        console.log('✅ mj_project_payments 테이블 생성 및 데이터 마이그레이션 완료');
      } else {
        console.error('❌ 마이그레이션 SQL 파일을 찾을 수 없습니다:', migrationPath);
      }
    } else {
      console.log('ℹ️ mj_project_payments 테이블이 이미 존재합니다.');
      
      // 기존 테이블 구조 확인
      const [columns] = await connection.execute("SHOW COLUMNS FROM mj_project_payments");
      const hasPaymentType = columns.some(col => col.Field === 'payment_type');
      
      if (hasPaymentType) {
        console.log('🔄 기존 ENUM 형식을 JSON 형식으로 마이그레이션 중...');
        
        // 기존 데이터를 JSON 형식으로 변환
        const [existingData] = await connection.execute(`
          SELECT project_id, payment_type, amount, is_paid, payment_date
          FROM mj_project_payments
          ORDER BY project_id, payment_type
        `);
        
        // 프로젝트별로 데이터 그룹화
        const projectData = {};
        existingData.forEach(row => {
          if (!projectData[row.project_id]) {
            projectData[row.project_id] = {
              paymentStatus: {},
              paymentDates: {},
              paymentAmounts: {}
            };
          }
          projectData[row.project_id].paymentStatus[row.payment_type] = Boolean(row.is_paid);
          projectData[row.project_id].paymentDates[row.payment_type] = row.payment_date;
          projectData[row.project_id].paymentAmounts[row.payment_type] = Number(row.amount) || 0;
        });
        
        // 기존 테이블 삭제 후 새로 생성
        await connection.execute('DROP TABLE mj_project_payments');
        
        // 새 테이블 생성
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, '..', 'migrations', 'create_mj_project_payments_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
        for (const statement of statements) {
          if (statement.trim() && !statement.trim().startsWith('INSERT')) {
            await connection.execute(statement.trim());
          }
        }
        
        // 기존 데이터를 JSON 형식으로 재삽입
        for (const [projectId, data] of Object.entries(projectData)) {
          await connection.execute(`
            INSERT INTO mj_project_payments (project_id, payment_status, payment_dates, payment_amounts)
            VALUES (?, ?, ?, ?)
          `, [
            projectId,
            JSON.stringify(data.paymentStatus),
            JSON.stringify(data.paymentDates),
            JSON.stringify(data.paymentAmounts)
          ]);
        }
        
        console.log('✅ JSON 형식으로 마이그레이션 완료');
      }
      
      // 기존 데이터 확인
      const [countResult] = await connection.execute(
        'SELECT COUNT(*) as count FROM mj_project_payments'
      );
      console.log(`ℹ️ 현재 mj_project_payments 테이블에 ${countResult[0].count}개의 레코드가 있습니다.`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ mj_project_payments 테이블 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}

// mj_packingList 테이블 마이그레이션 함수
async function migrateMJPackingListTable() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 mj_packingList 테이블 마이그레이션 시작...');
    
    // mj_packingList 테이블 존재 여부 확인
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'mj_packing_list'"
    );

    if (tables.length === 0) {
      // mj_packingList 테이블 생성
      await connection.execute(`
        CREATE TABLE mj_packing_list (
          id INT AUTO_INCREMENT PRIMARY KEY,
          packing_code VARCHAR(50) NOT NULL COMMENT '포장코드',
          box_count INT NOT NULL DEFAULT 0 COMMENT '박스수',
          pl_date DATE COMMENT '작성날짜',
          logistic_company VARCHAR(50) COMMENT '물류회사',
          product_name VARCHAR(255) NOT NULL COMMENT '상품명',
          product_sku VARCHAR(100) COMMENT '상품 SKU',
          product_image VARCHAR(500) COMMENT '상품사진 URL',
          packaging_method INT NOT NULL DEFAULT 0 COMMENT '소포장 구성',
          packaging_count INT NOT NULL DEFAULT 0 COMMENT '포장수',
          quantity_per_box INT NOT NULL DEFAULT 0 COMMENT '한박스내 수량',
          client_product_id VARCHAR(50) COMMENT '클라이언트 상품 ID (React 컴포넌트에서 생성된 고유 ID)',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
          
          INDEX idx_packing_code (packing_code),
          INDEX idx_pl_date (pl_date),
          INDEX idx_logistic_company (logistic_company),
          INDEX idx_product_name (product_name),
          INDEX idx_created_at (created_at),
          INDEX idx_client_product_id (client_product_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MJ 패킹리스트 테이블'
      `);
      
      console.log('✅ mj_packingList 테이블 생성 완료 (client_product_id 포함)');
      return { success: true, added: true, message: 'mj_packingList 테이블 마이그레이션이 완료되었습니다.' };
    } else {
      // 기존 테이블에 client_product_id 필드 추가
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM mj_packing_list LIKE 'client_product_id'"
      );

      if (columns.length === 0) {
        // client_product_id 필드 추가
        await connection.execute(`
          ALTER TABLE mj_packing_list 
          ADD COLUMN client_product_id VARCHAR(50) COMMENT '클라이언트 상품 ID (React 컴포넌트에서 생성된 고유 ID)'
        `);
        
        // 인덱스 추가
        await connection.execute(`
          CREATE INDEX idx_client_product_id ON mj_packing_list(client_product_id)
        `);
        
        // 기존 데이터의 client_product_id를 product_sku와 동일하게 설정
        await connection.execute(`
          UPDATE mj_packing_list 
          SET client_product_id = product_sku 
          WHERE client_product_id IS NULL
        `);
        
        console.log('✅ client_product_id 필드 추가 완료');
      } else {
        console.log('ℹ️ client_product_id 필드가 이미 존재합니다.');
      }
      
      // pl_date 필드 추가 확인
      const [plDateColumns] = await connection.execute(
        "SHOW COLUMNS FROM mj_packing_list LIKE 'pl_date'"
      );

      if (plDateColumns.length === 0) {
        // pl_date 필드 추가
        await connection.execute(`
          ALTER TABLE mj_packing_list 
          ADD COLUMN pl_date DATE COMMENT '작성날짜'
        `);
        
        // 인덱스 추가
        await connection.execute(`
          CREATE INDEX idx_pl_date ON mj_packing_list(pl_date)
        `);
        
        console.log('✅ pl_date 필드 추가 완료');
      } else {
        console.log('ℹ️ pl_date 필드가 이미 존재합니다.');
      }
      
      // logistic_company 필드 추가 확인
      const [logisticCompanyColumns] = await connection.execute(
        "SHOW COLUMNS FROM mj_packing_list LIKE 'logistic_company'"
      );

      if (logisticCompanyColumns.length === 0) {
        // logistic_company 필드 추가
        await connection.execute(`
          ALTER TABLE mj_packing_list 
          ADD COLUMN logistic_company VARCHAR(50) COMMENT '물류회사'
        `);
        
        // 인덱스 추가
        await connection.execute(`
          CREATE INDEX idx_logistic_company ON mj_packing_list(logistic_company)
        `);
        
        console.log('✅ logistic_company 필드 추가 완료');
      } else {
        console.log('ℹ️ logistic_company 필드가 이미 존재합니다.');
      }

      // project_id 필드 추가 확인
      const [projectIdColumns] = await connection.execute(
        "SHOW COLUMNS FROM mj_packing_list LIKE 'project_id'"
      );

      if (projectIdColumns.length === 0) {
        // project_id 필드 추가
        await connection.execute(`
          ALTER TABLE mj_packing_list 
          ADD COLUMN project_id INT COMMENT '프로젝트 ID (mj_project.id 참조)'
        `);
        
        // 인덱스 추가
        await connection.execute(`
          CREATE INDEX idx_project_id ON mj_packing_list(project_id)
        `);
        
        // 외래 키 제약 조건 추가 (선택사항)
        try {
          await connection.execute(`
            ALTER TABLE mj_packing_list 
            ADD CONSTRAINT fk_packing_list_project 
            FOREIGN KEY (project_id) REFERENCES mj_project(id) ON DELETE SET NULL
          `);
          console.log('✅ project_id 외래 키 제약 조건 추가 완료');
        } catch (error) {
          console.log('ℹ️ project_id 외래 키 제약 조건 추가 실패 (이미 존재하거나 제약 조건 문제):', error.message);
        }
        
        console.log('✅ project_id 필드 추가 완료');
      } else {
        console.log('ℹ️ project_id 필드가 이미 존재합니다.');
      }
      
      // 모든 마이그레이션이 완료되면 성공 반환
      return { success: true, added: false, message: 'mj_packingList 테이블 마이그레이션이 완료되었습니다.' };
    }
    
  } catch (error) {
    console.error('❌ mj_packingList 테이블 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}

// warehouse_entries 테이블 stock 필드 마이그레이션 함수
async function migrateWarehouseStockFields() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 warehouse_entries 테이블 stock 필드 마이그레이션 시작...');
    
    // stock 필드 존재 여부 확인
    const [stockColumns] = await connection.execute(
      "SHOW COLUMNS FROM warehouse_entries LIKE 'stock'"
    );

    if (stockColumns.length === 0) {
      // stock 필드 추가
      await connection.execute(`
        ALTER TABLE warehouse_entries 
        ADD COLUMN stock INT DEFAULT 0 COMMENT '현재 재고 수량'
      `);
      console.log('✅ stock 필드 추가 완료');
    } else {
      console.log('ℹ️ stock 필드가 이미 존재합니다.');
    }

    // out_quantity 필드 존재 여부 확인
    const [outQuantityColumns] = await connection.execute(
      "SHOW COLUMNS FROM warehouse_entries LIKE 'out_quantity'"
    );

    if (outQuantityColumns.length === 0) {
      // out_quantity 필드 추가
      await connection.execute(`
        ALTER TABLE warehouse_entries 
        ADD COLUMN out_quantity INT DEFAULT 0 COMMENT '출고 수량'
      `);
      console.log('✅ out_quantity 필드 추가 완료');
    } else {
      console.log('ℹ️ out_quantity 필드가 이미 존재합니다.');
    }

    // 기존 데이터에 대한 초기값 설정
    try {
      await connection.execute(`
        UPDATE warehouse_entries 
        SET stock = quantity 
        WHERE stock IS NULL OR stock = 0
      `);
      console.log('✅ stock 필드 초기값 설정 완료');
    } catch (error) {
      console.log('ℹ️ stock 필드 초기값 설정 중 오류 (무시됨):', error.message);
    }

    try {
      await connection.execute(`
        UPDATE warehouse_entries 
        SET out_quantity = 0 
        WHERE out_quantity IS NULL
      `);
      console.log('✅ out_quantity 필드 초기값 설정 완료');
    } catch (error) {
      console.log('ℹ️ out_quantity 필드 초기값 설정 중 오류 (무시됨):', error.message);
    }

    // 인덱스 추가 (성능 향상)
    try {
      await connection.execute('CREATE INDEX IF NOT EXISTS idx_stock ON warehouse_entries(stock)');
      console.log('✅ stock 인덱스 추가/확인 완료');
    } catch (error) {
      console.log('ℹ️ stock 인덱스 추가 중 오류 (무시됨):', error.message);
    }

    try {
      await connection.execute('CREATE INDEX IF NOT EXISTS idx_out_quantity ON warehouse_entries(out_quantity)');
      console.log('✅ out_quantity 인덱스 추가/확인 완료');
    } catch (error) {
      console.log('ℹ️ out_quantity 인덱스 추가 중 오류 (무시됨):', error.message);
    }

    // 제약 조건 추가 (데이터 무결성)
    try {
      await connection.execute('ALTER TABLE warehouse_entries ADD CONSTRAINT chk_stock_positive CHECK (stock >= 0)');
      console.log('✅ stock 제약조건 추가/확인 완료');
    } catch (error) {
      console.log('ℹ️ stock 제약조건 추가 중 오류 (무시됨):', error.message);
    }

    try {
      await connection.execute('ALTER TABLE warehouse_entries ADD CONSTRAINT chk_out_quantity_positive CHECK (out_quantity >= 0)');
      console.log('✅ out_quantity 제약조건 추가/확인 완료');
    } catch (error) {
      console.log('ℹ️ out_quantity 제약조건 추가 중 오류 (무시됨):', error.message);
    }

    try {
      await connection.execute('ALTER TABLE warehouse_entries ADD CONSTRAINT chk_out_quantity_limit CHECK (out_quantity <= quantity)');
      console.log('✅ out_quantity 제한 제약조건 추가/확인 완료');
    } catch (error) {
      console.log('ℹ️ out_quantity 제한 제약조건 추가 중 오류 (무시됨):', error.message);
    }

    return { success: true, message: 'warehouse_entries 테이블 stock 필드 마이그레이션이 완료되었습니다.' };
    
  } catch (error) {
    console.error('❌ warehouse stock 필드 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}

// finance_incoming 테이블 마이그레이션 함수
async function migrateFinanceIncomingTable() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 finance_incoming 테이블 마이그레이션 시작...');
    
    // finance_incoming 테이블 존재 여부 확인
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'finance_incoming'"
    );

    if (tables.length === 0) {
      // finance_incoming 테이블 생성 (확장된 구조)
      await connection.execute(`
        CREATE TABLE finance_incoming (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          transaction_date DATE NOT NULL,
          currency VARCHAR(10) NOT NULL DEFAULT 'KRW',
          exchange_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
          amount DECIMAL(15,2) NOT NULL,
          amount_krw DECIMAL(15,2) DEFAULT 0.00 COMMENT '원화 금액',
          amount_usd DECIMAL(15,2) DEFAULT 0.00 COMMENT '달러 금액',
          amount_cny DECIMAL(15,2) DEFAULT 0.00 COMMENT '위안 금액',
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          
          INDEX idx_user_id (user_id),
          INDEX idx_transaction_date (transaction_date),
          INDEX idx_currency (currency),
          INDEX idx_created_at (created_at),
          INDEX idx_amount_krw (amount_krw),
          INDEX idx_amount_usd (amount_usd),
          INDEX idx_amount_cny (amount_cny)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='입금 내역 테이블 (모든 화폐 단위별 금액 포함)'
      `);
      
      console.log('✅ finance_incoming 테이블 생성 완료 (확장된 구조)');
      return { success: true, added: true, message: 'finance_incoming 테이블이 생성되었습니다.' };
    } else {
      // 기존 테이블에 새 필드 추가
      console.log('🔄 기존 테이블에 화폐 단위별 금액 필드 추가 중...');
      
      // amount_krw 필드 추가
      try {
        await connection.execute(`
          ALTER TABLE finance_incoming 
          ADD COLUMN amount_krw DECIMAL(15,2) DEFAULT 0.00 COMMENT '원화 금액'
        `);
        console.log('✅ amount_krw 필드 추가 완료');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('ℹ️ amount_krw 필드가 이미 존재합니다.');
        } else {
          throw error;
        }
      }
      
      // amount_usd 필드 추가
      try {
        await connection.execute(`
          ALTER TABLE finance_incoming 
          ADD COLUMN amount_usd DECIMAL(15,2) DEFAULT 0.00 COMMENT '달러 금액'
        `);
        console.log('✅ amount_usd 필드 추가 완료');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('ℹ️ amount_usd 필드가 이미 존재합니다.');
        } else {
          throw error;
        }
      }
      
      // amount_cny 필드 추가
      try {
        await connection.execute(`
          ALTER TABLE finance_incoming 
          ADD COLUMN amount_cny DECIMAL(15,2) DEFAULT 0.00 COMMENT '위안 금액'
        `);
        console.log('✅ amount_cny 필드 추가 완료');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('ℹ️ amount_cny 필드가 이미 존재합니다.');
        } else {
          throw error;
        }
      }
      
      // 인덱스 추가
      try {
        await connection.execute('CREATE INDEX IF NOT EXISTS idx_amount_krw ON finance_incoming(amount_krw)');
        await connection.execute('CREATE INDEX IF NOT EXISTS idx_amount_usd ON finance_incoming(amount_usd)');
        await connection.execute('CREATE INDEX IF NOT EXISTS idx_amount_cny ON finance_incoming(amount_cny)');
        console.log('✅ 화폐 단위별 금액 인덱스 추가 완료');
      } catch (error) {
        console.log('ℹ️ 인덱스 추가 중 오류 (무시됨):', error.message);
      }
      
      // 기존 데이터에 대한 기본값 설정
      try {
        await connection.execute(`
          UPDATE finance_incoming 
          SET 
            amount_krw = CASE 
              WHEN currency = 'KRW' THEN amount 
              WHEN currency = 'USD' THEN amount * exchange_rate 
              WHEN currency = 'CNY' THEN amount * exchange_rate 
              ELSE 0 
            END,
            amount_usd = CASE 
              WHEN currency = 'KRW' THEN amount / 1350 
              WHEN currency = 'USD' THEN amount 
              WHEN currency = 'CNY' THEN amount * exchange_rate / 1350 
              ELSE 0 
            END,
            amount_cny = CASE 
              WHEN currency = 'KRW' THEN amount / 193 
              WHEN currency = 'USD' THEN amount * exchange_rate / 193 
              WHEN currency = 'CNY' THEN amount 
              ELSE 0 
            END
        `);
        console.log('✅ 기존 데이터 화폐 단위별 금액 설정 완료');
      } catch (error) {
        console.log('ℹ️ 기존 데이터 업데이트 중 오류 (무시됨):', error.message);
      }
      
      console.log('✅ finance_incoming 테이블 업데이트 완료');
      return { success: true, added: false, message: 'finance_incoming 테이블이 업데이트되었습니다.' };
    }
    
  } catch (error) {
    console.error('❌ finance_incoming 테이블 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}

// finance_expense 테이블 마이그레이션 함수
async function migrateFinanceExpenseTable() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 finance_expense 테이블 마이그레이션 시작...');
    
    // finance_expense 테이블 생성
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS finance_expense (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        transaction_date DATE NOT NULL,
        category VARCHAR(100) NOT NULL COMMENT '지출 카테고리',
        currency VARCHAR(10) NOT NULL DEFAULT 'KRW',
        exchange_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
        amount DECIMAL(15,2) NOT NULL,
        amount_krw DECIMAL(15,2) DEFAULT 0.00 COMMENT '원화 금액',
        amount_usd DECIMAL(15,2) DEFAULT 0.00 COMMENT '달러 금액',
        amount_cny DECIMAL(15,2) DEFAULT 0.00 COMMENT '위안 금액',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_user_id (user_id),
        INDEX idx_transaction_date (transaction_date),
        INDEX idx_category (category),
        INDEX idx_currency (currency),
        INDEX idx_created_at (created_at),
        INDEX idx_amount_krw (amount_krw),
        INDEX idx_amount_usd (amount_usd),
        INDEX idx_amount_cny (amount_cny)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ finance_expense 테이블 생성 완료');
    
    // amount_krw, amount_usd, amount_cny 컬럼이 없으면 추가
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM finance_expense 
      WHERE Field IN ('amount_krw', 'amount_usd', 'amount_cny')
    `);
    
    if (columns.length < 3) {
      // amount_krw 컬럼 추가
      try {
        await connection.execute('ALTER TABLE finance_expense ADD COLUMN amount_krw DECIMAL(15,2) DEFAULT 0.00 COMMENT "원화 금액"');
        console.log('✅ amount_krw 컬럼 추가 완료');
      } catch (error) {
        // 컬럼이 이미 존재하는 경우 무시
      }
      
      // amount_usd 컬럼 추가
      try {
        await connection.execute('ALTER TABLE finance_expense ADD COLUMN amount_usd DECIMAL(15,2) DEFAULT 0.00 COMMENT "달러 금액"');
        console.log('✅ amount_usd 컬럼 추가 완료');
      } catch (error) {
        // 컬럼이 이미 존재하는 경우 무시
      }
      
      // amount_cny 컬럼 추가
      try {
        await connection.execute('ALTER TABLE finance_expense ADD COLUMN amount_cny DECIMAL(15,2) DEFAULT 0.00 COMMENT "위안 금액"');
        console.log('✅ amount_cny 컬럼 추가 완료');
      } catch (error) {
        // 컬럼이 이미 존재하는 경우 무시
      }
      
      // 기존 데이터에 대한 화폐별 금액 계산 및 업데이트
      await connection.execute(`
        UPDATE finance_expense
        SET
          amount_krw = CASE
            WHEN currency = 'KRW' THEN amount
            WHEN currency = 'USD' THEN amount * exchange_rate
            WHEN currency = 'CNY' THEN amount * exchange_rate
            ELSE 0
          END,
          amount_usd = CASE
            WHEN currency = 'KRW' THEN amount / 1350
            WHEN currency = 'USD' THEN amount
            WHEN currency = 'CNY' THEN amount * exchange_rate / 1350
            ELSE 0
          END,
          amount_cny = CASE
            WHEN currency = 'KRW' THEN amount / 193
            WHEN currency = 'USD' THEN amount * exchange_rate / 193
            WHEN currency = 'CNY' THEN amount
            ELSE 0
          END
      `);
      console.log('✅ 기존 데이터 화폐별 금액 계산 완료');
    }
    
    // 인덱스 추가
    try {
      await connection.execute('CREATE INDEX IF NOT EXISTS idx_amount_krw ON finance_expense(amount_krw)');
      await connection.execute('CREATE INDEX IF NOT EXISTS idx_amount_usd ON finance_expense(amount_usd)');
      await connection.execute('CREATE INDEX IF NOT EXISTS idx_amount_cny ON finance_expense(amount_cny)');
      console.log('✅ 화폐별 금액 인덱스 추가 완료');
    } catch (error) {
      // 인덱스가 이미 존재하는 경우 무시
    }
    
    await connection.execute('ALTER TABLE finance_expense COMMENT = "지출 내역 테이블 (모든 화폐 단위별 금액 포함)"');
    
    connection.release();
    return { success: true, message: 'finance_expense 테이블 마이그레이션이 완료되었습니다.' };
  } catch (error) {
    console.error('❌ finance_expense 테이블 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  }
}

// app_versions 테이블 마이그레이션 함수
async function migrateAppVersionsTable() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 app_versions 테이블 마이그레이션 시작...');
    
    // app_versions 테이블 존재 여부 확인
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'app_versions'"
    );

    if (tables.length === 0) {
      // app_versions 테이블 생성
      await connection.execute(`
        CREATE TABLE app_versions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          version_code INT NOT NULL,
          version_name VARCHAR(50) NOT NULL,
          download_url VARCHAR(500),
          release_notes TEXT,
          force_update BOOLEAN DEFAULT FALSE,
          min_sdk INT DEFAULT 33,
          target_sdk INT DEFAULT 36,
          file_size BIGINT,
          checksum VARCHAR(64),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT TRUE,
          
          UNIQUE KEY unique_version_code (version_code),
          INDEX idx_version_code (version_code),
          INDEX idx_is_active (is_active),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='앱 버전 관리 테이블'
      `);
      
      console.log('✅ app_versions 테이블 생성 완료');
      
      // 초기 데이터 삽입 (현재 버전)
      await connection.execute(`
        INSERT INTO app_versions (
          version_code, 
          version_name, 
          download_url, 
          release_notes, 
          force_update,
          min_sdk,
          target_sdk,
          file_size,
          checksum
        ) VALUES (
          1, 
          '1.0', 
          'v1.apk', 
          '초기 버전', 
          FALSE,
          33,
          36,
          0,
          NULL
        )
      `);
      
      console.log('✅ app_versions 초기 데이터 삽입 완료');
      return { success: true, added: true, message: 'app_versions 테이블이 생성되었습니다.' };
    } else {
      console.log('ℹ️ app_versions 테이블이 이미 존재합니다.');
      return { success: true, added: false, message: 'app_versions 테이블이 이미 존재합니다.' };
    }
    
  } catch (error) {
    console.error('❌ app_versions 테이블 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}

// 지급 요청 테이블 마이그레이션 함수
async function migratePaymentRequestTables() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 지급 요청 테이블 마이그레이션 시작...');
    
    // mj_payment_requests 테이블 존재 여부 확인
    const [paymentRequestTables] = await connection.execute(
      "SHOW TABLES LIKE 'mj_payment_requests'"
    );

    if (paymentRequestTables.length === 0) {
      // mj_payment_requests 테이블 생성
      await connection.execute(`
        CREATE TABLE mj_payment_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          project_id INT NOT NULL,
          payment_type ENUM('advance', 'balance') NOT NULL COMMENT 'advance: 선금, balance: 잔금',
          amount DECIMAL(15,2) NOT NULL COMMENT '지급 요청 금액 (CNY)',
          fee_rate DECIMAL(5,2) DEFAULT NULL COMMENT '수수료율 (%) - 잔금 지급 요청시에만 사용',
          request_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '요청일시',
          status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending' COMMENT '처리 상태',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_project_id (project_id),
          INDEX idx_payment_type (payment_type),
          INDEX idx_status (status),
          INDEX idx_request_date (request_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='프로젝트 기반 지급 요청 테이블'
      `);
      
      console.log('✅ mj_payment_requests 테이블 생성 완료');
    } else {
      console.log('ℹ️ mj_payment_requests 테이블이 이미 존재합니다.');
      
      // 기존 테이블에 fee_rate 필드 추가 확인
      const [columns] = await connection.execute(
        "SHOW COLUMNS FROM mj_payment_requests LIKE 'fee_rate'"
      );

      if (columns.length === 0) {
        // fee_rate 필드 추가
        await connection.execute(`
          ALTER TABLE mj_payment_requests 
          ADD COLUMN fee_rate DECIMAL(5,2) DEFAULT NULL COMMENT '수수료율 (%) - 잔금 지급 요청시에만 사용'
        `);
        
        console.log('✅ mj_payment_requests 테이블에 fee_rate 필드 추가 완료');
      } else {
        console.log('ℹ️ fee_rate 필드가 이미 존재합니다.');
      }
    }

    // mj_shipping_payment_requests 테이블 존재 여부 확인
    const [shippingRequestTables] = await connection.execute(
      "SHOW TABLES LIKE 'mj_shipping_payment_requests'"
    );

    if (shippingRequestTables.length === 0) {
      // mj_shipping_payment_requests 테이블 생성
      await connection.execute(`
        CREATE TABLE mj_shipping_payment_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          pl_date DATE NOT NULL COMMENT '출고일',
          total_boxes INT NOT NULL COMMENT '총 박스 수',
          total_amount DECIMAL(15,2) NOT NULL COMMENT '총 배송비 금액 (CNY)',
          packing_codes TEXT NOT NULL COMMENT '포장코드 목록 (쉼표로 구분)',
          logistic_companies TEXT NOT NULL COMMENT '물류회사 목록 (쉼표로 구분)',
          request_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '요청일시',
          status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending' COMMENT '처리 상태',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_pl_date (pl_date),
          INDEX idx_status (status),
          INDEX idx_request_date (request_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='배송비 지급 요청 테이블'
      `);
      
      console.log('✅ mj_shipping_payment_requests 테이블 생성 완료');
    } else {
      console.log('ℹ️ mj_shipping_payment_requests 테이블이 이미 존재합니다.');
    }
    
    return { success: true, message: '지급 요청 테이블 마이그레이션이 완료되었습니다.' };
    
  } catch (error) {
    console.error('❌ 지급 요청 테이블 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    connection.release();
  }
}

// logistic_payment 테이블 마이그레이션 함수
async function migrateLogisticPaymentTable() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔧 [Database] logistic_payment 테이블 마이그레이션 시작...');
    
    // 테이블이 존재하는지 확인
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'logistic_payment'
    `, [process.env.DB_NAME || 'labsemble']);
    
    if (tables.length === 0) {
      // 테이블이 존재하지 않으면 새로 생성
      console.log('📝 [Database] logistic_payment 테이블 생성 중...');
      
      await connection.execute(`
        CREATE TABLE logistic_payment (
          id INT AUTO_INCREMENT PRIMARY KEY,
          mj_packing_list_id INT NOT NULL,
          pl_date DATE NOT NULL,
          packing_code VARCHAR(255) NOT NULL,
          logistic_company VARCHAR(255),
          box_no INT NOT NULL DEFAULT 1 COMMENT '박스 번호 (1부터 시작)',
          barcode_number VARCHAR(255),
          tracking_number VARCHAR(255),
          logistic_fee DECIMAL(10,2) DEFAULT 0.00,
          is_paid BOOLEAN DEFAULT FALSE,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (mj_packing_list_id) REFERENCES mj_packing_list(id) ON DELETE CASCADE,
          INDEX idx_packing_code (packing_code),
          INDEX idx_logistic_company (logistic_company),
          INDEX idx_box_no (box_no),
          INDEX idx_barcode_number (barcode_number),
          INDEX idx_pl_date (pl_date),
          INDEX idx_packing_code_list_id (packing_code, mj_packing_list_id),
          INDEX idx_company_packing_code (logistic_company, packing_code),
          INDEX idx_packing_code_box_no (packing_code, box_no),
          INDEX idx_list_id_box_no (mj_packing_list_id, box_no)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ [Database] logistic_payment 테이블 생성 완료');
    } else {
      // 테이블이 존재하면 필요한 컬럼과 인덱스 추가
      console.log('🔍 [Database] logistic_payment 테이블 구조 확인 중...');
      
      const [columns] = await connection.execute('DESCRIBE logistic_payment');
      const columnNames = columns.map(col => col.Field);
      
      // 필요한 컬럼들 확인 및 추가
      const requiredColumns = [
        { name: 'packing_code', sql: 'ADD COLUMN packing_code VARCHAR(255) NOT NULL' },
        { name: 'logistic_company', sql: 'ADD COLUMN logistic_company VARCHAR(255)' },
        { name: 'box_no', sql: 'ADD COLUMN box_no INT NOT NULL DEFAULT 1 COMMENT \'박스 번호 (1부터 시작)\'' },
        { name: 'barcode_number', sql: 'ADD COLUMN barcode_number VARCHAR(255) AFTER box_no' },
        { name: 'tracking_number', sql: 'ADD COLUMN tracking_number VARCHAR(255)' },
        { name: 'logistic_fee', sql: 'ADD COLUMN logistic_fee DECIMAL(10,2) DEFAULT 0.00' },
        { name: 'is_paid', sql: 'ADD COLUMN is_paid BOOLEAN DEFAULT FALSE' },
        { name: 'description', sql: 'ADD COLUMN description TEXT' },
        { name: 'pl_date', sql: 'ADD COLUMN pl_date DATE AFTER mj_packing_list_id' }
      ];
      
      for (const column of requiredColumns) {
        if (!columnNames.includes(column.name)) {
          console.log(`📝 [Database] ${column.name} 컬럼 추가 중...`);
          await connection.execute(`ALTER TABLE logistic_payment ${column.sql}`);
          console.log(`✅ [Database] ${column.name} 컬럼 추가 완료`);
        }
      }
      
      // box_no가 추가된 경우 기존 데이터 업데이트
      if (columnNames.includes('box_no')) {
        console.log('🔧 [Database] 기존 데이터의 box_no를 1로 설정 중...');
        await connection.execute('UPDATE logistic_payment SET box_no = 1 WHERE box_no IS NULL');
        console.log('✅ [Database] 기존 데이터 box_no 설정 완료');
      }
      
      // pl_date가 추가된 경우 기존 데이터 업데이트
      if (columnNames.includes('pl_date')) {
        console.log('🔧 [Database] 기존 데이터의 pl_date를 mj_packing_list에서 가져와서 업데이트 중...');
        await connection.execute(`
          UPDATE logistic_payment lp
          JOIN mj_packing_list mpl ON lp.mj_packing_list_id = mpl.id
          SET lp.pl_date = mpl.pl_date
          WHERE lp.pl_date IS NULL
        `);
        console.log('✅ [Database] 기존 데이터 pl_date 업데이트 완료');
      }
      
      // 필요한 인덱스들 확인 및 추가
      const [indexes] = await connection.execute('SHOW INDEX FROM logistic_payment');
      const indexNames = [...new Set(indexes.map(idx => idx.Key_name))];
      
      const requiredIndexes = [
        { name: 'idx_packing_code', sql: 'CREATE INDEX idx_packing_code ON logistic_payment(packing_code)' },
        { name: 'idx_logistic_company', sql: 'CREATE INDEX idx_logistic_company ON logistic_payment(logistic_company)' },
        { name: 'idx_box_no', sql: 'CREATE INDEX idx_box_no ON logistic_payment(box_no)' },
        { name: 'idx_packing_code_list_id', sql: 'CREATE INDEX idx_packing_code_list_id ON logistic_payment(packing_code, mj_packing_list_id)' },
        { name: 'idx_company_packing_code', sql: 'CREATE INDEX idx_company_packing_code ON logistic_payment(logistic_company, packing_code)' },
        { name: 'idx_packing_code_box_no', sql: 'CREATE INDEX idx_packing_code_box_no ON logistic_payment(packing_code, box_no)' },
        { name: 'idx_list_id_box_no', sql: 'CREATE INDEX idx_list_id_box_no ON logistic_payment(mj_packing_list_id, box_no)' },
        { name: 'idx_pl_date', sql: 'CREATE INDEX idx_pl_date ON logistic_payment(pl_date)' }
      ];
      
      for (const index of requiredIndexes) {
        if (!indexNames.includes(index.name)) {
          try {
            console.log(`📝 [Database] ${index.name} 인덱스 추가 중...`);
            await connection.execute(index.sql);
            console.log(`✅ [Database] ${index.name} 인덱스 추가 완료`);
          } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
              console.log(`⚠️ [Database] ${index.name} 인덱스가 이미 존재함`);
            } else {
              console.error(`❌ [Database] ${index.name} 인덱스 추가 실패:`, error.message);
            }
          }
        }
      }
      
      console.log('✅ [Database] logistic_payment 테이블 구조 업데이트 완료');
    }
    
    // 테이블 구조 최종 확인
    const [finalColumns] = await connection.execute('DESCRIBE logistic_payment');
    console.log('📊 [Database] logistic_payment 테이블 최종 구조:');
    finalColumns.forEach(col => {
      console.log(`   ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default} | ${col.Extra}`);
    });
    
    console.log('🎉 [Database] logistic_payment 테이블 마이그레이션 완료');
    
    return {
      success: true,
      message: 'logistic_payment 테이블 마이그레이션이 완료되었습니다.'
    };
    
  } catch (error) {
    console.error('❌ [Database] logistic_payment 테이블 마이그레이션 실패:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    connection.release();
  }
}

// 데이터베이스 연결 테스트 및 마이그레이션 실행
async function initializeDatabase() {
  try {
    console.log('🔄 데이터베이스 연결 테스트 중...');
    
    // 연결 테스트
    const connection = await pool.getConnection();
    console.log('✅ 데이터베이스 연결 성공');
    connection.release();
    
    // factory_shipping_status 마이그레이션 실행
    console.log('🔄 factory_shipping_status 마이그레이션 시작...');
    const factoryMigrationResult = await migrateFactoryShippingStatus();
    if (factoryMigrationResult.success) {
      console.log('✅ factory_shipping_status 마이그레이션 완료:', factoryMigrationResult.message);
    } else {
      console.error('❌ factory_shipping_status 마이그레이션 실패:', factoryMigrationResult.error);
    }
    
    // warehouse 테이블 마이그레이션 실행
    console.log('🔄 warehouse 테이블 마이그레이션 시작...');
    const warehouseMigrationResult = await migrateWarehouseTables();
    if (warehouseMigrationResult.success) {
      console.log('✅ warehouse 테이블 마이그레이션 완료:', warehouseMigrationResult.message);
    } else {
      console.error('❌ warehouse 테이블 마이그레이션 실패:', warehouseMigrationResult.error);
    }
    
    // Payment 관련 컬럼 마이그레이션 실행
    console.log('🔄 Payment 관련 컬럼 마이그레이션 시작...');
    const paymentMigrationResult = await migratePaymentColumns();
    if (paymentMigrationResult.success) {
      console.log('✅ Payment 관련 컬럼 마이그레이션 완료:', paymentMigrationResult.message);
    } else {
      console.error('❌ Payment 관련 컬럼 마이그레이션 실패:', paymentMigrationResult.error);
    }
    
    // warehouse stock 필드 마이그레이션 실행
    console.log('🔄 warehouse stock 필드 마이그레이션 시작...');
    const stockMigrationResult = await migrateWarehouseStockFields();
    if (stockMigrationResult.success) {
      console.log('✅ warehouse stock 필드 마이그레이션 완료:', stockMigrationResult.message);
    } else {
      console.error('❌ warehouse stock 필드 마이그레이션 실패:', stockMigrationResult.error);
    }
    
    // mj_project quantity 필드 마이그레이션 실행
    console.log('🔄 mj_project quantity 필드 마이그레이션 시작...');
    const quantityMigrationResult = await migrateMJProjectQuantityFields();
    if (quantityMigrationResult.success) {
      console.log('✅ mj_project quantity 필드 마이그레이션 완료:', quantityMigrationResult.message);
    } else {
      console.error('❌ mj_project quantity 필드 마이그레이션 실패:', quantityMigrationResult.error);
    }
    
    // mj_project_payments 테이블 마이그레이션 실행
    console.log('🔄 mj_project_payments 테이블 마이그레이션 시작...');
    const projectPaymentsMigrationResult = await migrateMJProjectPaymentsTable();
    if (projectPaymentsMigrationResult.success) {
      console.log('✅ mj_project_payments 테이블 마이그레이션 완료');
    } else {
      console.error('❌ mj_project_payments 테이블 마이그레이션 실패:', projectPaymentsMigrationResult.error);
    }
    
    // mj_packingList 테이블 마이그레이션 실행
    console.log('🔄 mj_packingList 테이블 마이그레이션 시작...');
    const packingListMigrationResult = await migrateMJPackingListTable();
    if (packingListMigrationResult.success) {
      console.log('✅ mj_packingList 테이블 마이그레이션 완료:', packingListMigrationResult.message);
    } else {
      console.error('❌ mj_packingList 테이블 마이그레이션 실패:', packingListMigrationResult.error);
    }
    
    // logistic_payment 테이블 마이그레이션 실행
    console.log('🔄 logistic_payment 테이블 마이그레이션 시작...');
    const logisticPaymentMigrationResult = await migrateLogisticPaymentTable();
    if (logisticPaymentMigrationResult.success) {
      console.log('✅ logistic_payment 테이블 마이그레이션 완료:', logisticPaymentMigrationResult.message);
    } else {
      console.error('❌ logistic_payment 테이블 마이그레이션 실패:', logisticPaymentMigrationResult.error);
    }
    
    // finance_incoming 테이블 마이그레이션 실행
    console.log('🔄 finance_incoming 테이블 마이그레이션 시작...');
    const financeMigrationResult = await migrateFinanceIncomingTable();
    if (financeMigrationResult.success) {
      console.log('✅ finance_incoming 테이블 마이그레이션 완료:', financeMigrationResult.message);
    } else {
      console.error('❌ finance_incoming 테이블 마이그레이션 실패:', financeMigrationResult.error);
    }
    
    // finance_expense 테이블 마이그레이션 실행
    console.log('🔄 finance_expense 테이블 마이그레이션 시작...');
    const expenseMigrationResult = await migrateFinanceExpenseTable();
    if (expenseMigrationResult.success) {
      console.log('✅ finance_expense 테이블 마이그레이션 완료:', expenseMigrationResult.message);
    } else {
      console.error('❌ finance_expense 테이블 마이그레이션 실패:', expenseMigrationResult.error);
    }
    
    // 지급 요청 테이블 마이그레이션 실행
    console.log('🔄 지급 요청 테이블 마이그레이션 시작...');
    const paymentRequestMigrationResult = await migratePaymentRequestTables();
    if (paymentRequestMigrationResult.success) {
      console.log('✅ 지급 요청 테이블 마이그레이션 완료:', paymentRequestMigrationResult.message);
    } else {
      console.error('❌ 지급 요청 테이블 마이그레이션 실패:', paymentRequestMigrationResult.error);
    }
    
    // app_versions 테이블 마이그레이션 실행
    console.log('🔄 app_versions 테이블 마이그레이션 시작...');
    const appVersionsMigrationResult = await migrateAppVersionsTable();
    if (appVersionsMigrationResult.success) {
      console.log('✅ app_versions 테이블 마이그레이션 완료:', appVersionsMigrationResult.message);
    } else {
      console.error('❌ app_versions 테이블 마이그레이션 실패:', appVersionsMigrationResult.error);
    }
    
    
    console.log('🎉 모든 마이그레이션이 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 오류:', error);
  }
}

// 서버 시작 시 자동으로 마이그레이션 실행
console.log('🚀 서버 시작 시 자동 마이그레이션을 시작합니다...');
initializeDatabase().then(() => {
  console.log('✅ 자동 마이그레이션이 완료되었습니다. 서버가 정상적으로 시작됩니다.');
}).catch((error) => {
  console.error('❌ 자동 마이그레이션 중 오류가 발생했습니다:', error);
  console.log('⚠️ 서버는 계속 실행되지만, 일부 기능이 제한될 수 있습니다.');
});

// 연결 테스트 함수
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MariaDB 연결 성공!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MariaDB 연결 실패:', error.message);
    
    // 연결 오류 상세 정보 로깅
    if (error.code === 'ECONNRESET') {
      console.error('🔌 연결이 재설정되었습니다. 재연결을 시도합니다.');
    } else if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('🔌 연결이 끊어졌습니다. 재연결을 시도합니다.');
    } else if (error.code === 'ER_CON_COUNT_ERROR') {
      console.error('🔌 연결 수가 제한을 초과했습니다.');
    }
    
    return false;
  }
};

// 소프트 삭제 필드 마이그레이션 함수
async function migrateSoftDeleteFields() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 소프트 삭제 필드 마이그레이션 시작...');
    
    // is_deleted 필드 존재 여부 확인
    const [isDeletedColumn] = await connection.execute(
      "SHOW COLUMNS FROM mj_packing_list LIKE 'is_deleted'"
    );

    if (isDeletedColumn.length === 0) {
      // is_deleted 필드 추가
      await connection.execute(`
        ALTER TABLE mj_packing_list 
        ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
        ADD COLUMN deleted_at TIMESTAMP NULL,
        ADD COLUMN deleted_by VARCHAR(255) NULL
      `);
      console.log('✅ is_deleted, deleted_at, deleted_by 필드가 추가되었습니다.');
    } else {
      console.log('ℹ️  is_deleted 필드가 이미 존재합니다.');
    }

    // 인덱스 추가
    try {
      await connection.execute(`
        CREATE INDEX idx_mj_packing_list_is_deleted ON mj_packing_list(is_deleted)
      `);
      console.log('✅ is_deleted 인덱스가 추가되었습니다.');
    } catch (indexError) {
      if (indexError.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  is_deleted 인덱스가 이미 존재합니다.');
      } else {
        throw indexError;
      }
    }

    try {
      await connection.execute(`
        CREATE INDEX idx_mj_packing_list_deleted_at ON mj_packing_list(deleted_at)
      `);
      console.log('✅ deleted_at 인덱스가 추가되었습니다.');
    } catch (indexError) {
      if (indexError.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  deleted_at 인덱스가 이미 존재합니다.');
      } else {
        throw indexError;
      }
    }

    console.log('✅ 소프트 삭제 필드 마이그레이션 완료!');
    
  } catch (error) {
    console.error('❌ 소프트 삭제 필드 마이그레이션 오류:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// logistic_payment 도착 필드 마이그레이션 함수
async function migrateLogisticPaymentArrivalFields() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 logistic_payment 도착 필드 마이그레이션 시작...');
    
    // is_arrived 필드 존재 여부 확인
    const [isArrivedColumn] = await connection.execute(
      "SHOW COLUMNS FROM logistic_payment LIKE 'is_arrived'"
    );

    if (isArrivedColumn.length === 0) {
      // is_arrived 필드가 없으면 추가
      await connection.execute(`
        ALTER TABLE logistic_payment 
        ADD COLUMN is_arrived BOOLEAN DEFAULT FALSE 
        COMMENT '한국도착 여부'
      `);
      console.log('✅ logistic_payment.is_arrived 필드가 추가되었습니다.');
    } else {
      console.log('ℹ️  logistic_payment.is_arrived 필드가 이미 존재합니다.');
    }

    // arrived_date 필드 존재 여부 확인
    const [arrivedDateColumn] = await connection.execute(
      "SHOW COLUMNS FROM logistic_payment LIKE 'arrived_date'"
    );

    if (arrivedDateColumn.length === 0) {
      // arrived_date 필드가 없으면 추가
      await connection.execute(`
        ALTER TABLE logistic_payment 
        ADD COLUMN arrived_date DATE DEFAULT NULL 
        COMMENT '한국도착 날짜'
      `);
      console.log('✅ logistic_payment.arrived_date 필드가 추가되었습니다.');
    } else {
      console.log('ℹ️  logistic_payment.arrived_date 필드가 이미 존재합니다.');
    }

    // arrived_by 필드 존재 여부 확인
    const [arrivedByColumn] = await connection.execute(
      "SHOW COLUMNS FROM logistic_payment LIKE 'arrived_by'"
    );

    if (arrivedByColumn.length === 0) {
      // arrived_by 필드가 없으면 추가
      await connection.execute(`
        ALTER TABLE logistic_payment 
        ADD COLUMN arrived_by VARCHAR(100) DEFAULT NULL 
        COMMENT '도착담당자'
      `);
      console.log('✅ logistic_payment.arrived_by 필드가 추가되었습니다.');
    } else {
      console.log('ℹ️  logistic_payment.arrived_by 필드가 이미 존재합니다.');
    }

    // 인덱스 추가 (성능 최적화)
    try {
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_logistic_payment_is_arrived 
        ON logistic_payment(is_arrived)
      `);
      console.log('✅ logistic_payment.is_arrived 인덱스가 추가되었습니다.');
    } catch (indexError) {
      if (indexError.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  logistic_payment.is_arrived 인덱스가 이미 존재합니다.');
      } else {
        throw indexError;
      }
    }

    try {
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_logistic_payment_arrived_date 
        ON logistic_payment(arrived_date)
      `);
      console.log('✅ logistic_payment.arrived_date 인덱스가 추가되었습니다.');
    } catch (indexError) {
      if (indexError.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  logistic_payment.arrived_date 인덱스가 이미 존재합니다.');
      } else {
        throw indexError;
      }
    }

    try {
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_logistic_payment_arrival_status 
        ON logistic_payment(is_arrived, arrived_date)
      `);
      console.log('✅ logistic_payment.arrival_status 복합 인덱스가 추가되었습니다.');
    } catch (indexError) {
      if (indexError.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  logistic_payment.arrival_status 복합 인덱스가 이미 존재합니다.');
      } else {
        throw indexError;
      }
    }

    console.log('✅ logistic_payment 도착 필드 마이그레이션 완료!');
    
  } catch (error) {
    console.error('❌ logistic_payment 도착 필드 마이그레이션 오류:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// 제품 정보 필드 마이그레이션 함수
async function migrateProductInfoFields() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 제품 정보 필드 마이그레이션 시작...');
    
    const fields = [
      { name: 'unit_weight', type: 'DECIMAL(10,2)', comment: '제품 1개 무게 (g)' },
      { name: 'packaging_method', type: 'VARCHAR(200)', comment: '소포장 방식' },
      { name: 'box_dimensions', type: 'VARCHAR(100)', comment: '한박스 입수량 (개)' },
      { name: 'box_weight', type: 'VARCHAR(50)', comment: '제품사이즈 (cm)' },
      { name: 'factory_delivery_days', type: 'INT', comment: '공장 납기 소요일' }
    ];

    let addedCount = 0;
    let existsCount = 0;

    for (const field of fields) {
      // 필드 존재 여부 확인
      const [columns] = await connection.execute(
        `SHOW COLUMNS FROM mj_project LIKE '${field.name}'`
      );

      if (columns.length === 0) {
        // 필드가 없으면 추가
        await connection.execute(`
          ALTER TABLE mj_project 
          ADD COLUMN ${field.name} ${field.type} DEFAULT NULL 
          COMMENT '${field.comment}'
        `);
        
        console.log(`✅ ${field.name} 필드 추가 완료`);
        addedCount++;
      } else {
        console.log(`ℹ️  ${field.name} 필드가 이미 존재합니다.`);
        existsCount++;
      }
    }
    
    console.log(`✅ 제품 정보 필드 마이그레이션 완료 (추가: ${addedCount}, 기존: ${existsCount})`);
    
  } catch (error) {
    console.error('❌ 제품 정보 필드 마이그레이션 오류:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// 모든 마이그레이션 실행 함수
async function runAllMigrations() {
  console.log('🚀 모든 마이그레이션 실행 시작...');
  
  try {
    // 기존 마이그레이션들
    await migrateFactoryShippingStatus();
    await migrateWarehouseTables();
    await migratePaymentColumns();
    await migrateWarehouseStockFields();
    await migrateMJProjectQuantityFields();
    await migrateMJProjectPaymentsTable();
    await migrateMJPackingListTable();
    await migrateFinanceIncomingTable();
    await migrateFinanceExpenseTable();
    await migrateLogisticPaymentTable();
    await migratePaymentRequestTables();
    await migrateAppVersionsTable();
    
    // 새로운 소프트 삭제 마이그레이션
    await migrateSoftDeleteFields();
    
    // logistic_payment 도착 필드 마이그레이션 (기존 mj_packing_list 대신)
    await migrateLogisticPaymentArrivalFields();
    
    // 제품 정보 필드 마이그레이션
    await migrateProductInfoFields();
    
    console.log('✅ 모든 마이그레이션이 성공적으로 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 마이그레이션 실행 중 오류 발생:', error);
    throw error;
  }
}


module.exports = {
  pool,
  testConnection,
  initializeDatabase,
  migrateFactoryShippingStatus,
  migrateWarehouseTables,
  migratePaymentColumns,
  migrateWarehouseStockFields,
  migrateMJProjectQuantityFields,
  migrateMJProjectPaymentsTable,
  migrateMJPackingListTable,
  migrateFinanceIncomingTable,
  migrateFinanceExpenseTable,
  migrateLogisticPaymentTable,
  migratePaymentRequestTables,
  migrateAppVersionsTable,
  migrateSoftDeleteFields,
  migrateLogisticPaymentArrivalFields,
  migrateProductInfoFields,
  runAllMigrations
}; 