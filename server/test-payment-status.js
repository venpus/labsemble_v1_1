const mysql = require('mysql2/promise');
const { pool } = require('./config/database');

async function testPaymentStatus() {
  const connection = await pool.getConnection();

  try {
    console.log('🔍 [Test] payment_status 필드 구조 확인 시작...\n');

    // 1. 전체 프로젝트의 payment_status 구조 확인
    console.log('📋 1. 전체 프로젝트의 payment_status 구조:');
    const [allProjects] = await connection.execute(`
      SELECT 
        id,
        project_name,
        advance_payment,
        payment_status,
        JSON_TYPE(payment_status) as json_type,
        JSON_VALID(payment_status) as json_valid,
        LENGTH(payment_status) as field_length
      FROM mj_project 
      WHERE advance_payment IS NOT NULL 
        AND advance_payment != '' 
        AND advance_payment > 0
      LIMIT 10
    `);

    allProjects.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}`);
      console.log(`    - advance_payment: ${row.advance_payment}`);
      console.log(`    - payment_status: ${row.payment_status}`);
      console.log(`    - JSON 타입: ${row.json_type}, 유효성: ${row.json_valid}, 길이: ${row.field_length}`);
      
      if (row.payment_status && row.json_valid) {
        try {
          const parsed = JSON.parse(row.payment_status);
          console.log(`    - 파싱된 JSON:`, parsed);
          console.log(`    - advance 키 존재: ${'advance' in parsed}`);
          if ('advance' in parsed) {
            console.log(`    - advance 값: ${parsed.advance} (타입: ${typeof parsed.advance})`);
            console.log(`    - advance === false: ${parsed.advance === false}`);
            console.log(`    - advance === 'false': ${parsed.advance === 'false'}`);
            console.log(`    - advance === 0: ${parsed.advance === 0}`);
          }
        } catch (parseError) {
          console.log(`    - JSON 파싱 실패: ${parseError.message}`);
        }
      }
      console.log('');
    });

    // 2. JSON_EXTRACT 테스트
    console.log('🔍 2. JSON_EXTRACT 테스트:');
    const [extractTest] = await connection.execute(`
      SELECT 
        id,
        project_name,
        advance_payment,
        payment_status,
        JSON_EXTRACT(payment_status, '$.advance') as extracted_advance,
        JSON_EXTRACT(payment_status, '$.advance') = false as is_false,
        JSON_EXTRACT(payment_status, '$.advance') = 'false' as is_string_false,
        JSON_EXTRACT(payment_status, '$.advance') = 0 as is_zero
      FROM mj_project 
      WHERE advance_payment IS NOT NULL 
        AND advance_payment != '' 
        AND advance_payment > 0
      LIMIT 5
    `);

    extractTest.forEach((row, index) => {
      console.log(`  ${index + 1}. 프로젝트 ID: ${row.id}, 이름: ${row.project_name}`);
      console.log(`    - advance_payment: ${row.advance_payment}`);
      console.log(`    - payment_status: ${row.payment_status}`);
      console.log(`    - JSON_EXTRACT 결과: ${row.extracted_advance}`);
      console.log(`    - = false: ${row.is_false}`);
      console.log(`    - = 'false': ${row.is_string_false}`);
      console.log(`    - = 0: ${row.is_zero}`);
      console.log('');
    });

    // 3. 다양한 조건으로 테스트
    console.log('🧪 3. 다양한 조건으로 테스트:');
    
    // 조건 1: JSON_EXTRACT(payment_status, '$.advance') = false
    const [condition1] = await connection.execute(`
      SELECT COUNT(*) as count, SUM(CAST(advance_payment AS DECIMAL(15,2))) as total
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.advance') = false
        AND advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    console.log(`  조건 1 (JSON_EXTRACT = false): ${condition1[0].count}개 프로젝트, 총 ${condition1[0].total} CNY`);

    // 조건 2: JSON_EXTRACT(payment_status, '$.advance') = 'false'
    const [condition2] = await connection.execute(`
      SELECT COUNT(*) as count, SUM(CAST(advance_payment AS DECIMAL(15,2))) as total
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.advance') = 'false'
        AND advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    console.log(`  조건 2 (JSON_EXTRACT = 'false'): ${condition2[0].count}개 프로젝트, 총 ${condition2[0].total} CNY`);

    // 조건 3: JSON_EXTRACT(payment_status, '$.advance') = 0
    const [condition3] = await connection.execute(`
      SELECT COUNT(*) as count, SUM(CAST(advance_payment AS DECIMAL(15,2))) as total
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.advance') = 0
        AND advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    console.log(`  조건 3 (JSON_EXTRACT = 0): ${condition3[0].count}개 프로젝트, 총 ${condition3[0].total} CNY`);

    // 조건 4: JSON_EXTRACT(payment_status, '$.advance') IS NULL
    const [condition4] = await connection.execute(`
      SELECT COUNT(*) as count, SUM(CAST(advance_payment AS DECIMAL(15,2))) as total
      FROM mj_project 
      WHERE JSON_EXTRACT(payment_status, '$.advance') IS NULL
        AND advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    console.log(`  조건 4 (JSON_EXTRACT IS NULL): ${condition4[0].count}개 프로젝트, 총 ${condition4[0].total} CNY`);

    // 조건 5: payment_status가 JSON이 아닌 경우
    const [condition5] = await connection.execute(`
      SELECT COUNT(*) as count, SUM(CAST(advance_payment AS DECIMAL(15,2))) as total
      FROM mj_project 
      WHERE NOT JSON_VALID(payment_status)
        AND advance_payment IS NOT NULL
        AND advance_payment != ''
        AND advance_payment > 0
    `);
    console.log(`  조건 5 (JSON이 아닌 경우): ${condition5[0].count}개 프로젝트, 총 ${condition5[0].total} CNY`);

    console.log('\n✅ [Test] payment_status 필드 구조 확인 완료');

  } catch (error) {
    console.error('❌ [Test] 오류 발생:', error);
  } finally {
    connection.release();
  }
}

testPaymentStatus(); 