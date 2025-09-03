const mysql = require('mysql2/promise');

async function checkPaymentStatus() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'labsemble'
    });
    
    console.log('데이터베이스 연결 성공!');
    
    // 1. 전체 프로젝트 수
    const [totalProjects] = await connection.execute('SELECT COUNT(*) as count FROM mj_project');
    console.log(`전체 프로젝트 수: ${totalProjects[0].count}`);
    
    // 2. payment_status가 NULL이 아닌 프로젝트
    const [projectsWithPaymentStatus] = await connection.execute('SELECT COUNT(*) as count FROM mj_project WHERE payment_status IS NOT NULL');
    console.log(`payment_status가 있는 프로젝트: ${projectsWithPaymentStatus[0].count}`);
    
    // 3. payment_status 샘플 데이터
    const [samples] = await connection.execute('SELECT id, project_name, payment_status FROM mj_project WHERE payment_status IS NOT NULL LIMIT 3');
    console.log('\npayment_status 샘플:');
    samples.forEach((project, index) => {
      console.log(`\n프로젝트 ${index + 1}:`);
      console.log(`  ID: ${project.id}`);
      console.log(`  이름: ${project.project_name}`);
      console.log(`  payment_status: ${project.payment_status}`);
      
      try {
        const parsed = JSON.parse(project.payment_status);
        console.log(`  파싱된 JSON:`, parsed);
        
        if (parsed.advance !== undefined) {
          console.log(`  advance: ${parsed.advance} (타입: ${typeof parsed.advance})`);
        }
        if (parsed.advance_payment !== undefined) {
          console.log(`  advance_payment: ${parsed.advance_payment} (타입: ${typeof parsed.advance_payment})`);
        }
      } catch (e) {
        console.log(`  JSON 파싱 실패: ${e.message}`);
      }
    });
    
    // 4. advance: false인 프로젝트
    const [advanceFalse] = await connection.execute("SELECT COUNT(*) as count FROM mj_project WHERE JSON_EXTRACT(payment_status, '$.advance') = 'false'");
    console.log(`\nadvance: false인 프로젝트: ${advanceFalse[0].count}`);
    
    // 5. advance_payment가 있는 프로젝트
    const [advancePayment] = await connection.execute("SELECT COUNT(*) as count FROM mj_project WHERE JSON_EXTRACT(payment_status, '$.advance_payment') IS NOT NULL");
    console.log(`advance_payment가 있는 프로젝트: ${advancePayment[0].count}`);
    
    // 6. 실제 API 쿼리 테스트
    const [testResult] = await connection.execute(`
      SELECT 
        SUM(CAST(JSON_EXTRACT(payment_status, '$.advance_payment') AS DECIMAL(15,2))) as total,
        COUNT(*) as count
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.advance') = 'false'
        AND JSON_EXTRACT(payment_status, '$.advance_payment') IS NOT NULL
        AND JSON_EXTRACT(payment_status, '$.advance_payment') > 0
    `);
    console.log(`\n실제 API 쿼리 결과:`);
    console.log(`  총합: ${testResult[0].total}`);
    console.log(`  개수: ${testResult[0].count}`);
    
  } catch (error) {
    console.error('오류:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n연결 종료');
    }
  }
}

checkPaymentStatus(); 