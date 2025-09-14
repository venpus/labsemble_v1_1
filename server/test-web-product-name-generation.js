// Node.js 18+ 내장 fetch 사용

async function testWebProductNameGeneration() {
  const baseUrl = 'http://localhost:5000';
  
  try {
    console.log('🧪 웹용 상품명 자동 생성 API 테스트 시작...\n');
    
    // 1. 로그인
    console.log('1️⃣ 로그인 중...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'venpus',
        password: 'TianXian007'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`로그인 실패: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ 로그인 성공\n');
    
    // 2. 웹용 상품명 생성 API 호출
    console.log('2️⃣ 웹용 상품명 생성 API 호출...');
    const generateResponse = await fetch(`${baseUrl}/api/mj-project/generate-product-name`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      throw new Error(`웹용 상품명 생성 실패: ${generateResponse.status} - ${errorText}`);
    }
    
    const generateData = await generateResponse.json();
    console.log('✅ 웹용 상품명 생성 성공!');
    console.log('📋 생성된 데이터:', JSON.stringify(generateData, null, 2));
    
    console.log('\n🎉 웹용 상품명 자동 생성 API 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  } finally {
    process.exit(0);
  }
}

testWebProductNameGeneration();
