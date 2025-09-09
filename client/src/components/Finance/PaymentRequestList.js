import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Package, Truck, Clock, ChevronDown, ChevronRight, Building, User, Image, Tag, Percent, MapPin, Printer, CheckCircle } from 'lucide-react';
import PaymentRequestPrints from './PaymentRequestPrints';

const PaymentRequestList = () => {
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [detailData, setDetailData] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(new Set());
  const [printModal, setPrintModal] = useState({ isOpen: false, date: null, request: null });
  
  // 지급완료 관련 상태
  const [completingPayments, setCompletingPayments] = useState(new Set()); // 선금 지급완료 처리 중인 날짜들
  const [completedPayments, setCompletedPayments] = useState(new Set());   // 선금 지급완료된 날짜들
  
  // 잔금 지급완료 관련 상태
  const [completingBalancePayments, setCompletingBalancePayments] = useState(new Set()); // 잔금 지급완료 처리 중인 날짜들
  const [completedBalancePayments, setCompletedBalancePayments] = useState(new Set());   // 잔금 지급완료된 날짜들
  
  // 배송비 지급완료 관련 상태
  const [completingShippingPayments, setCompletingShippingPayments] = useState(new Set()); // 배송비 지급완료 처리 중인 날짜들
  const [completedShippingPayments, setCompletedShippingPayments] = useState(new Set());   // 배송비 지급완료된 날짜들

  useEffect(() => {
    fetchPaymentRequests();
  }, []);

  const fetchPaymentRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/payment-request/payment-requests-by-date', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`서버 오류 (${response.status}): 지급 요청 목록을 불러오는데 실패했습니다.`);
      }

      const data = await response.json();
      
      if (data.success) {
        setPaymentRequests(data.data || []);
      } else {
        throw new Error(data.message || '지급 요청 목록 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('지급 요청 목록 조회 오류:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDateExpansion = async (date) => {
    const newExpandedDates = new Set(expandedDates);
    if (newExpandedDates.has(date)) {
      newExpandedDates.delete(date);
      setExpandedDates(newExpandedDates);
    } else {
      newExpandedDates.add(date);
      setExpandedDates(newExpandedDates);
      
      // 상세 데이터가 없으면 로드
      if (!detailData[date]) {
        await fetchDetailData(date);
      }
    }
  };

  const fetchDetailData = async (date) => {
    try {
      setLoadingDetails(prev => new Set(prev).add(date));
      
      const response = await fetch(`/api/payment-request/payment-request-details/${date}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`서버 오류 (${response.status}): 상세 데이터를 불러오는데 실패했습니다.`);
      }

      const data = await response.json();
      
      if (data.success) {
        setDetailData(prev => ({
          ...prev,
          [date]: data.data
        }));
      } else {
        throw new Error(data.message || '상세 데이터 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('상세 데이터 조회 오류:', error);
    } finally {
      setLoadingDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(date);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handlePrint = async (date) => {
    const request = paymentRequests.find(r => r.date === date);
    if (!request) return;

    // 상세 데이터가 없으면 먼저 로드
    if (!detailData[date]) {
      await fetchDetailData(date);
    }

    setPrintModal({
      isOpen: true,
      date: date,
      request: request
    });
  };

  // 금일까지의 지급 예정 금액 새로고침 함수
  const refreshPaymentSchedule = async () => {
    try {
      // 부모 컴포넌트의 지급 예정 데이터 새로고침을 위한 이벤트 발생
      window.dispatchEvent(new CustomEvent('refreshPaymentSchedule'));
    } catch (error) {
      console.error('지급 예정 데이터 새로고침 오류:', error);
    }
  };

  // 배송비 지급완료 처리 함수
  const handleCompleteShippingPayment = async (date) => {
    try {
      // 1. 해당 날짜의 배송비 요청 ID 수집
      const shippingRequests = detailData[date]?.shipping || [];
      const requestIds = shippingRequests.map(request => request.id);
      
      if (requestIds.length === 0) {
        alert('지급완료할 배송비 요청이 없습니다.');
        return;
      }

      // 2. 확인 다이얼로그
      const confirmed = window.confirm(
        `${date} 날짜의 배송비 지급을 완료 처리하시겠습니까?\n` +
        `처리할 요청: ${requestIds.length}개\n\n` +
        `요청 목록:\n${shippingRequests.map(r => `- ${r.packing_codes} (${r.total_amount} CNY)`).join('\n')}`
      );
      
      if (!confirmed) return;

      // 3. 로딩 상태 설정
      setCompletingShippingPayments(prev => new Set(prev).add(date));

      // 4. API 호출
      const response = await fetch('/api/payment-request/complete-shipping-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          date: date,
          requestIds: requestIds,
          paymentDate: new Date().toISOString().split('T')[0] // 오늘 날짜
        })
      });

      if (!response.ok) {
        throw new Error(`서버 오류 (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success) {
        // 5. 성공 처리
        setCompletedShippingPayments(prev => new Set(prev).add(date));
        alert(`배송비 지급완료 처리가 완료되었습니다.\n처리된 요청: ${result.data.completedCount}개`);
        
        // 6. 데이터 새로고침
        await fetchPaymentRequests();
        if (detailData[date]) {
          await fetchDetailData(date);
        }
        
        // 7. 금일까지의 지급 예정 금액 새로고침
        await refreshPaymentSchedule();
      } else {
        throw new Error(result.message || '지급완료 처리에 실패했습니다.');
      }

    } catch (error) {
      console.error('배송비 지급완료 처리 오류:', error);
      alert(`지급완료 처리 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      // 8. 로딩 상태 해제
      setCompletingShippingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(date);
        return newSet;
      });
    }
  };

  // 잔금 지급완료 처리 함수
  const handleCompleteBalancePayment = async (date) => {
    try {
      // 1. 해당 날짜의 잔금 프로젝트 ID 수집
      const balanceProjects = detailData[date]?.balance || [];
      const projectIds = balanceProjects.map(project => project.project_id);
      
      if (projectIds.length === 0) {
        alert('지급완료할 잔금 프로젝트가 없습니다.');
        return;
      }

      // 2. 확인 다이얼로그
      const confirmed = window.confirm(
        `${date} 날짜의 잔금 지급을 완료 처리하시겠습니까?\n` +
        `처리할 프로젝트: ${projectIds.length}개\n\n` +
        `프로젝트 목록:\n${balanceProjects.map(p => `- ${p.project_name} (ID: ${p.project_id})`).join('\n')}`
      );
      
      if (!confirmed) return;

      // 3. 로딩 상태 설정
      setCompletingBalancePayments(prev => new Set(prev).add(date));

      // 4. API 호출
      const response = await fetch('/api/payment-request/complete-balance-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          date: date,
          projectIds: projectIds,
          paymentDate: new Date().toISOString().split('T')[0] // 오늘 날짜
        })
      });

      if (!response.ok) {
        throw new Error(`서버 오류 (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success) {
        // 5. 성공 처리
        setCompletedBalancePayments(prev => new Set(prev).add(date));
        alert(`잔금 지급완료 처리가 완료되었습니다.\n처리된 프로젝트: ${result.data.completedCount}개`);
        
        // 6. 데이터 새로고침
        await fetchPaymentRequests();
        if (detailData[date]) {
          await fetchDetailData(date);
        }
        
        // 7. 금일까지의 지급 예정 금액 새로고침
        await refreshPaymentSchedule();
      } else {
        throw new Error(result.message || '지급완료 처리에 실패했습니다.');
      }

    } catch (error) {
      console.error('잔금 지급완료 처리 오류:', error);
      alert(`지급완료 처리 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      // 8. 로딩 상태 해제
      setCompletingBalancePayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(date);
        return newSet;
      });
    }
  };

  // 선금 지급완료 처리 함수
  const handleCompleteAdvancePayment = async (date) => {
    try {
      // 1. 해당 날짜의 선금 프로젝트 ID 수집
      const advanceProjects = detailData[date]?.advance || [];
      const projectIds = advanceProjects.map(project => project.project_id);
      
      if (projectIds.length === 0) {
        alert('지급완료할 선금 프로젝트가 없습니다.');
        return;
      }

      // 2. 확인 다이얼로그
      const confirmed = window.confirm(
        `${date} 날짜의 선금 지급을 완료 처리하시겠습니까?\n` +
        `처리할 프로젝트: ${projectIds.length}개\n\n` +
        `프로젝트 목록:\n${advanceProjects.map(p => `- ${p.project_name} (ID: ${p.project_id})`).join('\n')}`
      );
      
      if (!confirmed) return;

      // 3. 로딩 상태 설정
      setCompletingPayments(prev => new Set(prev).add(date));

      // 4. API 호출
      const response = await fetch('/api/payment-request/complete-advance-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          date: date,
          projectIds: projectIds,
          paymentDate: new Date().toISOString().split('T')[0] // 오늘 날짜
        })
      });

      if (!response.ok) {
        throw new Error(`서버 오류 (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success) {
        // 5. 성공 처리
        setCompletedPayments(prev => new Set(prev).add(date));
        alert(`선금 지급완료 처리가 완료되었습니다.\n처리된 프로젝트: ${result.data.completedCount}개`);
        
        // 6. 데이터 새로고침
        await fetchPaymentRequests();
        if (detailData[date]) {
          await fetchDetailData(date);
        }
        
        // 7. 금일까지의 지급 예정 금액 새로고침
        await refreshPaymentSchedule();
      } else {
        throw new Error(result.message || '지급완료 처리에 실패했습니다.');
      }

    } catch (error) {
      console.error('선금 지급완료 처리 오류:', error);
      alert(`지급완료 처리 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      // 8. 로딩 상태 해제
      setCompletingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(date);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">지급 요청 목록</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p>지급 요청 목록을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <h3 className="text-lg font-semibold text-red-900">지급 요청 목록</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-red-600">
            <p>오류가 발생했습니다: {error}</p>
            <button 
              onClick={fetchPaymentRequests}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentRequests.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">지급 요청 목록</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>등록된 지급 요청이 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">지급 요청 목록</h3>
        <p className="text-sm text-gray-600 mt-1">날짜별로 그룹화된 지급 요청 현황</p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {paymentRequests.map((request, index) => {
          const isExpanded = expandedDates.has(request.date);
          const hasAnyRequest = request.advance || request.balance || request.shipping;
          
          if (!hasAnyRequest) return null;

          return (
            <div key={request.date} className="p-6">
              <div className="flex items-center justify-between p-2 rounded">
                <div 
                  className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded flex-1"
                  onClick={() => toggleDateExpansion(request.date)}
                >
                  <Calendar className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {formatDate(request.date)}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                      {request.advance && (
                        <span className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1 text-red-500" />
                          선금 {request.advance.count}건 ({formatAmount(request.advance.total_amount)})
                        </span>
                      )}
                      {request.balance && (
                        <span className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1 text-blue-500" />
                          잔금 {request.balance.count}건 ({formatAmount(request.balance.total_amount)})
                        </span>
                      )}
                      {request.shipping && (
                        <span className="flex items-center">
                          <Truck className="w-4 h-4 mr-1 text-orange-500" />
                          배송비 {request.shipping.count}건 ({formatAmount(request.shipping.total_amount)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrint(request.date);
                    }}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    인쇄
                  </button>
                  <button
                    onClick={() => toggleDateExpansion(request.date)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-6">
                  {/* 선금 지급 요청 테이블 */}
                  {request.advance && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-red-800 flex items-center">
                            <DollarSign className="w-5 h-5 mr-2" />
                            선금 지급 요청
                            <span className="ml-2 text-sm font-normal text-red-600">
                              ({request.advance.count}건)
                            </span>
                          </h4>
                          <button
                            onClick={() => handleCompleteAdvancePayment(request.date)}
                            disabled={completingPayments.has(request.date) || completedPayments.has(request.date)}
                            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              completingPayments.has(request.date)
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                : completedPayments.has(request.date)
                                  ? 'bg-green-500 text-white cursor-default'
                                  : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                            }`}
                            title={
                              completingPayments.has(request.date)
                                ? '지급완료 처리 중...'
                                : completedPayments.has(request.date)
                                  ? '지급완료 처리됨'
                                  : '선금 지급을 완료 처리합니다'
                            }
                          >
                            {completingPayments.has(request.date) ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                처리 중...
                              </>
                            ) : completedPayments.has(request.date) ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                지급완료됨
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-4 h-4 mr-2" />
                                지급완료
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {loadingDetails.has(request.date) ? (
                        <div className="p-6">
                          <div className="animate-pulse space-y-3">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="h-12 bg-gray-200 rounded"></div>
                            ))}
                          </div>
                        </div>
                      ) : detailData[request.date]?.advance?.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>선금 지급 예정 항목이 없습니다.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  제품사진
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  프로젝트명
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  수량
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  단가
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  선금 금액
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  등록일
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(detailData[request.date]?.advance || []).map((payment, index) => (
                                <tr key={payment.id || index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center justify-center">
                                      {payment.representative_image ? (
                                        <img
                                          src={`/api/warehouse/image/${payment.representative_image}`}
                                          alt={payment.project_name}
                                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                          }}
                                        />
                                      ) : null}
                                      <div 
                                        className={`w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center ${payment.representative_image ? 'hidden' : 'flex'}`}
                                      >
                                        <Image className="w-6 h-6 text-gray-400" />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Building className="w-4 h-4 text-gray-400 mr-2" />
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {payment.project_name || '프로젝트명 없음'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          ID: {payment.project_id}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Package className="w-4 h-4 text-gray-400 mr-2" />
                                      <span className="text-sm font-medium text-gray-900">
                                        {payment.quantity || 0}개
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Tag className="w-4 h-4 text-gray-400 mr-2" />
                                      <span className="text-sm font-medium text-gray-900">
                                        ¥{Number(payment.unit_price || 0).toLocaleString()} CNY
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <DollarSign className="w-4 h-4 text-red-400 mr-2" />
                                      <span className="text-sm font-medium text-red-600">
                                        ¥{Number(payment.amount || 0).toLocaleString()} CNY
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                      <span className="text-sm text-gray-500">
                                        {payment.created_at ? new Date(payment.created_at).toLocaleDateString('ko-KR') : '-'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 잔금 지급 요청 테이블 */}
                  {request.balance && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-blue-800 flex items-center">
                            <DollarSign className="w-5 h-5 mr-2" />
                            잔금 지급 요청
                            <span className="ml-2 text-sm font-normal text-blue-600">
                              ({request.balance.count}건)
                            </span>
                          </h4>
                          <button
                            onClick={() => handleCompleteBalancePayment(request.date)}
                            disabled={completingBalancePayments.has(request.date) || completedBalancePayments.has(request.date)}
                            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              completingBalancePayments.has(request.date)
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                : completedBalancePayments.has(request.date)
                                  ? 'bg-green-500 text-white cursor-default'
                                  : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                            }`}
                            title={
                              completingBalancePayments.has(request.date)
                                ? '잔금 지급완료 처리 중...'
                                : completedBalancePayments.has(request.date)
                                  ? '잔금 지급완료 처리됨'
                                  : '잔금 지급을 완료 처리합니다'
                            }
                          >
                            {completingBalancePayments.has(request.date) ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                처리 중...
                              </>
                            ) : completedBalancePayments.has(request.date) ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                지급완료됨
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-4 h-4 mr-2" />
                                지급완료
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {loadingDetails.has(request.date) ? (
                        <div className="p-6">
                          <div className="animate-pulse space-y-3">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="h-12 bg-gray-200 rounded"></div>
                            ))}
                          </div>
                        </div>
                      ) : detailData[request.date]?.balance?.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>잔금 지급 예정 항목이 없습니다.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  제품사진
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  프로젝트명
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  수량
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  단가
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  수수료율
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  잔금 금액
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  등록일
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(detailData[request.date]?.balance || []).map((payment, index) => (
                                <tr key={payment.id || index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center justify-center">
                                      {payment.representative_image ? (
                                        <img
                                          src={`/api/warehouse/image/${payment.representative_image}`}
                                          alt={payment.project_name}
                                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                          }}
                                        />
                                      ) : null}
                                      <div 
                                        className={`w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center ${payment.representative_image ? 'hidden' : 'flex'}`}
                                      >
                                        <Image className="w-6 h-6 text-gray-400" />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Building className="w-4 h-4 text-gray-400 mr-2" />
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {payment.project_name || '프로젝트명 없음'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          ID: {payment.project_id}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Package className="w-4 h-4 text-gray-400 mr-2" />
                                      <span className="text-sm font-medium text-gray-900">
                                        {payment.quantity || 0}개
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Tag className="w-4 h-4 text-gray-400 mr-2" />
                                      <span className="text-sm font-medium text-gray-900">
                                        ¥{Number(payment.unit_price || 0).toLocaleString()} CNY
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Percent className="w-4 h-4 text-gray-400 mr-2" />
                                      <span className="text-sm font-medium text-gray-900">
                                        {payment.fee_rate ? `${payment.fee_rate}%` : '-'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <DollarSign className="w-4 h-4 text-blue-400 mr-2" />
                                      <span className="text-sm font-medium text-blue-600">
                                        ¥{Number(payment.amount || 0).toLocaleString()} CNY
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                      <span className="text-sm text-gray-500">
                                        {payment.created_at ? new Date(payment.created_at).toLocaleDateString('ko-KR') : '-'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 배송비 지급 요청 테이블 */}
                  {request.shipping && (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 bg-orange-50 border-b border-orange-200">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-orange-800 flex items-center">
                            <Truck className="w-5 h-5 mr-2" />
                            배송비 지급 요청
                            <span className="ml-2 text-sm font-normal text-orange-600">
                              ({request.shipping.count}건)
                            </span>
                          </h4>
                          <button
                            onClick={() => handleCompleteShippingPayment(request.date)}
                            disabled={completingShippingPayments.has(request.date) || completedShippingPayments.has(request.date)}
                            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              completingShippingPayments.has(request.date)
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                : completedShippingPayments.has(request.date)
                                  ? 'bg-green-500 text-white cursor-default'
                                  : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                            }`}
                            title={
                              completingShippingPayments.has(request.date)
                                ? '배송비 지급완료 처리 중...'
                                : completedShippingPayments.has(request.date)
                                  ? '배송비 지급완료 처리됨'
                                  : '배송비 지급을 완료 처리합니다'
                            }
                          >
                            {completingShippingPayments.has(request.date) ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                처리 중...
                              </>
                            ) : completedShippingPayments.has(request.date) ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                지급완료됨
                              </>
                            ) : (
                              <>
                                <Truck className="w-4 h-4 mr-2" />
                                지급완료
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {loadingDetails.has(request.date) ? (
                        <div className="p-6">
                          <div className="animate-pulse space-y-3">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="h-12 bg-gray-200 rounded"></div>
                            ))}
                          </div>
                        </div>
                      ) : detailData[request.date]?.shipping?.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>배송비 지급 예정 항목이 없습니다.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  출고일 (pl_date)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  박스 수
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  총 배송비
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  포장코드
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  물류회사
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(detailData[request.date]?.shipping || []).map((payment, index) => (
                                <tr key={payment.id || index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                                      <span className="text-sm font-medium text-gray-900">
                                        {payment.pl_date || '미정'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Package className="w-4 h-4 text-gray-400 mr-2" />
                                      <span className="text-sm font-medium text-gray-900">
                                        {payment.total_boxes || 0}박스
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <DollarSign className="w-4 h-4 text-orange-400 mr-2" />
                                      <span className="text-sm font-medium text-orange-600">
                                        ¥{Number(payment.total_amount || 0).toLocaleString()} CNY
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <Tag className="w-4 h-4 text-gray-400 mr-2" />
                                      <span className="text-sm text-gray-500">
                                        {payment.packing_codes || '-'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                                      <span className="text-sm text-gray-500">
                                        {payment.logistic_companies || '-'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 인쇄 모달 */}
      <PaymentRequestPrints
        isOpen={printModal.isOpen}
        onClose={() => setPrintModal({ isOpen: false, date: null, request: null })}
        request={printModal.request}
        detailData={printModal.date ? detailData[printModal.date] : null}
        selectedDate={printModal.date ? formatDate(printModal.date) : ''}
      />
    </div>
  );
};

export default PaymentRequestList;
