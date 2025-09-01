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
  // 추가 시간대 설정
  dateStrings: true, // 날짜를 문자열로 반환
  supportBigNumbers: true,
  bigNumberStrings: true
};

async function runSupplierMigration() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('🔄 supplier_name 필드 마이그레이션 시작...');
    
    // supplier_name 필드 존재 여부 확인
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM mj_project LIKE 'supplier_name'"
    );

    if (columns.length === 0) {
      // 필드가 없으면 추가
      await connection.execute(`
        ALTER TABLE mj_project 
        ADD COLUMN supplier_name VARCHAR(200) DEFAULT NULL 
        COMMENT '공급자 이름'
      `);
      
      console.log('✅ supplier_name 필드 추가 완료');
      return { success: true, added: true, message: 'supplier_name 필드가 성공적으로 추가되었습니다.' };
    } else {
      console.log('ℹ️ supplier_name 필드가 이미 존재합니다.');
      return { success: true, added: false, message: 'supplier_name 필드가 이미 존재합니다.' };
    }
    
  } catch (error) {
    console.error('❌ supplier_name 마이그레이션 오류:', error);
    return { success: false, error: error.message };
  } finally {
    await connection.end();
  }
}

// 마이그레이션 실행
runSupplierMigration()
  .then(result => {
    if (result.success) {
      console.log('🎉 마이그레이션 완료:', result.message);
      process.exit(0);
    } else {
      console.error('❌ 마이그레이션 실패:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  }); 