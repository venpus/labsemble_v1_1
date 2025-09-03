// database.js를 직접 사용하여 factory_shipping_status 필드 마이그레이션 실행
const { migrateFactoryShippingStatus } = require('./server/config/database');

async function runMigration() {
  try {
    console.log('🔄 factory_shipping_status 필드 마이그레이션 시작...');
    
    // database.js의 마이그레이션 함수 직접 호출
    const result = await migrateFactoryShippingStatus();
    
    if (result.success) {
      console.log('✅ 마이그레이션 결과:', result.message);
      if (result.added) {
        console.log('🆕 새 필드가 추가되었습니다.');
      } else {
        console.log('ℹ️ 필드가 이미 존재합니다.');
      }
    } else {
      console.error('❌ 마이그레이션 실패:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 마이그레이션 실행 오류:', error);
  }
}

// 스크립트 실행
runMigration(); 