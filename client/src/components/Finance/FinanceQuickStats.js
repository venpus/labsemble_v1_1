import React from 'react';
import { TrendingUp, TrendingDown, Truck } from 'lucide-react';

const FinanceQuickStats = ({
  totalTransactionAmount = 0,
  totalAdvancePayment = 0,
  totalBalance = 0,
  totalShippingCost = 0,
  totalUnpaidAdvance = 0,
  totalUnpaidBalance = 0,
  totalUnpaidShippingCost = 0
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">재무 현황 요약</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* 첫 번째 헤더 */}
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                총 거래 금액
              </th>
              <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                총 선금
              </th>
              <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                총 잔금
              </th>
              <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                총 배송비
              </th>
            </tr>
          </thead>
          {/* 첫 번째 본문 */}
          <tbody className="bg-white">
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-2 whitespace-nowrap text-center border border-gray-300">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-green-600">
                    ¥{totalTransactionAmount.toLocaleString()} CNY
                  </span>
                </div>
              </td>
              <td className="px-6 py-2 whitespace-nowrap text-center border border-gray-300">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-red-600">
                    ¥{Number(totalAdvancePayment).toLocaleString()} CNY
                  </span>
                </div>
              </td>
              <td className="px-6 py-2 whitespace-nowrap text-center border border-gray-300">
                <div className="flex flex-col items-center">
                  <span className={`text-lg font-bold ${totalBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ¥{totalBalance.toLocaleString()} CNY
                  </span>
                </div>
              </td>
              <td className="px-6 py-2 whitespace-nowrap text-center border border-gray-300">
                <div className="flex flex-col items-center">
                  <div className="flex items-center">
                    <Truck className="w-5 h-5 text-orange-600 mr-2" />
                    <span className="text-lg font-bold text-orange-600">
                      ¥{totalShippingCost.toLocaleString()} CNY
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
          {/* 두 번째 헤더 */}
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                
              </th>
              <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                미지급 선금
              </th>
              <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                미지급 잔금
              </th>
              <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                미지급 배송비
              </th>
            </tr>
          </thead>
          {/* 두 번째 본문 */}
          <tbody className="bg-white">
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-2 whitespace-nowrap text-center border border-gray-300">
                <div className="flex flex-col items-center">
                  <span className="text-sm text-gray-500">-</span>
                </div>
              </td>
              <td className="px-6 py-2 whitespace-nowrap text-center border border-gray-300">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-red-600">
                    ¥{Number(totalUnpaidAdvance).toLocaleString()} CNY
                  </span>
                </div>
              </td>
              <td className="px-6 py-2 whitespace-nowrap text-center border border-gray-300">
                <div className="flex flex-col items-center">
                  <span className={`text-lg font-bold ${totalUnpaidBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ¥{Number(totalUnpaidBalance).toLocaleString()} CNY
                  </span>
                </div>
              </td>
              <td className="px-6 py-2 whitespace-nowrap text-center border border-gray-300">
                <div className="flex flex-col items-center">
                  <div className="flex items-center">
                    <Truck className="w-5 h-5 text-orange-600 mr-2" />
                    <span className="text-lg font-bold text-orange-600">
                      ¥{totalUnpaidShippingCost.toLocaleString()} CNY
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinanceQuickStats; 