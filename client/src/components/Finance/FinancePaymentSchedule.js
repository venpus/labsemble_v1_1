import React from 'react';
import { Truck } from 'lucide-react';

const FinancePaymentSchedule = ({ 
  advancePaymentSchedule = 0,
  balancePaymentSchedule = 0,
  shippingPaymentSchedule = 0
}) => {
  // 총 지급 예정 금액 계산 (실제 데이터 사용)
  const totalPaymentSchedule = advancePaymentSchedule + balancePaymentSchedule + shippingPaymentSchedule;

  return (
    <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">금일까지 예정 지급 항목</h3>
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
    </div>
  );
};

export default FinancePaymentSchedule; 