import React from 'react';
import { Calendar, Truck, Package, MapPin } from 'lucide-react';

const ShippingPaymentDetails = ({ data = [] }) => {
  const shippingPayments = Array.isArray(data) ? data : [];
  const loading = false;
  const error = null;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-orange-50 border-b border-orange-200">
          <h3 className="text-lg font-semibold text-orange-800 flex items-center">
            <Truck className="w-5 h-5 mr-2" />
            배송비 지급 예정 상세 목록
          </h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-orange-50 border-b border-orange-200">
          <h3 className="text-lg font-semibold text-orange-800 flex items-center">
            <Truck className="w-5 h-5 mr-2" />
            배송비 지급 예정 상세 목록
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center text-red-600">
            <p>오류가 발생했습니다: {error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-orange-50 border-b border-orange-200">
        <h3 className="text-lg font-semibold text-orange-800 flex items-center">
          <Truck className="w-5 h-5 mr-2" />
          배송비 지급 예정 상세 목록
          <span className="ml-2 text-sm font-normal text-orange-600">
            ({shippingPayments.length}건)
          </span>
        </h3>
      </div>
      
      {shippingPayments.length === 0 ? (
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
              {shippingPayments.map((payment, index) => (
                <tr key={payment.pl_date || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="font-medium">
                        {payment.pl_date ? new Date(payment.pl_date).toLocaleDateString('ko-KR') : '날짜 미정'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-bold text-gray-900">
                        {payment.box_count}박스
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-orange-600">
                      ¥{Number(payment.total_logistic_fee || 0).toLocaleString()} CNY
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <div className="truncate" title={payment.packing_codes}>
                      {payment.packing_codes || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="truncate" title={payment.logistic_companies}>
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
  );
};

export default ShippingPaymentDetails;
