const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 데이터베이스 연결 설정
const dbConfig = {
  host: process.env.DB_HOST || 'labsemble.com',
  user: process.env.DB_USER || 'venpus',
  password: process.env.DB_PASSWORD || 'TianXian007!',
  database: process.env.DB_NAME || 'labsemble',
  timezone: '+09:00', // 한국 시간대 (KST)
  charset: 'utf8mb4',
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true
};

async function runProductInfoMigration() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🔄 제품 정보 필드 마이그레이션 시작...');
    
    const fields = [
      { name: 'unit_weight', type: 'DECIMAL(10,2)', comment: '제품 1개 무게 (g)' },
      { name: 'packaging_method', type: 'VARCHAR(200)', comment: '소포장 방식' },
      { name: 'box_dimensions', type: 'VARCHAR(100)', comment: '한박스 입수량 (개)' },
      { name: 'box_weight', type: 'VARCHAR(50)', comment: '제품사이즈 (cm)' },
      { name: 'factory_delivery_days', type: 'INT', comment: '공장 납기 소요일' }
    ];

    const results = [];

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
        results.push({ field: field.name, status: 'added' });
      } else {
        console.log(`ℹ️ ${field.name} 필드가 이미 존재합니다.`);
        results.push({ field: field.name, status: 'exists' });
      }
    }
    
    const addedCount = results.filter(r => r.status === 'added').length;
    const existsCount = results.filter(r => r.status === 'exists').length;

    console.log('\n📊 마이그레이션 결과:');
    console.log(`  - 추가된 필드: ${addedCount}개`);
    console.log(`  - 기존 필드: ${existsCount}개`);
    console.log(`  - 총 필드: ${fields.length}개`);

    return { 
      success: true, 
      results,
      message: `제품 정보 필드 마이그레이션 완료 (추가: ${addedCount}, 기존: ${existsCount})`
    };
    
  } catch (error) {
    console.error('❌ 제품 정보 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    await connection.end();
  }
}

// 마이그레이션 실행
runProductInfoMigration()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 마이그레이션 완료:', result.message);
      process.exit(0);
    } else {
      console.error('\n❌ 마이그레이션 실패:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ 예상치 못한 오류:', error);
    process.exit(1);
  });

