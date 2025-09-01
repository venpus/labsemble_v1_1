import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, CreditCard, DollarSign, Calendar, Truck, Package, Box, AlertCircle, CheckCircle, Clock, Save } from 'lucide-react';

const LogisticPayment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // URL 파라미터에서 날짜 정보 추출
  const selectedDate = searchParams.get('date');
  
  // 물류 결제 데이터 상태
  const [paymentData, setPaymentData] = useState([]);
  const [summary, setSummary] = useState({
    totalShippingCost: 0,
    paidCount: 0,
    unpaidCount: 0,
    pendingCount: 0,
    totalProjects: 0,
    logisticCompanies: []
  });

  // 저장 상태
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 데이터 변경 감지
  const handleDataChange = (index, field, value) => {
    const updatedData = [...paymentData];
    
    // 배송비는 숫자로 변환하여 저장
    if (field === 'shipping_cost') {
      const numericValue = parseFloat(value) || 0;
      updatedData[index] = { ...updatedData[index], [field]: numericValue };
      console.log(`💰 [LogisticPayment] 배송비 변경: ${value} → ${numericValue} (숫자 변환)`);
    } else {
      updatedData[index] = { ...updatedData[index], [field]: value };
    }
    
    setPaymentData(updatedData);
    setHasChanges(true);
    
    // 요약 정보 업데이트
    if (field === 'shipping_cost' || field === 'payment_status') {
      const newTotalShippingCost = updatedData.reduce((sum, item) => sum + (parseFloat(item.shipping_cost) || 0), 0);
      const newPaidCount = updatedData.filter(item => item.payment_status === 'paid').length;
      const newUnpaidCount = updatedData.filter(item => item.payment_status === 'unpaid').length;
      
      setSummary(prev => ({
        ...prev,
        totalShippingCost: newTotalShippingCost,
        paidCount: newPaidCount,
        unpaidCount: newUnpaidCount
      }));
    }
  };

  // 데이터 저장
  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      // 저장할 데이터 준비 - 필수 필드 검증
      const saveData = paymentData.map(item => {
        // 필수 필드 검증
        if (!item.packing_code) {
          throw new Error(`포장코드가 누락되었습니다: ${JSON.stringify(item)}`);
        }
        if (!item.box_no || item.box_no < 1) {
          throw new Error(`박스 번호가 올바르지 않습니다: ${JSON.stringify(item)}`);
        }
        if (!item.mj_packing_list_id) {
          throw new Error(`mj_packing_list_id가 누락되었습니다: ${JSON.stringify(item)}`);
        }

        return {
          mj_packing_list_id: item.mj_packing_list_id,
          pl_date: selectedDate, // pl_date 추가
          packing_code: item.packing_code,
          logistic_company: item.logistic_company || null,
          box_no: item.box_no,
          tracking_number: item.tracking_number || null,
          logistic_fee: parseFloat(item.shipping_cost) || 0, // 숫자로 변환
          is_paid: item.payment_status === 'paid' || false,
          description: item.description || null
        };
      });

      console.log('💾 [LogisticPayment] 저장할 데이터:', saveData);

      // API 호출
      const response = await fetch('/api/logistic-payment/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          data: saveData, 
          date: selectedDate 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '저장에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        const message = result.data.errors && result.data.errors.length > 0 
          ? `물류 결제 정보가 저장되었습니다. (${result.data.saved}개 새로 저장, ${result.data.updated}개 업데이트, ${result.data.errors.length}개 오류)`
          : `물류 결제 정보가 성공적으로 저장되었습니다. (${result.data.saved}개 새로 저장, ${result.data.updated}개 업데이트)`;
        
        toast.success(message);
        setHasChanges(false);
        
        // 저장된 데이터로 새로고침하여 DB에서 최신 데이터 가져오기
        await fetchPaymentData();
        
        console.log('✅ [LogisticPayment] 저장 완료:', result.data);
      } else {
        throw new Error(result.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ [LogisticPayment] 저장 오류:', error);
      toast.error(`저장 실패: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 데이터 새로고침
  const handleRefresh = async () => {
    if (selectedDate) {
      await fetchPaymentData();
      setHasChanges(false);
      toast.success('데이터가 새로고침되었습니다.');
    }
  };

  // 뒤로 가기
  const handleGoBack = () => {
    navigate('/dashboard/mj-packing-list');
  };

  // 물류 결제 데이터 가져오기
  const fetchPaymentData = async () => {
    if (!selectedDate) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      // 먼저 logistic_payment 테이블에서 저장된 데이터 확인
      let savedPaymentData = [];
      try {
        const paymentResponse = await fetch(`/api/logistic-payment/by-date/${selectedDate}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (paymentResponse.ok) {
          const paymentResult = await paymentResponse.json();
          if (paymentResult.success && paymentResult.data) {
            savedPaymentData = paymentResult.data;
            console.log('💾 [LogisticPayment] 저장된 결제 데이터:', savedPaymentData);
          }
        }
      } catch (error) {
        console.log('⚠️ [LogisticPayment] 저장된 결제 데이터 조회 실패 (무시됨):', error.message);
      }

      // 패킹리스트 기본 데이터 가져오기
      const response = await fetch(`/api/packing-list?pl_date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('데이터를 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        // 선택된 날짜의 데이터만 필터링
        const filteredData = data.data.filter(item => item.pl_date === selectedDate);
        
        // box_count에 따라 데이터 확장
        const expandedData = [];
        
        // 각 포장코드별로 실제 박스 수 계산 (중복 제거)
        const packingCodeBoxCounts = {};
        const uniquePackingCodes = new Set();
        
        filteredData.forEach(item => {
          if (!uniquePackingCodes.has(item.packing_code)) {
            uniquePackingCodes.add(item.packing_code);
            packingCodeBoxCounts[item.packing_code] = item.box_count || 1;
            console.log(`📦 [LogisticPayment] ${item.packing_code}: 박스 수 ${item.box_count || 1} 설정`);
          }
        });
        
        console.log('📦 [LogisticPayment] 포장코드별 실제 박스 수:', packingCodeBoxCounts);
        
        // 포장코드별로 중복 제거하여 고유한 데이터만 처리
        const uniquePackingData = [];
        const processedPackingCodes = new Set();
        
        filteredData.forEach(item => {
          if (!processedPackingCodes.has(item.packing_code)) {
            processedPackingCodes.add(item.packing_code);
            uniquePackingData.push(item);
            console.log(`📦 [LogisticPayment] 고유 포장코드 추가: ${item.packing_code}`);
          }
        });
        
        console.log('📦 [LogisticPayment] 중복 제거된 고유 포장코드 데이터:', uniquePackingData);
        
        uniquePackingData.forEach(item => {
          const actualBoxCount = packingCodeBoxCounts[item.packing_code] || 1;
          
          for (let i = 0; i < actualBoxCount; i++) {
            const boxNo = i + 1; // 각 포장코드별로 1부터 시작
            
            // 저장된 결제 데이터에서 해당 항목 찾기
            const savedItem = savedPaymentData.find(saved => 
              saved.packing_code === item.packing_code && 
              saved.box_no === boxNo
            );
            
            expandedData.push({
              ...item,
              id: `${item.packing_code}_${i}`, // 더 명확한 ID 생성
              mj_packing_list_id: item.id, // mj_packing_list의 실제 ID
              pl_date: selectedDate, // pl_date 추가
              box_no: boxNo, // 각 포장코드별로 1부터 시작 (1, 2, 3, ..., 20)
              total_boxes: actualBoxCount,
              repeat_number: i + 1,
              total_repeats: actualBoxCount,
              tracking_number: savedItem ? savedItem.tracking_number : '',
              shipping_cost: savedItem ? parseFloat(savedItem.logistic_fee) || 0 : 0, // 숫자로 변환
              payment_status: savedItem ? (savedItem.is_paid ? 'paid' : 'unpaid') : 'unpaid',
              description: savedItem ? savedItem.description : ''
            });
          }
        });

        // packing_code로 그룹화하고 repeat_number 할당
        const groupedData = [];
        const codeGroups = {};
        
        expandedData.forEach(item => {
          if (!codeGroups[item.packing_code]) {
            codeGroups[item.packing_code] = [];
          }
          codeGroups[item.packing_code].push(item);
        });

        Object.keys(codeGroups).forEach(packingCode => {
          const items = codeGroups[packingCode];
          items.forEach((item, index) => {
            groupedData.push({
              ...item,
              repeat_number: index + 1,
              total_repeats: items.length
            });
          });
        });

        // packing_code 순으로 정렬
        groupedData.sort((a, b) => a.packing_code.localeCompare(b.packing_code));

        setPaymentData(groupedData);
        
        // 요약 정보 업데이트
        const totalShippingCost = groupedData.reduce((sum, item) => sum + (parseFloat(item.shipping_cost) || 0), 0);
        const paidCount = groupedData.filter(item => item.payment_status === 'paid').length;
        const unpaidCount = groupedData.filter(item => item.payment_status === 'unpaid').length;
        const logisticCompanies = [...new Set(groupedData.map(item => item.logistic_company).filter(Boolean))];
        
        setSummary({
          totalShippingCost,
          paidCount,
          unpaidCount,
          pendingCount: 0,
          totalProjects: groupedData.length,
          logisticCompanies
        });
      }
    } catch (error) {
      console.error('❌ [LogisticPayment] 데이터 가져오기 오류:', error);
      setError(error.message);
      toast.error(`데이터 로드 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    if (selectedDate) {
      fetchPaymentData();
    }
  }, [selectedDate]);

  // 날짜가 선택되지 않은 경우
  if (!selectedDate) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🚚 물류 결제 관리
              </h1>
              <p className="text-gray-600">날짜를 선택하여 물류 결제 현황을 확인할 수 있습니다.</p>
            </div>
            
            <button
              onClick={handleGoBack}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </button>
          </div>
        </div>

        {/* 날짜 선택 안내 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="text-yellow-600 mb-4">
            <Calendar className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            날짜를 선택해주세요
          </h2>
          <p className="text-yellow-700 mb-4">
            MJPackingList에서 특정 날짜의 배송비 정보를 클릭하여<br />
            해당 날짜의 물류 결제 현황을 확인할 수 있습니다.
          </p>
          <button
            onClick={handleGoBack}
            className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            패킹리스트로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🚚 물류 결제 관리
            </h1>
            <p className="text-gray-600">
              {selectedDate} 출고일자의 물류 결제 현황을 확인할 수 있습니다.
            </p>
          </div>
          
          {/* 액션 버튼들 */}
          <div className="flex space-x-3">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </button>
          </div>
        </div>
      </div>

      {/* 선택된 날짜 표시 */}
      {selectedDate && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-blue-800 font-medium">선택된 출고일자: {selectedDate}</span>
            </div>
            <div className="text-sm text-blue-600">
              총 {summary.totalProjects}개 프로젝트
            </div>
          </div>
        </div>
      )}

      {/* 새로고침 버튼 */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {selectedDate} 출고일자의 물류 결제 현황
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges || !selectedDate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? '저장 중...' : '전체저장'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={!selectedDate}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            새로고침
          </button>
        </div>
      </div>

      {/* 요약 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 박스 수</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalProjects}개</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 배송비</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalShippingCost.toLocaleString()}원</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">결제완료</p>
              <p className="text-2xl font-bold text-gray-900">{summary.paidCount}건</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">물류회사</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.logisticCompanies.length > 0 ? summary.logisticCompanies.join(', ') : '없음'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 물류 결제 상세 테이블 */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {/* 테이블 헤더 */}
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-8 gap-4 px-4 py-3 text-sm font-medium text-gray-700">
              <div className="col-span-1">번호</div>
              <div className="col-span-1">포장코드</div>
              <div className="col-span-1">박스 순서</div>
              <div className="col-span-1">물류회사</div>
              <div className="col-span-1">송장번호</div>
              <div className="col-span-1">배송비</div>
              <div className="col-span-1">결제여부</div>
              <div className="col-span-1">설명</div>
            </div>
          </div>

          {/* 테이블 본문 */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <div className="flex flex-col items-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <div className="text-lg font-medium text-gray-600">데이터를 불러오는 중...</div>
                </div>
              </div>
            ) : error ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <div className="flex flex-col items-center space-y-2">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                  <div className="text-lg font-medium text-red-600">오류가 발생했습니다</div>
                  <div className="text-sm text-gray-500">{error}</div>
                </div>
              </div>
            ) : paymentData.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <div className="flex flex-col items-center space-y-2">
                  <Package className="w-12 h-12 text-gray-400" />
                  <div className="text-lg font-medium text-gray-600">
                    {selectedDate} 출고일자의 물류 결제 데이터가 없습니다
                  </div>
                  <div className="text-sm text-gray-500">
                    해당 날짜에 등록된 패킹리스트가 없거나<br />
                    배송비 정보가 등록되지 않았습니다
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    MJPackingList에서 다른 날짜를 선택해보세요
                  </div>
                </div>
              </div>
            ) : (
              paymentData.map((item, index) => (
                <div key={item.id} className="grid grid-cols-8 gap-4 px-4 py-3 text-sm">
                  {/* 번호 */}
                  <div className="col-span-1 text-gray-900 font-medium">
                    {index + 1}
                  </div>
                  
                  {/* 포장코드 */}
                  <div className="col-span-1">
                    <div className="flex flex-col">
                      <span className="text-gray-900 font-medium">
                        {item.packing_code}
                      </span>
                      <span className="text-xs text-gray-500">
                        박스 {item.box_no}/{item.total_boxes}
                      </span>
                    </div>
                  </div>
                  
                  {/* 박스 순서 */}
                  <div className="col-span-1">
                    <div className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        {item.box_no}
                      </span>
                    </div>
                  </div>
                  
                  {/* 물류회사 */}
                  <div className="col-span-1">
                    <div className="text-gray-900">
                      {item.logistic_company || '-'}
                    </div>
                  </div>
                  
                  {/* 송장번호 */}
                  <div className="col-span-1">
                    <input
                      type="text"
                      value={item.tracking_number || ''}
                      onChange={(e) => handleDataChange(index, 'tracking_number', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="송장번호 입력"
                    />
                  </div>
                  
                  {/* 배송비 */}
                  <div className="col-span-1">
                    <input
                      type="number"
                      step="0.01"
                      value={item.shipping_cost || ''}
                      onChange={(e) => handleDataChange(index, 'shipping_cost', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  
                  {/* 결제여부 */}
                  <div className="col-span-1">
                    <label className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={item.payment_status === 'paid'}
                        onChange={(e) => handleDataChange(index, 'payment_status', e.target.checked ? 'paid' : 'unpaid')}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {item.payment_status === 'paid' ? '결제완료' : '미결제'}
                      </span>
                    </label>
                  </div>
                  
                  {/* 설명 */}
                  <div className="col-span-1">
                    <textarea
                      value={item.description || ''}
                      onChange={(e) => handleDataChange(index, 'description', e.target.value)}
                      rows="2"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="설명 입력"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogisticPayment; 