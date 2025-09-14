const fetch = require('node-fetch');

// 테스트용 설정
const BASE_URL = 'http://localhost:5000';
const TEST_BARCODE = 'TEST123456';
const TEST_USER = {
  username: 'testuser',
  password: 'testpass123'
};

// 로그인하여 토큰 획득
async function login() {
  try {
    console.log('🔐 로그인 시도...');
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });
    
    const result = await response.json();
    
    if (result.success && result.token) {
      console.log('✅ 로그인 성공');
      return result.token;
    } else {
      console.error('❌ 로그인 실패:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 로그인 오류:', error.message);
    return null;
  }
}

// 1. 바코드 스캔 및 입고 확인 테스트
async function testScanBarcode(token, barcodeNumber) {
  try {
    console.log(`\n📱 바코드 스캔 테스트: ${barcodeNumber}`);
    
    const response = await fetch(`${BASE_URL}/api/logistic-payment/scan-barcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        barcode_number: barcodeNumber,
        arrived_by: '테스트사용자'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 바코드 스캔 성공:', result.data);
    } else {
      console.log('❌ 바코드 스캔 실패:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 바코드 스캔 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 2. 바코드 유효성 검증 테스트
async function testValidateBarcode(token, barcodeNumber) {
  try {
    console.log(`\n🔍 바코드 유효성 검증 테스트: ${barcodeNumber}`);
    
    const response = await fetch(`${BASE_URL}/api/logistic-payment/validate-barcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        barcode_number: barcodeNumber
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 바코드 유효성 검증 성공:', result.data);
    } else {
      console.log('❌ 바코드 유효성 검증 실패:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 바코드 유효성 검증 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 3. 바코드로 입고 확인 업데이트 테스트
async function testUpdateArrivalByBarcode(token, barcodeNumber) {
  try {
    console.log(`\n📦 바코드 입고 확인 업데이트 테스트: ${barcodeNumber}`);
    
    const response = await fetch(`${BASE_URL}/api/logistic-payment/update-arrival-by-barcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        barcode_number: barcodeNumber,
        arrived_by: '테스트사용자'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 바코드 입고 확인 업데이트 성공:', result.data);
    } else {
      console.log('❌ 바코드 입고 확인 업데이트 실패:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 바코드 입고 확인 업데이트 오류:', error.message);
    return { success: false, error: error.message };
  }
}

// 존재하지 않는 바코드 테스트
async function testInvalidBarcode(token) {
  const invalidBarcode = 'INVALID123456';
  
  console.log(`\n❌ 존재하지 않는 바코드 테스트: ${invalidBarcode}`);
  
  // 1. 바코드 스캔 테스트
  await testScanBarcode(token, invalidBarcode);
  
  // 2. 바코드 유효성 검증 테스트
  await testValidateBarcode(token, invalidBarcode);
  
  // 3. 바코드 입고 확인 업데이트 테스트
  await testUpdateArrivalByBarcode(token, invalidBarcode);
}

// 메인 테스트 실행
async function runTests() {
  console.log('🚀 바코드 스캔 API 테스트 시작\n');
  
  // 1. 로그인
  const token = await login();
  if (!token) {
    console.error('❌ 로그인 실패로 테스트를 중단합니다.');
    return;
  }
  
  // 2. 유효한 바코드 테스트
  console.log('\n=== 유효한 바코드 테스트 ===');
  
  // 2-1. 바코드 유효성 검증
  await testValidateBarcode(token, TEST_BARCODE);
  
  // 2-2. 바코드 스캔 (입고 확인)
  await testScanBarcode(token, TEST_BARCODE);
  
  // 2-3. 이미 입고 확인된 바코드 재스캔 (중복 테스트)
  console.log('\n⚠️ 이미 입고 확인된 바코드 재스캔 테스트');
  await testScanBarcode(token, TEST_BARCODE);
  
  // 3. 존재하지 않는 바코드 테스트
  console.log('\n=== 존재하지 않는 바코드 테스트 ===');
  await testInvalidBarcode(token);
  
  console.log('\n✅ 모든 테스트 완료');
}

// 테스트 실행
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  login,
  testScanBarcode,
  testValidateBarcode,
  testUpdateArrivalByBarcode,
  testInvalidBarcode,
  runTests
};
