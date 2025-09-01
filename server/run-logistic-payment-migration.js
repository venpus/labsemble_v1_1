const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// 환경 변수 로드
require('dotenv').config();

async function runLogisticPaymentMigration() {
  let connection;
  
  try {
    console.log('🚚 [LogisticPayment] 마이그레이션 시작...');
    
    // 데이터베이스 연결
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'labsemble',
      charset: 'utf8mb4'
    });

    console.log('✅ [LogisticPayment] 데이터베이스 연결 성공');

    // SQL 파일 읽기
    const sqlFilePath = path.join(__dirname, 'migrations', 'create_logistic_payment_table.sql');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    
    console.log('📖 [LogisticPayment] SQL 파일 읽기 완료');

    // SQL 문을 세미콜론으로 분리하여 실행
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`🔧 [LogisticPayment] ${sqlStatements.length}개의 SQL 문 실행 예정`);

    // 각 SQL 문 실행
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i];
      if (sql.trim()) {
        try {
          console.log(`📝 [LogisticPayment] SQL ${i + 1} 실행 중: ${sql.substring(0, 50)}...`);
          await connection.execute(sql);
          console.log(`✅ [LogisticPayment] SQL ${i + 1} 실행 성공`);
        } catch (error) {
          if (error.code === 'ER_DUP_KEYNAME') {
            console.log(`⚠️ [LogisticPayment] SQL ${i + 1} - 인덱스가 이미 존재합니다: ${error.message}`);
          } else if (error.code === 'ER_DUP_FIELDNAME') {
            console.log(`⚠️ [LogisticPayment] SQL ${i + 1} - 필드가 이미 존재합니다: ${error.message}`);
          } else {
            console.error(`❌ [LogisticPayment] SQL ${i + 1} 실행 실패:`, error.message);
            throw error;
          }
        }
      }
    }

    // 테이블 생성 확인
    console.log('🔍 [LogisticPayment] 테이블 생성 확인 중...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'logistic_payment'
    `, [process.env.DB_NAME || 'labsemble']);

    if (tables.length > 0) {
      console.log('✅ [LogisticPayment] logistic_payment 테이블 생성 확인됨');
      console.log('📊 [LogisticPayment] 테이블 정보:', {
        name: tables[0].TABLE_NAME,
        rows: tables[0].TABLE_ROWS,
        created: tables[0].CREATE_TIME
      });
    } else {
      console.log('❌ [LogisticPayment] logistic_payment 테이블을 찾을 수 없습니다');
    }

    // 테이블 구조 확인
    console.log('🔍 [LogisticPayment] 테이블 구조 확인 중...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'logistic_payment'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'labsemble']);

    console.log('📋 [LogisticPayment] 테이블 구조:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''} ${col.COLUMN_KEY === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });

    console.log('🎉 [LogisticPayment] 마이그레이션이 성공적으로 완료되었습니다!');

  } catch (error) {
    console.error('❌ [LogisticPayment] 마이그레이션 실패:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 [LogisticPayment] 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  runLogisticPaymentMigration();
}

module.exports = runLogisticPaymentMigration; 