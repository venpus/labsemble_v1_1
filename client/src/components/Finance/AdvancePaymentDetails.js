import React from 'react';
import { Calendar, DollarSign, Building, User, Image, Package, Tag } from 'lucide-react';

const AdvancePaymentDetails = ({ data = [] }) => {
  const advancePayments = Array.isArray(data) ? data : [];
  const loading = false;
  const error = null;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <h3 className="text-lg font-semibold text-red-800 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            선금 지급 예정 상세 목록
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
        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
          <h3 className="text-lg font-semibold text-red-800 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            선금 지급 예정 상세 목록
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center text-red-600">
            <p>오류가 발생했습니다: {error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
      <div className="px-6 py-4 bg-red-50 border-b border-red-200">
        <h3 className="text-lg font-semibold text-red-800 flex items-center">
          <DollarSign className="w-5 h-5 mr-2" />
          선금 지급 예정 상세 목록
          <span className="ml-2 text-sm font-normal text-red-600">
            ({advancePayments.length}건)
          </span>
        </h3>
      </div>
      
      {advancePayments.length === 0 ? (
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
              {advancePayments.map((payment, index) => (
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
                    <div className="text-sm font-bold text-red-600">
                      ¥{Number(payment.advance_payment || 0).toLocaleString()} CNY
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      {payment.created_at ? new Date(payment.created_at).toLocaleDateString('ko-KR') : '-'}
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

export default AdvancePaymentDetails;
