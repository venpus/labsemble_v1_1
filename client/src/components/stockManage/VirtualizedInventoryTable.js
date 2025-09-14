import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { 
  Eye, 
  Package,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight
} from 'lucide-react';
import StatusChip from './StatusChip';
import QuantityDisplay from './QuantityDisplay';

const VirtualizedInventoryTable = ({ 
  data, 
  loading, 
  pagination, 
  onPageChange, 
  onViewHistory,
  getStatusIcon,
  onLoadMore // 무한 스크롤용
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allData, setAllData] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  // 데이터 병합 (페이지네이션 + 무한 스크롤)
  useEffect(() => {
    if (data) {
      if (pagination.currentPage === 1) {
        // 첫 페이지인 경우 데이터 교체
        setAllData(data);
      } else {
        // 추가 페이지인 경우 데이터 추가
        setAllData(prev => [...prev, ...data]);
      }
      
      // 더 이상 로드할 데이터가 없는지 확인
      setHasMore(pagination.currentPage < pagination.totalPages);
    }
  }, [data, pagination]);

  // 가상화된 행 컴포넌트
  const Row = useCallback(({ index, style }) => {
    const item = allData[index];
    if (!item) return null;

    return (
      <div style={style} className="flex items-center border-b border-gray-200 hover:bg-gray-50">
        <div className="flex-1 px-6 py-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
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
        </div>
        
        <div className="w-32 px-6 py-4">
          <StatusChip 
            status={item.current_status}
            icon={getStatusIcon(item.current_status)}
          />
        </div>
        
        <div className="w-24 px-6 py-4 text-center">
          <QuantityDisplay 
            value={item.total_quantity}
            color="text-gray-900"
            fontWeight="font-semibold"
          />
        </div>
        
        <div className="w-24 px-6 py-4 text-center">
          <QuantityDisplay 
            value={item.scheduled_entry_quantity}
            color="text-gray-600"
          />
        </div>
        
        <div className="w-24 px-6 py-4 text-center">
          <QuantityDisplay 
            value={item.completed_entry_quantity}
            color="text-green-600"
          />
        </div>
        
        <div className="w-24 px-6 py-4 text-center">
          <QuantityDisplay 
            value={item.shipping_quantity}
            color="text-yellow-600"
          />
        </div>
        
        <div className="w-24 px-6 py-4 text-center">
          <QuantityDisplay 
            value={item.delivered_quantity}
            color="text-purple-600"
          />
        </div>
        
        <div className="w-32 px-6 py-4 text-center">
          <button
            onClick={() => onViewHistory(item)}
            className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4 mr-1" />
            상세보기
          </button>
        </div>
      </div>
    );
  }, [allData, getStatusIcon, onViewHistory]);

  // 무한 스크롤 핸들러
  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
    if (!scrollUpdateWasRequested && hasMore && !isLoadingMore) {
      const { scrollTop, scrollHeight, clientHeight } = document.querySelector('.virtual-list');
      
      // 스크롤이 하단 근처에 도달했을 때
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        setIsLoadingMore(true);
        onLoadMore(pagination.currentPage + 1).finally(() => {
          setIsLoadingMore(false);
        });
      }
    }
  }, [hasMore, isLoadingMore, onLoadMore, pagination.currentPage]);

  // 로딩 상태
  if (loading && allData.length === 0) {
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

  // 데이터 없음
  if (!allData || allData.length === 0) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 테이블 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            재고 현황 ({pagination.total.toLocaleString()}개 프로젝트)
          </h3>
          <div className="text-sm text-gray-500">
            {pagination.currentPage} / {pagination.totalPages} 페이지
          </div>
        </div>
      </div>

      {/* 가상화된 테이블 헤더 */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="flex-1 px-6 py-3">프로젝트명</div>
          <div className="w-32 px-6 py-3">상태</div>
          <div className="w-24 px-6 py-3 text-center">총 수량</div>
          <div className="w-24 px-6 py-3 text-center">입고예정</div>
          <div className="w-24 px-6 py-3 text-center">입고완료</div>
          <div className="w-24 px-6 py-3 text-center">배송중</div>
          <div className="w-24 px-6 py-3 text-center">도착완료</div>
          <div className="w-32 px-6 py-3 text-center">작업</div>
        </div>
      </div>

      {/* 가상화된 리스트 */}
      <div className="virtual-list" style={{ height: '600px' }}>
        <List
          height={600}
          itemCount={allData.length}
          itemSize={80}
          onScroll={handleScroll}
        >
          {Row}
        </List>
      </div>

      {/* 로딩 인디케이터 */}
      {isLoadingMore && (
        <div className="px-6 py-4 border-t border-gray-200 text-center">
          <div className="inline-flex items-center text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            추가 데이터 로딩 중...
          </div>
        </div>
      )}

      {/* 페이지네이션 (기존 방식도 유지) */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              총 <span className="font-medium">{pagination.total.toLocaleString()}</span>개 중{' '}
              <span className="font-medium">
                {((pagination.currentPage - 1) * pagination.per_page + 1).toLocaleString()}
              </span>
              -
              <span className="font-medium">
                {Math.min(pagination.currentPage * pagination.per_page, pagination.total).toLocaleString()}
              </span>
              개 표시
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onPageChange(1)}
                disabled={pagination.currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="px-3 py-2 text-sm text-gray-700">
                {pagination.currentPage} / {pagination.totalPages}
              </span>
              
              <button
                onClick={() => onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => onPageChange(pagination.totalPages)}
                disabled={pagination.currentPage === pagination.totalPages}
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

export default VirtualizedInventoryTable;
