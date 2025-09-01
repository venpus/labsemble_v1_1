const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// 데이터베이스 연결 설정
const dbConfig = {
  host: process.env.DB_HOST || 'labsemble.com',
  user: process.env.DB_USER || 'venpus',
  password: process.env.DB_PASSWORD || 'TianXian007!',
  database: process.env.DB_NAME || 'labsemble',
  timezone: '+09:00',
  charset: 'utf8mb4'
};

async function runStockMigration() {
  let connection;
  
  try {
    console.log('🔄 warehouse_entries 테이블 stock 필드 마이그레이션 시작...');
    
    // 데이터베이스 연결
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');
    
    // SQL 파일 읽기
    const sqlFilePath = path.join(__dirname, 'migrations', 'add_stock_fields_to_warehouse.sql');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    
    // SQL 문을 세미콜론으로 분리
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 총 ${sqlStatements.length}개의 SQL 문을 실행합니다.`);
    
    // 각 SQL 문 실행
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i];
      
      try {
        if (sql.trim()) {
          console.log(`🔄 SQL ${i + 1} 실행 중: ${sql.substring(0, 50)}...`);
          await connection.execute(sql);
          console.log(`✅ SQL ${i + 1} 실행 완료`);
        }
      } catch (error) {
        // 일부 오류는 무시 (예: 이미 존재하는 컬럼, 인덱스 등)
        if (error.code === 'ER_DUP_FIELDNAME' || 
            error.code === 'ER_DUP_KEYNAME' || 
            error.code === 'ER_DUP_CONSTRAINT_NAME') {
          console.log(`ℹ️ SQL ${i + 1} 건너뜀: ${error.message}`);
        } else {
          console.error(`❌ SQL ${i + 1} 실행 실패:`, error.message);
          // 치명적이지 않은 오류는 계속 진행
        }
      }
    }
    
    // 마이그레이션 결과 확인
    console.log('\n🔍 마이그레이션 결과 확인...');
    
    // 테이블 구조 확인
    const [columns] = await connection.execute('DESCRIBE warehouse_entries');
    console.log('📊 warehouse_entries 테이블 구조:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''} ${col.Comment ? `COMMENT '${col.Comment}'` : ''}`);
    });
    
    // 인덱스 확인
    const [indexes] = await connection.execute('SHOW INDEX FROM warehouse_entries');
    console.log('\n📊 warehouse_entries 테이블 인덱스:');
    const uniqueIndexes = [...new Set(indexes.map(idx => idx.Key_name))];
    uniqueIndexes.forEach(idxName => {
      const idxColumns = indexes.filter(idx => idx.Key_name === idxName).map(idx => idx.Column_name);
      console.log(`  - ${idxName}: [${idxColumns.join(', ')}]`);
    });
    
    // 데이터 샘플 확인
    const [sampleData] = await connection.execute('SELECT id, project_id, quantity, stock, out_quantity FROM warehouse_entries LIMIT 5');
    console.log('\n📊 데이터 샘플 (최대 5개):');
    sampleData.forEach(row => {
      console.log(`  - ID: ${row.id}, 프로젝트: ${row.project_id}, 입고: ${row.quantity}, 재고: ${row.stock}, 출고: ${row.out_quantity}`);
    });
    
    console.log('\n🎉 warehouse_entries 테이블 stock 필드 마이그레이션이 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 마이그레이션 실행 중 오류 발생:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  runStockMigration();
}

module.exports = { runStockMigration }; 