import React, { useState } from 'react';
import { Truck, ChevronDown, ChevronRight, CreditCard, Save, List } from 'lucide-react';
import AdvancePaymentDetails from './AdvancePaymentDetails';
import BalancePaymentDetails from './BalancePaymentDetails';
import ShippingPaymentDetails from './ShippingPaymentDetails';
import PaymentRequestList from './PaymentRequestList';

const FinancePaymentSchedule = ({ 
  advancePaymentSchedule = 0,
  balancePaymentSchedule = 0,
  shippingPaymentSchedule = 0,
  dataLoading = false
}) => {
  // 총 지급 예정 금액 계산 (실제 데이터 사용)
  const totalPaymentSchedule = advancePaymentSchedule + balancePaymentSchedule + shippingPaymentSchedule;
  
  // 상세 목록 표시 상태 관리
  const [showAdvanceDetails, setShowAdvanceDetails] = useState(false);
  const [showBalanceDetails, setShowBalanceDetails] = useState(false);
  const [showShippingDetails, setShowShippingDetails] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [showPaymentRequests, setShowPaymentRequests] = useState(false);
  
  // 상세 데이터 상태
  const [advancePaymentData, setAdvancePaymentData] = useState([]);
  const [balancePaymentData, setBalancePaymentData] = useState([]);
  const [shippingPaymentData, setShippingPaymentData] = useState([]);
  const [saving, setSaving] = useState(false);

  // 상세 데이터 가져오기 함수들
  const fetchAdvancePaymentData = async () => {
    try {
      const response = await fetch('/api/finance/advance-payment-details', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAdvancePaymentData(data.data.advancePayments || []);
        }
      }
    } catch (error) {
      console.error('선금 지급 예정 상세 정보 조회 오류:', error);
    }
  };

  const fetchBalancePaymentData = async () => {
    try {
      const response = await fetch('/api/finance/balance-payment-details', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBalancePaymentData(data.data.balancePayments || []);
        }
      }
    } catch (error) {
      console.error('잔금 지급 예정 상세 정보 조회 오류:', error);
    }
  };

  const fetchShippingPaymentData = async () => {
    try {
      const response = await fetch('/api/logistic-payment/shipping-payment-details', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShippingPaymentData(data.data.shippingPayments || []);
        }
      }
    } catch (error) {
      console.error('배송비 지급 예정 상세 정보 조회 오류:', error);
    }
  };

  // 항목저장 함수
  const handleSaveItems = async () => {
    setSaving(true);
    
    try {
      const response = await fetch('/api/payment-request/save-payment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          advancePayments: advancePaymentData.map(payment => ({
            project_id: payment.project_id,
            amount: payment.advance_payment
          })),
          balancePayments: balancePaymentData.map(payment => ({
            project_id: payment.project_id,
            amount: payment.balance_amount,
            fee_rate: payment.fee_rate
          })),
          shippingPayments: shippingPaymentData.map(payment => ({
            pl_date: payment.pl_date,
            box_count: payment.box_count,
            total_logistic_fee: payment.total_logistic_fee,
            packing_codes: payment.packing_codes,
            logistic_companies: payment.logistic_companies
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert('지급 요청이 성공적으로 저장되었습니다!');
          // 저장 후 상세 목록 숨기기
          setShowAllDetails(false);
          setShowAdvanceDetails(false);
          setShowBalanceDetails(false);
          setShowShippingDetails(false);
        } else {
          alert('저장 중 오류가 발생했습니다: ' + data.message);
        }
      } else {
        alert('저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('항목저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">금일까지 예정 지급 항목</h3>
          <div className="flex items-center space-x-3">
            {/* 지급 요청 목록 버튼 */}
            <button
              onClick={() => setShowPaymentRequests(!showPaymentRequests)}
              disabled={dataLoading}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                dataLoading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : showPaymentRequests
                    ? 'bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500'
                    : 'bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500'
              }`}
            >
              <List className="w-4 h-4 mr-2" />
              {showPaymentRequests ? '요청목록 숨기기' : '지급요청 목록'}
            </button>

            {/* 상세 숨기기 상태일 때만 항목저장 버튼 표시 */}
            {showAllDetails && !dataLoading && (
              <button
                onClick={handleSaveItems}
                disabled={saving}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  saving
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                }`}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? '저장 중...' : '항목저장'}
              </button>
            )}
            
            <button
            onClick={async () => {
              if (dataLoading) return; // 로딩 중이면 클릭 무시
              
              setShowAllDetails(!showAllDetails);
              if (!showAllDetails) {
                // 모든 상세 목록 표시 및 데이터 가져오기
                await Promise.all([
                  fetchAdvancePaymentData(),
                  fetchBalancePaymentData(),
                  fetchShippingPaymentData()
                ]);
                setShowAdvanceDetails(true);
                setShowBalanceDetails(true);
                setShowShippingDetails(true);
              } else {
                // 모든 상세 목록 숨기기
                setShowAdvanceDetails(false);
                setShowBalanceDetails(false);
                setShowShippingDetails(false);
              }
            }}
              disabled={dataLoading}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                dataLoading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : showAllDetails 
                    ? 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
              }`}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {dataLoading ? '데이터 로딩 중...' : (showAllDetails ? '상세 숨기기' : '지급 요청')}
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                선금 지급 예정
              </th>
              <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                잔금 지급 예정
              </th>
              <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                배송비 지급 예정
              </th>
              <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                총계
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-2 whitespace-nowrap text-center border border-gray-300">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-red-600">
                    ¥{advancePaymentSchedule.toLocaleString()} CNY
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    {advancePaymentSchedule > 0 ? '지급 예정' : '지급 예정 없음'}
                  </span>
                  {advancePaymentSchedule > 0 && (
                    <button
                      onClick={() => {
                        setShowAdvanceDetails(!showAdvanceDetails);
                        // 개별 버튼 클릭 시 전체 상태도 업데이트
                        const newAdvanceState = !showAdvanceDetails;
                        const allVisible = newAdvanceState && showBalanceDetails && showShippingDetails;
                        setShowAllDetails(allVisible);
                      }}
                      className="mt-2 flex items-center text-xs text-red-600 hover:text-red-800 transition-colors"
                    >
                      {showAdvanceDetails ? (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          상세 숨기기
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-3 h-3 mr-1" />
                          상세 보기
                        </>
                      )}
                    </button>
                  )}
                </div>
              </td>
              <td className="px-6 py-2 whitespace-nowrap text-center border border-gray-300">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-blue-600">
                    ¥{balancePaymentSchedule.toLocaleString()} CNY
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    {balancePaymentSchedule > 0 ? '지급 예정' : '지급 예정 없음'}
                  </span>
                  {balancePaymentSchedule > 0 && (
                    <button
                      onClick={() => {
                        setShowBalanceDetails(!showBalanceDetails);
                        // 개별 버튼 클릭 시 전체 상태도 업데이트
                        const newBalanceState = !showBalanceDetails;
                        const allVisible = showAdvanceDetails && newBalanceState && showShippingDetails;
                        setShowAllDetails(allVisible);
                      }}
                      className="mt-2 flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {showBalanceDetails ? (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          상세 숨기기
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-3 h-3 mr-1" />
                          상세 보기
                        </>
                      )}
                    </button>
                  )}
                </div>
              </td>
              <td className="px-6 py-2 whitespace-nowrap text-center border border-gray-300">
                <div className="flex flex-col items-center">
                  <div className="flex items-center">
                    <Truck className="w-5 h-5 text-orange-600 mr-2" />
                    <span className="text-lg font-bold text-orange-600">
                      ¥{shippingPaymentSchedule.toLocaleString()} CNY
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    {shippingPaymentSchedule > 0 ? '지급 예정' : '지급 예정 없음'}
                  </span>
                  {shippingPaymentSchedule > 0 && (
                    <button
                      onClick={() => {
                        setShowShippingDetails(!showShippingDetails);
                        // 개별 버튼 클릭 시 전체 상태도 업데이트
                        const newShippingState = !showShippingDetails;
                        const allVisible = showAdvanceDetails && showBalanceDetails && newShippingState;
                        setShowAllDetails(allVisible);
                      }}
                      className="mt-2 flex items-center text-xs text-orange-600 hover:text-orange-800 transition-colors"
                    >
                      {showShippingDetails ? (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          상세 숨기기
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-3 h-3 mr-1" />
                          상세 보기
                        </>
                      )}
                    </button>
                  )}
                </div>
              </td>
              <td className="px-6 py-2 whitespace-nowrap text-center border border-gray-300">
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold text-gray-900">
                    ¥{totalPaymentSchedule.toLocaleString()} CNY
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    {totalPaymentSchedule > 0 ? '전체 지급 예정' : '지급 예정 없음'}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* 추가 정보 표시 */}
      {totalPaymentSchedule > 0 && (
        <div className="px-6 py-3 bg-blue-50 border-t border-gray-200">
          <div className="text-sm text-blue-800">
            <strong>💡 지급 예정 정보:</strong> 
            선금 {advancePaymentSchedule > 0 ? `¥${advancePaymentSchedule.toLocaleString()} CNY` : '0 CNY'}, 
            잔금 {balancePaymentSchedule > 0 ? `¥${balancePaymentSchedule.toLocaleString()} CNY` : '0 CNY'}, 
            배송비 {shippingPaymentSchedule > 0 ? `¥${shippingPaymentSchedule.toLocaleString()} CNY` : '0 CNY'} 
            총 {totalPaymentSchedule.toLocaleString()} CNY의 지급이 예정되어 있습니다.
          </div>
        </div>
      )}
      
      {/* 지급 요청 목록 표시 */}
      {showPaymentRequests && (
        <div className="p-6">
          <PaymentRequestList />
        </div>
      )}

      {/* 상세 목록 표시 */}
      <div className="space-y-4 p-6">
        {showAdvanceDetails && <AdvancePaymentDetails data={advancePaymentData} />}
        {showBalanceDetails && <BalancePaymentDetails data={balancePaymentData} />}
        {showShippingDetails && <ShippingPaymentDetails data={shippingPaymentData} />}
      </div>
    </div>
  );
};

export default FinancePaymentSchedule; 