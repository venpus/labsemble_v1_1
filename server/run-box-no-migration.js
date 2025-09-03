const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// 환경 변수 로드
require('dotenv').config();

async function runBoxNoMigration() {
  let connection;
  
  try {
    console.log('🚀 [BoxNo Migration] 마이그레이션 시작...');
    
    // 데이터베이스 연결
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'labsemble',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ [BoxNo Migration] 데이터베이스 연결 성공');

    // SQL 파일 읽기
    const sqlFilePath = path.join(__dirname, 'migrations', 'add_box_no_to_logistic_payment.sql');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    
    console.log('📖 [BoxNo Migration] SQL 파일 읽기 완료');

    // SQL 문장들을 세미콜론으로 분리하고 실행
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`🔧 [BoxNo Migration] ${statements.length}개의 SQL 문장 실행 시작`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`📝 [BoxNo Migration] SQL ${i + 1}/${statements.length} 실행 중...`);
          console.log(`   ${statement.substring(0, 100)}...`);
          
          await connection.execute(statement);
          console.log(`✅ [BoxNo Migration] SQL ${i + 1} 실행 성공`);
        } catch (error) {
          // 인덱스가 이미 존재하는 경우 무시
          if (error.code === 'ER_DUP_KEYNAME') {
            console.log(`⚠️ [BoxNo Migration] SQL ${i + 1} - 인덱스가 이미 존재함: ${error.message}`);
          } else {
            console.error(`❌ [BoxNo Migration] SQL ${i + 1} 실행 실패:`, error.message);
            throw error;
          }
        }
      }
    }

    // 테이블 구조 확인
    console.log('🔍 [BoxNo Migration] 테이블 구조 확인 중...');
    const [columns] = await connection.execute('DESCRIBE logistic_payment');
    
    console.log('📊 [BoxNo Migration] logistic_payment 테이블 구조:');
    columns.forEach(col => {
      console.log(`   ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default} | ${col.Extra}`);
    });

    // box_no 필드가 추가되었는지 확인
    const boxNoColumn = columns.find(col => col.Field === 'box_no');
    if (boxNoColumn) {
      console.log('✅ [BoxNo Migration] box_no 필드가 성공적으로 추가되었습니다!');
      console.log(`   Type: ${boxNoColumn.Type}, Null: ${boxNoColumn.Null}, Default: ${boxNoColumn.Default}`);
    } else {
      throw new Error('box_no 필드가 추가되지 않았습니다.');
    }

    // 인덱스 확인
    console.log('🔍 [BoxNo Migration] 인덱스 확인 중...');
    const [indexes] = await connection.execute('SHOW INDEX FROM logistic_payment');
    
    console.log('📊 [BoxNo Migration] logistic_payment 테이블 인덱스:');
    const uniqueIndexes = [...new Set(indexes.map(idx => idx.Key_name))];
    uniqueIndexes.forEach(idxName => {
      const idxColumns = indexes.filter(idx => idx.Key_name === idxName);
      const columnNames = idxColumns.map(idx => idx.Column_name).join(', ');
      console.log(`   ${idxName}: [${columnNames}]`);
    });

    console.log('🎉 [BoxNo Migration] 마이그레이션이 성공적으로 완료되었습니다!');

  } catch (error) {
    console.error('❌ [BoxNo Migration] 마이그레이션 실패:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 [BoxNo Migration] 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  runBoxNoMigration();
}

module.exports = runBoxNoMigration; 