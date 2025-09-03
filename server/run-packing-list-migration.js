const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// 환경변수 로드
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

async function runPackingListMigration() {
  let connection;
  
  try {
    console.log('🔄 패킹리스트 마이그레이션 시작...');
    
    // 데이터베이스 연결
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');
    
    // 마이그레이션 SQL 파일 읽기
    const migrationPath = path.join(__dirname, 'migrations', 'add_packing_list_fields.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // SQL 문장들을 세미콜론으로 분리하여 실행
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 총 ${statements.length}개의 SQL 문장을 실행합니다...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // SELECT 문은 건너뛰기 (마이그레이션 확인용)
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        console.log(`⏭️  SELECT 문 건너뛰기: ${statement.substring(0, 50)}...`);
        continue;
      }
      
      try {
        console.log(`🔄 SQL 실행 중 (${i + 1}/${statements.length}): ${statement.substring(0, 50)}...`);
        await connection.execute(statement);
        console.log(`✅ SQL 실행 완료 (${i + 1}/${statements.length})`);
      } catch (error) {
        // 이미 필드가 존재하는 경우 무시
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️  필드가 이미 존재합니다: ${error.message}`);
        } else if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`ℹ️  인덱스가 이미 존재합니다: ${error.message}`);
        } else {
          console.error(`❌ SQL 실행 실패 (${i + 1}/${statements.length}):`, error.message);
          throw error;
        }
      }
    }
    
    // 마이그레이션 결과 확인
    console.log('\n🔍 마이그레이션 결과 확인...');
    const [columns] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'mj_project' 
        AND COLUMN_NAME IN ('packing_method', 'box_dimensions', 'box_weight', 'packing_list_created')
      ORDER BY COLUMN_NAME
    `);
    
    if (columns.length > 0) {
      console.log('✅ 패킹리스트 필드가 성공적으로 추가되었습니다:');
      columns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.COLUMN_COMMENT})`);
      });
    } else {
      console.log('❌ 패킹리스트 필드가 추가되지 않았습니다.');
    }
    
    console.log('\n🎉 패킹리스트 마이그레이션이 완료되었습니다!');
    
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
  runPackingListMigration()
    .then(() => {
      console.log('✅ 마이그레이션 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 마이그레이션 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { runPackingListMigration }; 