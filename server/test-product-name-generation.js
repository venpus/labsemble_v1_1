// Node.js 18+ 내장 fetch 사용

async function testProductNameGeneration() {
  const baseUrl = 'http://localhost:5000';
  
  try {
    console.log('🧪 상품명 자동 생성 API 테스트 시작...\n');
    
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
    
    // 2. 현재 시간 정보 출력
    const now = new Date();
    const kstOffset = 9 * 60; // UTC+9 (한국 시간)
    const kstTime = new Date(now.getTime() + (kstOffset * 60 * 1000));
    
    const year = kstTime.getFullYear().toString().slice(-2);
    const month = (kstTime.getMonth() + 1).toString().padStart(2, '0');
    const day = kstTime.getDate().toString().padStart(2, '0');
    const expectedDateString = `${year}${month}${day}`;
    
    console.log('📅 현재 한국 시간:', kstTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
    console.log('📅 예상 날짜 문자열:', expectedDateString);
    
    // 3. 상품명 생성 API 호출
    console.log('\n2️⃣ 상품명 생성 API 호출...');
    const generateResponse = await fetch(`${baseUrl}/api/mj-project/mobile/generate-product-name`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      throw new Error(`상품명 생성 실패: ${generateResponse.status} - ${errorText}`);
    }
    
    const generateData = await generateResponse.json();
    console.log('✅ 상품명 생성 성공!');
    console.log('📋 생성된 데이터:', JSON.stringify(generateData, null, 2));
    
    // 4. 생성된 상품명 검증
    const generatedName = generateData.data.productName;
    const expectedPattern = new RegExp(`^${expectedDateString}#\\d+$`);
    
    console.log('\n3️⃣ 상품명 검증...');
    console.log(`생성된 상품명: ${generatedName}`);
    console.log(`예상 패턴: ${expectedDateString}#숫자`);
    console.log(`패턴 일치: ${expectedPattern.test(generatedName)}`);
    
    // 숫자 부분 추출 및 검증
    const numberPart = generatedName.split('#')[1];
    const numberValue = parseInt(numberPart);
    
    console.log(`숫자 부분: "${numberPart}" (타입: ${typeof numberPart})`);
    console.log(`숫자 값: ${numberValue} (타입: ${typeof numberValue})`);
    console.log(`숫자 유효성: ${!isNaN(numberValue) && numberValue > 0}`);
    
    // 5. 여러 번 호출하여 순차 증가 확인
    console.log('\n4️⃣ 순차 증가 테스트 (3회 호출)...');
    const results = [];
    
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`${baseUrl}/api/mj-project/mobile/generate-product-name`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        results.push(data.data.productName);
        console.log(`  ${i + 1}번째: ${data.data.productName} (오늘 등록된 프로젝트: ${data.data.todayCount}개)`);
      }
    }
    
    // 순차 증가 확인
    const numbers = results.map(name => parseInt(name.split('#')[1]));
    const isSequential = numbers.every((num, index) => index === 0 || num === numbers[index - 1] + 1);
    
    console.log(`순차 증가 확인: ${isSequential ? '✅' : '❌'}`);
    console.log(`생성된 번호들: ${numbers.join(', ')}`);
    
    console.log('\n🎉 상품명 자동 생성 API 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  } finally {
    process.exit(0);
  }
}

testProductNameGeneration();








