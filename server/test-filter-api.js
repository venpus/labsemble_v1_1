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

async function testFilterAPI() {
  try {
    console.log('🔍 발주상태 필터 API 테스트\n');
    
    // 1. 전체 프로젝트 조회
    console.log('1️⃣ 전체 프로젝트 조회:');
    const [allProjects] = await pool.execute(`
      SELECT 
        p.id,
        p.project_name,
        p.is_order_completed,
        p.supplier_name
      FROM mj_project p
      JOIN users u ON p.user_id = u.id
      JOIN users c ON p.created_by = c.id
      ORDER BY COALESCE(p.actual_order_date, p.created_at) DESC
      LIMIT 5
    `);
    
    console.log(`총 ${allProjects.length}개 프로젝트 (상위 5개):`);
    allProjects.forEach(project => {
      console.log(`  - ID: ${project.id}, 이름: ${project.project_name}, 발주완료: ${project.is_order_completed}`);
    });
    
    // 2. 발주상태 = 'completed' 필터 테스트
    console.log('\n2️⃣ 발주상태 = "completed" 필터:');
    const [completedProjects] = await pool.execute(`
      SELECT 
        p.id,
        p.project_name,
        p.is_order_completed,
        p.supplier_name
      FROM mj_project p
      JOIN users u ON p.user_id = u.id
      JOIN users c ON p.created_by = c.id
      WHERE p.is_order_completed = 1
      ORDER BY COALESCE(p.actual_order_date, p.created_at) DESC
      LIMIT 5
    `);
    
    console.log(`완료된 프로젝트 ${completedProjects.length}개 (상위 5개):`);
    completedProjects.forEach(project => {
      console.log(`  - ID: ${project.id}, 이름: ${project.project_name}, 발주완료: ${project.is_order_completed}`);
    });
    
    // 3. 발주상태 = 'waiting' 필터 테스트
    console.log('\n3️⃣ 발주상태 = "waiting" 필터:');
    const [waitingProjects] = await pool.execute(`
      SELECT 
        p.id,
        p.project_name,
        p.is_order_completed,
        p.supplier_name
      FROM mj_project p
      JOIN users u ON p.user_id = u.id
      JOIN users c ON p.created_by = c.id
      WHERE p.is_order_completed = 0
      ORDER BY COALESCE(p.actual_order_date, p.created_at) DESC
      LIMIT 5
    `);
    
    console.log(`대기 중인 프로젝트 ${waitingProjects.length}개:`);
    waitingProjects.forEach(project => {
      console.log(`  - ID: ${project.id}, 이름: ${project.project_name}, 발주완료: ${project.is_order_completed}`);
    });
    
    // 4. 일부 프로젝트를 대기 상태로 변경하여 테스트
    console.log('\n4️⃣ 테스트를 위해 일부 프로젝트를 대기 상태로 변경:');
    await pool.execute('UPDATE mj_project SET is_order_completed = 0 WHERE id IN (1, 2, 3)');
    console.log('ID 1, 2, 3 프로젝트를 대기 상태로 변경 완료');
    
    // 5. 다시 대기 상태 필터 테스트
    console.log('\n5️⃣ 변경 후 대기 상태 필터 테스트:');
    const [waitingProjectsAfter] = await pool.execute(`
      SELECT 
        p.id,
        p.project_name,
        p.is_order_completed,
        p.supplier_name
      FROM mj_project p
      JOIN users u ON p.user_id = u.id
      JOIN users c ON p.created_by = c.id
      WHERE p.is_order_completed = 0
      ORDER BY COALESCE(p.actual_order_date, p.created_at) DESC
      LIMIT 5
    `);
    
    console.log(`대기 중인 프로젝트 ${waitingProjectsAfter.length}개:`);
    waitingProjectsAfter.forEach(project => {
      console.log(`  - ID: ${project.id}, 이름: ${project.project_name}, 발주완료: ${project.is_order_completed}`);
    });
    
    // 6. 원상복구
    console.log('\n6️⃣ 원상복구:');
    await pool.execute('UPDATE mj_project SET is_order_completed = 1 WHERE id IN (1, 2, 3)');
    console.log('ID 1, 2, 3 프로젝트를 완료 상태로 복구 완료');
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await pool.end();
  }
}

testFilterAPI();

