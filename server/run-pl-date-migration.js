const mysql = require('mysql2/promise');
require('dotenv').config();

async function runPlDateMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'labsemble.com',
    user: process.env.DB_USER || 'venpus',
    password: process.env.DB_PASSWORD || 'TianXian007!',
    database: process.env.DB_NAME || 'labsemble',
    timezone: '+09:00',
    charset: 'utf8mb4',
    supportBigNumbers: true,
    bigNumberStrings: true,
    multipleStatements: true
  });

  try {
    console.log('🔄 logistic_payment 테이블에 pl_date 필드 추가 마이그레이션 시작...');

    // 1. pl_date 필드 추가
    console.log('📝 pl_date 필드 추가 중...');
    await connection.execute(`
      ALTER TABLE logistic_payment 
      ADD COLUMN IF NOT EXISTS pl_date DATE AFTER mj_packing_list_id
    `);
    console.log('✅ pl_date 필드 추가 완료');

    // 2. 기존 데이터의 pl_date를 mj_packing_list에서 가져와서 업데이트
    console.log('🔧 기존 데이터의 pl_date 업데이트 중...');
    const [updateResult] = await connection.execute(`
      UPDATE logistic_payment lp
      JOIN mj_packing_list mpl ON lp.mj_packing_list_id = mpl.id
      SET lp.pl_date = mpl.pl_date
      WHERE lp.pl_date IS NULL
    `);
    console.log(`✅ ${updateResult.affectedRows}개 레코드의 pl_date 업데이트 완료`);

    // 3. pl_date에 인덱스 추가
    console.log('📝 pl_date 인덱스 추가 중...');
    try {
      await connection.execute(`
        CREATE INDEX idx_pl_date ON logistic_payment(pl_date)
      `);
      console.log('✅ pl_date 인덱스 추가 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ pl_date 인덱스가 이미 존재합니다.');
      } else {
        throw error;
      }
    }

    // 4. pl_date를 NOT NULL로 설정
    console.log('🔧 pl_date를 NOT NULL로 설정 중...');
    await connection.execute(`
      ALTER TABLE logistic_payment 
      MODIFY COLUMN pl_date DATE NOT NULL
    `);
    console.log('✅ pl_date NOT NULL 설정 완료');

    // 5. 결과 확인
    const [columns] = await connection.execute('DESCRIBE logistic_payment');
    const plDateColumn = columns.find(col => col.Field === 'pl_date');
    
    if (plDateColumn) {
      console.log('✅ 마이그레이션 완료!');
      console.log('📊 pl_date 필드 정보:', {
        Field: plDateColumn.Field,
        Type: plDateColumn.Type,
        Null: plDateColumn.Null,
        Key: plDateColumn.Key,
        Default: plDateColumn.Default
      });
    } else {
      console.log('❌ pl_date 필드가 생성되지 않았습니다.');
    }

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// 스크립트 실행
if (require.main === module) {
  runPlDateMigration()
    .then(() => {
      console.log('🎉 마이그레이션이 성공적으로 완료되었습니다!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 마이그레이션 실패:', error);
      process.exit(1);
    });
}

module.exports = { runPlDateMigration }; 