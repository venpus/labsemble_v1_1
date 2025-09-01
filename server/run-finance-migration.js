const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runFinanceMigration() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Finance 마이그레이션 시작...');
    
    // 마이그레이션 SQL 파일 읽기
    const migrationPath = path.join(__dirname, 'migrations', 'create_finance_incoming_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // SQL 실행
    await connection.execute(migrationSQL);
    
    console.log('✅ Finance 마이그레이션 완료!');
    console.log('📊 finance_incoming 테이블이 생성되었습니다.');
    
    // 테이블 생성 확인
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_COMMENT 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'finance_incoming'
    `);
    
    if (tables.length > 0) {
      console.log('📋 테이블 정보:');
      console.log(`   - 테이블명: ${tables[0].TABLE_NAME}`);
      console.log(`   - 설명: ${tables[0].TABLE_COMMENT}`);
    }
    
    // 테이블 구조 확인
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'finance_incoming'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('🏗️  테이블 구조:');
    columns.forEach(column => {
      console.log(`   - ${column.COLUMN_NAME}: ${column.DATA_TYPE} ${column.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${column.COLUMN_DEFAULT ? `DEFAULT ${column.COLUMN_DEFAULT}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Finance 마이그레이션 실패:', error.message);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

// 마이그레이션 실행
runFinanceMigration().catch(error => {
  console.error('💥 마이그레이션 실행 중 오류 발생:', error);
  process.exit(1);
}); 