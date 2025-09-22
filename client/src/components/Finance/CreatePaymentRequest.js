import React, { useState, useEffect } from 'react';
import { Plus, X, Save, Calendar, DollarSign, Package, Truck, CheckCircle, Building, Tag, Percent, Image } from 'lucide-react';
import toast from 'react-hot-toast';

const CreatePaymentRequest = ({ onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('advance');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 미지급 항목 데이터
  const [unpaidAdvance, setUnpaidAdvance] = useState([]);
  const [unpaidBalance, setUnpaidBalance] = useState([]);
  const [unpaidShipping, setUnpaidShipping] = useState([]);
  
  // 선택된 항목들
  const [selectedAdvance, setSelectedAdvance] = useState(new Set());
  const [selectedBalance, setSelectedBalance] = useState(new Set());
  const [selectedShipping, setSelectedShipping] = useState(new Set());

  useEffect(() => {
    fetchUnpaidItems();
  }, []);

  const fetchUnpaidItems = async () => {
    setLoading(true);
    try {
      // 미지급 선금 조회
      const advanceResponse = await fetch('/api/finance/advance-payment-details', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (advanceResponse.ok) {
        const advanceData = await advanceResponse.json();
        if (advanceData.success) {
          setUnpaidAdvance(advanceData.data.advancePayments || []);
        }
      }

      // 미지급 잔금 조회
      const balanceResponse = await fetch('/api/finance/balance-payment-details', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        if (balanceData.success) {
          setUnpaidBalance(balanceData.data.balancePayments || []);
        }
      }

      // 미지급 배송비 조회
      const shippingResponse = await fetch('/api/logistic-payment/shipping-payment-details', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (shippingResponse.ok) {
        const shippingData = await shippingResponse.json();
        if (shippingData.success) {
          setUnpaidShipping(shippingData.data.shippingPayments || []);
        }
      }
    } catch (error) {
      console.error('미지급 항목 조회 오류:', error);
      toast.error('미지급 항목을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceSelect = (projectId) => {
    const newSelected = new Set(selectedAdvance);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedAdvance(newSelected);
  };

  const handleBalanceSelect = (projectId) => {
    const newSelected = new Set(selectedBalance);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedBalance(newSelected);
  };

  const handleShippingSelect = (shippingId) => {
    const newSelected = new Set(selectedShipping);
    if (newSelected.has(shippingId)) {
      newSelected.delete(shippingId);
    } else {
      newSelected.add(shippingId);
    }
    setSelectedShipping(newSelected);
  };

  const handleSelectAll = (type) => {
    if (type === 'advance') {
      if (selectedAdvance.size === unpaidAdvance.length) {
        setSelectedAdvance(new Set());
      } else {
        setSelectedAdvance(new Set(unpaidAdvance.map(item => item.project_id)));
      }
    } else if (type === 'balance') {
      if (selectedBalance.size === unpaidBalance.length) {
        setSelectedBalance(new Set());
      } else {
        setSelectedBalance(new Set(unpaidBalance.map(item => item.project_id)));
      }
    } else if (type === 'shipping') {
      if (selectedShipping.size === unpaidShipping.length) {
        setSelectedShipping(new Set());
      } else {
        setSelectedShipping(new Set(unpaidShipping.map(item => item.id)));
      }
    }
  };

  const handleCreateRequest = async () => {
    const advancePayments = unpaidAdvance
      .filter(item => selectedAdvance.has(item.project_id))
      .map(item => ({
        project_id: item.project_id,
        amount: item.advance_payment
      }));

    const balancePayments = unpaidBalance
      .filter(item => selectedBalance.has(item.project_id))
      .map(item => ({
        project_id: item.project_id,
        amount: item.balance_amount,
        fee_rate: item.fee_rate
      }));

    const shippingPayments = unpaidShipping
      .filter(item => selectedShipping.has(item.id))
      .map(item => ({
        pl_date: item.pl_date,
        box_count: item.total_boxes,
        total_logistic_fee: item.total_logistic_fee,
        packing_codes: item.packing_codes,
        logistic_companies: item.logistic_companies
      }));

    if (advancePayments.length === 0 && balancePayments.length === 0 && shippingPayments.length === 0) {
      toast.error('선택된 항목이 없습니다.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/payment-request/save-payment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          advancePayments,
          balancePayments,
          shippingPayments
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('지급 요청이 성공적으로 생성되었습니다!');
          onSuccess && onSuccess();
          onClose();
        } else {
          toast.error(data.message || '지급 요청 생성에 실패했습니다.');
        }
      } else {
        toast.error('지급 요청 생성 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('지급 요청 생성 오류:', error);
      toast.error('지급 요청 생성 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getTotalAmount = () => {
    let total = 0;
    
    // 선금 합계
    unpaidAdvance
      .filter(item => selectedAdvance.has(item.project_id))
      .forEach(item => total += Number(item.advance_payment || 0));
    
    // 잔금 합계
    unpaidBalance
      .filter(item => selectedBalance.has(item.project_id))
      .forEach(item => total += Number(item.balance_amount || 0));
    
    // 배송비 합계
    unpaidShipping
      .filter(item => selectedShipping.has(item.id))
      .forEach(item => total += Number(item.total_logistic_fee || 0));
    
    return total;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>미지급 항목을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">새로운 지급 요청 생성</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('advance')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'advance'
                  ? 'bg-red-100 text-red-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <DollarSign className="w-4 h-4 inline mr-2" />
              선금 ({selectedAdvance.size}/{unpaidAdvance.length})
            </button>
            <button
              onClick={() => setActiveTab('balance')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'balance'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <DollarSign className="w-4 h-4 inline mr-2" />
              잔금 ({selectedBalance.size}/{unpaidBalance.length})
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'shipping'
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Truck className="w-4 h-4 inline mr-2" />
              배송비 ({selectedShipping.size}/{unpaidShipping.length})
            </button>
          </div>
        </div>

        {/* 내용 */}
        <div className="p-6 overflow-y-auto max-h-96">
          {activeTab === 'advance' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">미지급 선금 목록</h3>
                <button
                  onClick={() => handleSelectAll('advance')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedAdvance.size === unpaidAdvance.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              {unpaidAdvance.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>미지급 선금이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unpaidAdvance.map((item) => (
                    <div
                      key={item.project_id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAdvance.has(item.project_id)
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleAdvanceSelect(item.project_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedAdvance.has(item.project_id)}
                            onChange={() => handleAdvanceSelect(item.project_id)}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <div className="flex items-center space-x-3">
                            {item.representative_image ? (
                              <img
                                src={`/api/warehouse/image/${item.representative_image}`}
                                alt={item.project_name}
                                className="w-12 h-12 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                                <Image className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{item.project_name}</div>
                              <div className="text-sm text-gray-500">
                                수량: {item.quantity}개 | 단가: ¥{Number(item.unit_price || 0).toLocaleString()} CNY
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-red-600">
                            {formatAmount(item.advance_payment)}
                          </div>
                          <div className="text-sm text-gray-500">선금</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'balance' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">미지급 잔금 목록</h3>
                <button
                  onClick={() => handleSelectAll('balance')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedBalance.size === unpaidBalance.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              {unpaidBalance.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>미지급 잔금이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unpaidBalance.map((item) => (
                    <div
                      key={item.project_id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedBalance.has(item.project_id)
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleBalanceSelect(item.project_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedBalance.has(item.project_id)}
                            onChange={() => handleBalanceSelect(item.project_id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-3">
                            {item.representative_image ? (
                              <img
                                src={`/api/warehouse/image/${item.representative_image}`}
                                alt={item.project_name}
                                className="w-12 h-12 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                                <Image className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{item.project_name}</div>
                              <div className="text-sm text-gray-500">
                                수량: {item.quantity}개 | 단가: ¥{Number(item.unit_price || 0).toLocaleString()} CNY
                                {item.fee_rate && ` | 수수료율: ${item.fee_rate}%`}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-600">
                            {formatAmount(item.balance_amount)}
                          </div>
                          <div className="text-sm text-gray-500">잔금</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'shipping' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">미지급 배송비 목록</h3>
                <button
                  onClick={() => handleSelectAll('shipping')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedShipping.size === unpaidShipping.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              {unpaidShipping.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>미지급 배송비가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unpaidShipping.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedShipping.has(item.id)
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleShippingSelect(item.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedShipping.has(item.id)}
                            onChange={() => handleShippingSelect(item.id)}
                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-orange-100 rounded border flex items-center justify-center">
                              <Truck className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                출고일: {item.pl_date || '미정'}
                              </div>
                              <div className="text-sm text-gray-500">
                                박스 수: {item.total_boxes}개 | 포장코드: {item.packing_codes}
                              </div>
                              <div className="text-sm text-gray-500">
                                물류회사: {item.logistic_companies}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-orange-600">
                            {formatAmount(item.total_logistic_fee)}
                          </div>
                          <div className="text-sm text-gray-500">배송비</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-900">
            총 선택 금액: {formatAmount(getTotalAmount())}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleCreateRequest}
              disabled={saving || getTotalAmount() === 0}
              className={`px-4 py-2 rounded-lg text-white ${
                saving || getTotalAmount() === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                  생성 중...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 inline mr-2" />
                  지급 요청 생성
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePaymentRequest;
