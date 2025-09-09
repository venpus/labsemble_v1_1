const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runProductsMigration() {
  try {
    console.log('🔄 제품 테이블 마이그레이션 시작...');
    
    // 테이블 생성
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL COMMENT '상품명',
        description TEXT COMMENT '상품 설명',
        price DECIMAL(10, 2) NOT NULL COMMENT '단가',
        stock_quantity INT NOT NULL DEFAULT 0 COMMENT '재고 수량',
        specification VARCHAR(500) COMMENT '규격',
        image_url VARCHAR(500) COMMENT '제품 이미지 URL',
        category VARCHAR(100) COMMENT '카테고리',
        is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 상태',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await pool.execute(createTableSQL);
    console.log('✅ products 테이블 생성 완료');
    
    // 인덱스 생성
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)',
      'CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await pool.execute(indexSQL);
        console.log(`✅ 인덱스 생성 완료: ${indexSQL.split(' ')[5]}`);
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`ℹ️ 인덱스가 이미 존재함: ${indexSQL.split(' ')[5]}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('✅ 제품 테이블 마이그레이션 완료!');
    
    // 테이블 구조 확인
    const [columns] = await pool.execute('DESCRIBE products');
    console.log('📋 products 테이블 구조:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL 허용)' : '(NOT NULL)'}`);
    });
    
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
  } finally {
    process.exit(0);
  }
}

runProductsMigration();
