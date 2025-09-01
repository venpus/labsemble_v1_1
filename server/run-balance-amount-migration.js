const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runBalanceAmountMigration() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 balanceAmount 필드 마이그레이션 시작...');
    
    // 마이그레이션 SQL 파일 읽기
    const migrationPath = path.join(__dirname, 'migrations', 'add_balance_amount_field.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // SQL 문장들을 세미콜론으로 분리하여 실행
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✅ SQL 실행 완료:', statement.substring(0, 50) + '...');
        } catch (error) {
          if (error.code === 'ER_DUP_KEYNAME') {
            console.log('ℹ️ 인덱스가 이미 존재합니다:', error.message);
          } else {
            console.error('❌ SQL 실행 오류:', error.message);
          }
        }
      }
    }
    
    // 마이그레이션 완료 확인
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM mj_project LIKE 'balance_amount'"
    );
    
    if (columns.length > 0) {
      console.log('✅ balanceAmount 필드 마이그레이션이 완료되었습니다.');
      
      // 샘플 데이터 확인
      const [sampleData] = await connection.execute(`
        SELECT id, project_name, fee, factory_shipping_cost, additional_cost_items, balance_amount
        FROM mj_project 
        LIMIT 3
      `);
      
      console.log('📊 샘플 데이터 확인:');
      sampleData.forEach((row, index) => {
        console.log(`  ${index + 1}. 프로젝트: ${row.project_name}`);
        console.log(`     - fee: ${row.fee || 0}`);
        console.log(`     - factory_shipping_cost: ${row.factory_shipping_cost || 0}`);
        console.log(`     - additional_cost_items: ${row.additional_cost_items || '[]'}`);
        console.log(`     - balance_amount: ${row.balance_amount || 0}`);
      });
      
    } else {
      console.error('❌ balanceAmount 필드가 생성되지 않았습니다.');
    }
    
  } catch (error) {
    console.error('❌ 마이그레이션 실행 오류:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

// 마이그레이션 실행
runBalanceAmountMigration(); 