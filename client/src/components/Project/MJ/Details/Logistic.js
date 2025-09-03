import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  Warehouse, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Clock
} from 'lucide-react';

const Logistic = ({ project }) => {
  const [logisticData, setLogisticData] = useState({
    orderQuantity: 0,
    entryHistory: [],
    exportHistory: [],
    remainingEntry: 0,
    remainingExport: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (project) {
      fetchLogisticData();
    }
  }, [project]);

  const fetchLogisticData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // 프로젝트의 물류 데이터 조회
      const response = await fetch(`/api/mj-project/${project.id}/logistic`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('물류 정보를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      
      if (data.success) {
        setLogisticData(data.logisticData);
      } else {
        setError(data.message || '물류 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('물류 정보 조회 오류:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">물류 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto mb-4 text-red-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">오류 발생</h3>
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchLogisticData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 요약 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 발주 수량 */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">발주 수량</p>
              <p className="text-2xl font-bold text-blue-900">{logisticData.orderQuantity.toLocaleString()}개</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* 남은 입고 수량 */}
        <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">남은 입고 수량</p>
              <p className="text-2xl font-bold text-yellow-900">{logisticData.remainingEntry.toLocaleString()}개</p>
            </div>
            <Warehouse className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        {/* 남은 출고 수량 */}
        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">남은 출고 수량</p>
              <p className="text-2xl font-bold text-green-900">{logisticData.remainingExport.toLocaleString()}개</p>
            </div>
            <Truck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        {/* 진행률 */}
        <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">입고 진행률</p>
              <p className="text-2xl font-bold text-purple-900">
                {logisticData.orderQuantity > 0 
                  ? Math.round(((logisticData.orderQuantity - logisticData.remainingEntry) / logisticData.orderQuantity) * 100)
                  : 0}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* 입고 수량 히스토리 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Warehouse className="w-5 h-5 mr-2 text-yellow-600" />
            입고 수량 히스토리
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  입고일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  입고 수량
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  입고 상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logisticData.entryHistory.length > 0 ? (
                logisticData.entryHistory.map((entry, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(entry.entry_date).toLocaleDateString('ko-KR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.quantity.toLocaleString()}개
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        완료
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                    <Warehouse className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>입고 기록이 없습니다.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 출고 물량 히스토리 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Truck className="w-5 h-5 mr-2 text-green-600" />
            출고 물량 히스토리
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  출고일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  출고 수량
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  출고 상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logisticData.exportHistory.length > 0 ? (
                logisticData.exportHistory.map((exportItem, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        {new Date(exportItem.export_date).toLocaleDateString('ko-KR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {exportItem.quantity.toLocaleString()}개
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {exportItem.status === 'completed' ? '완료' : '진행중'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                    <Truck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>출고 기록이 없습니다.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
            상세 정보
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">프로젝트 정보</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">프로젝트명:</span>
                  <span className="text-sm font-medium text-gray-900">{project.project_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">목표 수량:</span>
                  <span className="text-sm font-medium text-gray-900">{project.quantity?.toLocaleString() || 0}개</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">현재 입고 수량:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {(logisticData.orderQuantity - logisticData.remainingEntry).toLocaleString()}개
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">물류 현황</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">입고 진행률:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {logisticData.orderQuantity > 0 
                      ? Math.round(((logisticData.orderQuantity - logisticData.remainingEntry) / logisticData.orderQuantity) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">출고 진행률:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {logisticData.orderQuantity > 0 
                      ? Math.round(((logisticData.orderQuantity - logisticData.remainingExport) / logisticData.orderQuantity) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">마지막 업데이트:</span>
                  <span className="text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-gray-400" />
                      {new Date().toLocaleDateString('ko-KR')}
                    </div>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logistic; 