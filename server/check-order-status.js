const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'TianXian007!',
  database: 'labsemble',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function checkOrderStatus() {
  try {
    console.log('🔍 is_order_completed 필드 값 확인 중...\n');
    
    const [rows] = await pool.execute('SELECT id, project_name, is_order_completed FROM mj_project LIMIT 10');
    console.log('📋 프로젝트별 발주상태:');
    rows.forEach(row => {
      console.log(`ID: ${row.id}, 프로젝트명: ${row.project_name}, 발주완료: ${row.is_order_completed} (타입: ${typeof row.is_order_completed})`);
    });
    
    const [counts] = await pool.execute('SELECT is_order_completed, COUNT(*) as count FROM mj_project GROUP BY is_order_completed');
    console.log('\n📊 발주상태별 개수:');
    counts.forEach(row => {
      console.log(`발주완료: ${row.is_order_completed}, 개수: ${row.count}`);
    });
    
    // 필터 테스트
    console.log('\n🔍 필터 테스트:');
    
    // 완료된 프로젝트만 조회
    const [completed] = await pool.execute('SELECT COUNT(*) as count FROM mj_project WHERE is_order_completed = 1');
    console.log(`완료된 프로젝트 (is_order_completed = 1): ${completed[0].count}개`);
    
    // 대기 중인 프로젝트만 조회
    const [waiting] = await pool.execute('SELECT COUNT(*) as count FROM mj_project WHERE is_order_completed = 0');
    console.log(`대기 중인 프로젝트 (is_order_completed = 0): ${waiting[0].count}개`);
    
    // NULL인 프로젝트 조회
    const [nullStatus] = await pool.execute('SELECT COUNT(*) as count FROM mj_project WHERE is_order_completed IS NULL');
    console.log(`NULL 상태 프로젝트 (is_order_completed IS NULL): ${nullStatus[0].count}개`);
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await pool.end();
  }
}

checkOrderStatus();
