import React from 'react';
import { 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Package,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle
} from 'lucide-react';
import StatusChip from './StatusChip';
import QuantityDisplay from './QuantityDisplay';

const InventoryTable = ({ 
  data, 
  loading, 
  pagination, 
  onPageChange, 
  onViewHistory,
  getStatusIcon 
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">재고 데이터가 없습니다</h3>
          <p className="text-gray-500">검색 조건을 변경하거나 필터를 조정해보세요.</p>
        </div>
      </div>
    );
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      onPageChange(newPage);
    }
  };

  const getPageNumbers = () => {
    const current = pagination.current_page;
    const total = pagination.total_pages;
    const pages = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 4; i <= total; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total);
      }
    }
    
    return pages;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 테이블 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            재고 현황 ({pagination.total.toLocaleString()}개 프로젝트)
          </h3>
          <div className="text-sm text-gray-500">
            {pagination.current_page} / {pagination.total_pages} 페이지
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                프로젝트명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                총 수량
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                중국 재고 수량
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                배송중
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                도착완료
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.project_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12">
                      {item.first_image ? (
                        <img
                          src={item.first_image.url}
                          alt={item.project_name || '프로젝트 이미지'}
                          className="h-12 w-12 object-contain rounded-lg border border-gray-200 bg-gray-50"
                          onError={(e) => {
                            // 이미지 로드 실패 시 대체 URL 시도
                            if (item.first_image.fallback_url) {
                              e.target.src = item.first_image.fallback_url;
                            } else if (item.first_image.stored_filename) {
                              const fallbackUrl = `/uploads/project/mj/registImage/${item.first_image.stored_filename}`;
                              e.target.src = fallbackUrl;
                            }
                            
                            // 대체 URL도 실패하면 기본 아이콘 표시
                            e.target.onerror = () => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            };
                          }}
                          onLoad={() => {
                            // 이미지 로드 성공
                          }}
                        />
                      ) : null}
                      <div 
                        className={`h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center ${item.first_image ? 'hidden' : 'flex'}`}
                        style={{ display: item.first_image ? 'none' : 'flex' }}
                      >
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.project_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {item.project_id}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusChip 
                    status={item.current_status}
                    icon={getStatusIcon(item.current_status)}
                  />
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <QuantityDisplay 
                    value={item.total_quantity}
                    color="text-gray-900"
                    fontWeight="font-semibold"
                  />
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <QuantityDisplay 
                    value={item.scheduled_entry_quantity}
                    color="text-gray-600"
                  />
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <QuantityDisplay 
                    value={item.shipping_quantity}
                    color="text-yellow-600"
                  />
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <QuantityDisplay 
                    value={item.arrived_quantity}
                    color="text-purple-600"
                  />
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => onViewHistory(item)}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    상세보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {pagination.total_pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              총 <span className="font-medium">{pagination.total.toLocaleString()}</span>개 중{' '}
              <span className="font-medium">
                {((pagination.current_page - 1) * pagination.per_page + 1).toLocaleString()}
              </span>
              -
              <span className="font-medium">
                {Math.min(pagination.current_page * pagination.per_page, pagination.total).toLocaleString()}
              </span>
              개 표시
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={pagination.current_page === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && handlePageChange(page)}
                  disabled={page === '...'}
                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                    page === pagination.current_page
                      ? 'bg-blue-600 text-white'
                      : page === '...'
                      ? 'text-gray-400 cursor-default'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.total_pages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => handlePageChange(pagination.total_pages)}
                disabled={pagination.current_page === pagination.total_pages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;


