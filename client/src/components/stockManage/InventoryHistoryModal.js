import React, { useState, useEffect } from 'react';
import { X, Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../utils/api';

const InventoryHistoryModal = ({ project, onClose }) => {
  const [entryHistory, setEntryHistory] = useState([]);
  const [exportHistory, setExportHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (project) {
      loadHistory();
    }
  }, [project]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest(`/api/inventory/project/${project.project_id}/history`);
      
      if (response.success) {
        setEntryHistory(response.entry_history || []);
        setExportHistory(response.export_history || []);
      } else {
        throw new Error(response.error || '히스토리 데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('히스토리 로드 오류:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case '입고중':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case '입고완료':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPaymentStatusIcon = (isPaid) => {
    return isPaid ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <Clock className="w-4 h-4 text-yellow-500" />
    );
  };

  if (!project) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {project.project_name} - 입출고 히스토리
            </h2>
            <p className="text-sm text-gray-500">프로젝트 ID: {project.project_id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">로딩 중...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 입고 히스토리 */}
              <div>
                <div className="flex items-center mb-4">
                  <Package className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">입고 히스토리</h3>
                  <span className="ml-2 text-sm text-gray-500">
                    ({entryHistory.length}건)
                  </span>
                </div>
                
                {entryHistory.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            수량
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            입고일
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            상태
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            등록일
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {entryHistory.map((entry, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {entry.quantity.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(entry.entry_date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {getStatusIcon(entry.status)}
                                <span className="ml-1">{entry.status}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(entry.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    입고 히스토리가 없습니다.
                  </div>
                )}
              </div>

              {/* 출고 히스토리 */}
              <div>
                <div className="flex items-center mb-4">
                  <Truck className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">출고 히스토리</h3>
                  <span className="ml-2 text-sm text-gray-500">
                    ({exportHistory.length}건)
                  </span>
                </div>
                
                {exportHistory.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            수량
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            출고일
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            포장코드
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            배송상태
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            송장번호
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            등록일
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {exportHistory.map((exportItem, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {exportItem.quantity.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(exportItem.export_date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {exportItem.packing_code || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {getPaymentStatusIcon(exportItem.is_paid)}
                                <span className="ml-1">
                                  {exportItem.is_paid ? '배송완료' : '배송중'}
                                </span>
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {exportItem.tracking_number || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(exportItem.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    출고 히스토리가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryHistoryModal;


