import React from 'react';
import { Building2, CreditCard, Calendar, CheckCircle, Save } from 'lucide-react';

const PaymentToSupplier = ({ isAdmin, isAdminLoading, project, onDataChange }) => {
  // 초기 데이터 (원본 데이터)
  const initialPaymentData = {
    advance: { isPaid: false, amount: 0, paymentDate: '' },
    interim1: { isPaid: false, amount: 0, paymentDate: '' },
    interim2: { isPaid: false, amount: 0, paymentDate: '' },
    interim3: { isPaid: false, amount: 0, paymentDate: '' },
    balance: { isPaid: false, amount: 0, paymentDate: '' }
  };

  // 현재 상태
  const [paymentData, setPaymentData] = React.useState(initialPaymentData);
  const [isSaving, setIsSaving] = React.useState(false);

  // 컴포넌트 마운트 시 기존 데이터 로드
  React.useEffect(() => {
    const loadPaymentData = async () => {
      if (!project?.id) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/mj-project/${project.id}/payment-to-supplier`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setPaymentData(result.data);
          }
        }
      } catch (error) {
        console.error('결제 데이터 로드 오류:', error);
      }
    };

    loadPaymentData();
  }, [project?.id]);

  // 부모 컴포넌트에 변경사항 알림 (항상 false로 설정)
  React.useEffect(() => {
    if (onDataChange) {
      onDataChange(false);
    }
  }, [onDataChange]);

  // 저장 함수
  const handleSave = async () => {
    if (!isAdmin || isSaving || !project?.id) return;
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/mj-project/${project.id}/payment-to-supplier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentData: paymentData
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // 저장 성공
          alert('결제 정보가 성공적으로 저장되었습니다.');
        } else {
          throw new Error(result.message || '저장에 실패했습니다.');
        }
      } else {
        throw new Error('서버 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('저장 오류:', error);
      alert(`저장 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 결제 여부 변경 핸들러
  const handlePaymentChange = (type) => {
    if (!isAdmin) return;
    
    const newIsPaid = !paymentData[type].isPaid;
    const today = new Date().toISOString().split('T')[0];
    
    setPaymentData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        isPaid: newIsPaid,
        paymentDate: newIsPaid ? today : ''
      }
    }));
  };

  // 금액 변경 핸들러
  const handleAmountChange = (type, amount) => {
    if (!isAdmin) return;
    
    setPaymentData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        amount: Number(amount) || 0
      }
    }));
  };

  // 결제일 변경 핸들러
  const handlePaymentDateChange = (type, date) => {
    if (!isAdmin) return;
    
    setPaymentData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        paymentDate: date
      }
    }));
  };

  const paymentTypes = [
    { key: 'advance', label: '선금결제', icon: Building2, color: 'blue', required: true },
    { key: 'interim1', label: '중도금결제1', icon: CreditCard, color: 'purple', required: false },
    { key: 'interim2', label: '중도금결제2', icon: CreditCard, color: 'indigo', required: false },
    { key: 'interim3', label: '중도금결제3', icon: CreditCard, color: 'violet', required: false },
    { key: 'balance', label: '잔금결제', icon: CheckCircle, color: 'green', required: false }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        icon: 'text-blue-600',
        input: 'border-blue-300 focus:ring-blue-500 focus:border-blue-500',
        checkbox: 'text-blue-600 focus:ring-blue-500'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-900',
        icon: 'text-purple-600',
        input: 'border-purple-300 focus:ring-purple-500 focus:border-purple-500',
        checkbox: 'text-purple-600 focus:ring-purple-500'
      },
      indigo: {
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        text: 'text-indigo-900',
        icon: 'text-indigo-600',
        input: 'border-indigo-300 focus:ring-indigo-500 focus:border-indigo-500',
        checkbox: 'text-indigo-600 focus:ring-indigo-500'
      },
      violet: {
        bg: 'bg-violet-50',
        border: 'border-violet-200',
        text: 'text-violet-900',
        icon: 'text-violet-600',
        input: 'border-violet-300 focus:ring-violet-500 focus:border-violet-500',
        checkbox: 'text-violet-600 focus:ring-violet-500'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-900',
        icon: 'text-green-600',
        input: 'border-green-300 focus:ring-green-500 focus:border-green-500',
        checkbox: 'text-green-600 focus:ring-green-500'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  // 총계 계산 (단가 × 수량)
  const unitPrice = Number(project?.unit_price) || 0;
  const quantity = Number(project?.quantity) || 0;
  const subtotal = unitPrice * quantity;
  
  // 공장배송비 추가
  const factoryShippingCost = Number(project?.factory_shipping_cost) || 0;
  const totalWithShipping = subtotal + factoryShippingCost;

  // 결제 진행률 계산 (총계 대비 결제된 금액)
  const totalPaidAmount = Object.values(paymentData)
    .filter(item => item.isPaid)
    .reduce((sum, item) => sum + item.amount, 0);
  const requiredPaidAmount = paymentTypes
    .filter(type => type.required && paymentData[type.key].isPaid)
    .reduce((sum, type) => sum + paymentData[type.key].amount, 0);
  const totalRequiredAmount = paymentTypes
    .filter(type => type.required)
    .reduce((sum, type) => sum + paymentData[type.key].amount, 0);
  
  const progressPercentage = totalWithShipping > 0 ? Math.round((totalPaidAmount / totalWithShipping) * 100) : 0;
  const requiredProgressPercentage = totalRequiredAmount > 0 ? Math.round((requiredPaidAmount / totalRequiredAmount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 상단 카드들 */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* 비용 정보 요약 카드 */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 p-3 flex-1 max-w-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-blue-600" />
              <div>
                <h4 className="text-xs font-medium text-gray-900">비용 정보 요약</h4>
                <p className="text-xs text-gray-600">총계 + 공장배송비</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600">
                ¥{subtotal.toLocaleString()} + ¥{factoryShippingCost.toLocaleString()}
              </div>
              <div className="text-sm font-bold text-blue-900">
                = ¥{totalWithShipping.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 결제 진행률 카드 */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200 p-3 flex-1 max-w-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-orange-600" />
              <div>
                <h4 className="text-xs font-medium text-gray-900">결제 진행률</h4>
                <p className="text-xs text-gray-600">금액 기준</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600">
                ¥{totalPaidAmount.toLocaleString()} / ¥{totalWithShipping.toLocaleString()}
              </div>
              <div className="text-sm font-bold text-orange-900">
                {progressPercentage}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 업체결제 정보 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">업체결제 정보</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                업체에 대한 결제 내역을 관리합니다. (선금결제는 필수, 나머지는 선택사항)
              </p>
            </div>
            
            {/* 저장 버튼 */}
            {isAdmin && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  !isSaving
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? '저장 중...' : '저장'}
              </button>
            )}
          </div>
        </div>

      {/* 권한 안내 */}
      {!isAdminLoading && !isAdmin && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center">
            <div className="w-4 h-4 mr-2 text-yellow-600">🔒</div>
            <span className="text-sm text-yellow-800">
              업체결제 정보 수정은 admin 권한이 필요합니다. 현재 읽기 전용 모드입니다.
            </span>
          </div>
        </div>
      )}

      {/* 결제 테이블 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                결제 유형
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                결제 여부
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                금액
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                결제일
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paymentTypes.map((paymentType) => {
              const colors = getColorClasses(paymentType.color);
              const IconComponent = paymentType.icon;
              const data = paymentData[paymentType.key];

              return (
                <tr key={paymentType.key} className={`${colors.bg} hover:bg-opacity-80 transition-colors`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <IconComponent className={`w-5 h-5 mr-3 ${colors.icon}`} />
                      <span className={`text-sm font-medium ${colors.text}`}>
                        {paymentType.label}
                      </span>
                      {paymentType.required && (
                        <span className="ml-2 px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                          필수
                        </span>
                      )}
                      {!paymentType.required && (
                        <span className="ml-2 px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">
                          선택
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={data.isPaid}
                        onChange={() => handlePaymentChange(paymentType.key)}
                        disabled={!isAdmin || isAdminLoading}
                        className={`w-4 h-4 ${colors.checkbox} bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-offset-2 ${
                          !isAdmin || isAdminLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      />
                      <span className={`ml-2 text-sm ${colors.text}`}>
                        {data.isPaid ? '결제완료' : '미결제'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {!isAdminLoading && isAdmin ? (
                      <input
                        type="number"
                        value={data.amount}
                        onChange={(e) => handleAmountChange(paymentType.key, e.target.value)}
                        className={`w-32 px-3 py-2 text-sm border rounded-md bg-white ${colors.text} placeholder-gray-500 focus:outline-none focus:ring-2 ${colors.input} transition-all duration-200`}
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    ) : !isAdminLoading ? (
                      <span className={`text-sm font-semibold ${colors.text}`}>
                        ¥{data.amount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">권한 확인 중...</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {data.isPaid ? (
                      <div className="flex items-center">
                        <Calendar className={`w-4 h-4 mr-2 ${colors.icon}`} />
                        {!isAdminLoading && isAdmin ? (
                          <input
                            type="date"
                            value={data.paymentDate}
                            onChange={(e) => handlePaymentDateChange(paymentType.key, e.target.value)}
                            className={`px-3 py-1 text-sm border rounded-md bg-white ${colors.text} focus:outline-none focus:ring-2 ${colors.input} transition-all duration-200`}
                          />
                        ) : (
                          <span className={`text-sm font-medium ${colors.text}`}>
                            {data.paymentDate}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 요약 정보 */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700">총 결제 금액:</span>
            <span className="ml-2 text-lg font-bold text-gray-900">
              ¥{Object.values(paymentData).reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700">필수 결제 완료:</span>
            <span className="ml-2 text-sm font-semibold text-red-600">
              {paymentTypes.filter(type => type.required && paymentData[type.key].isPaid).length} / {paymentTypes.filter(type => type.required).length}건
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700">전체 결제 완료:</span>
            <span className="ml-2 text-sm font-semibold text-green-600">
              {Object.values(paymentData).filter(item => item.isPaid).length} / {paymentTypes.length}건
            </span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default PaymentToSupplier;
