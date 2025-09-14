import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../utils/api';
import useInventoryWebSocket from '../../hooks/useInventoryWebSocket';
import InventorySummary from './InventorySummary';
import InventoryFilter from './InventoryFilter';
import VirtualizedInventoryTable from './VirtualizedInventoryTable';
import InventoryHistoryModal from './InventoryHistoryModal';
import { 
  Warehouse, 
  RefreshCw, 
  Download, 
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

const InventoryManagementOptimized = () => {
  const { user } = useAuth();
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    projectId: '',
    status: '',
    search: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    total: 0,
    limit: 20
  });
  const [summary, setSummary] = useState({
    total_projects: 0,
    status_counts: {
      입고예정: 0,
      입고중: 0,
      입고완료: 0,
      배송중: 0,
      도착완료: 0
    }
  });
  const [selectedProject, setSelectedProject] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // WebSocket 연결
  const { isConnected, connectionError, sendMessage } = useInventoryWebSocket(
    useCallback((data) => {
      console.log('📊 [WebSocket] 재고 업데이트 수신:', data);
      
      // 실시간 업데이트에 따른 데이터 갱신
      if (data.type === 'inventory_update' || data.type === 'project_inventory_update') {
        // 캐시된 데이터 무효화 및 새로고침
        loadInventoryData(true);
      }
    }, [])
  );

  // 메모이제이션된 API 요청 함수
  const loadInventoryData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 재고 데이터 로드 시작...', { filters, forceRefresh });
      
      const queryParams = new URLSearchParams();
      if (filters.projectId) queryParams.append('projectId', filters.projectId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      queryParams.append('page', filters.page);
      queryParams.append('limit', filters.limit);
      queryParams.append('sortBy', 'project_name');
      queryParams.append('sortOrder', 'ASC');

      // 최적화된 API 사용
      const url = `/api/inventory/product-inventory-status-optimized?${queryParams}`;
      console.log('📡 API 요청 URL:', url);

      const response = await apiRequest(url);
      const data = typeof response === 'object' ? response : await response.json();
      
      if (data && data.success) {
        // 데이터 타입 변환
        const processedData = (data.data || []).map(item => ({
          ...item,
          scheduled_entry_quantity: parseInt(item.scheduled_entry_quantity) || 0,
          completed_entry_quantity: parseInt(item.completed_entry_quantity) || 0,
          shipping_quantity: parseInt(item.shipping_quantity) || 0,
          delivered_quantity: parseInt(item.delivered_quantity) || 0,
          total_quantity: parseInt(item.total_quantity) || 0,
          entry_quantity: parseInt(item.entry_quantity) || 0,
          export_quantity: parseInt(item.export_quantity) || 0,
          remain_quantity: parseInt(item.remain_quantity) || 0
        }));
        
        setInventoryData(processedData);
        setPagination(data.pagination || {});
        setSummary(data.summary || {});
        console.log('✅ 재고 데이터 로드 완료:', { 
          processedData: processedData.length, 
          pagination: data.pagination 
        });
      } else {
        throw new Error(data?.error || '재고 데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('❌ 재고 데이터 로드 오류:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 무한 스크롤용 데이터 로드
  const loadMoreData = useCallback(async (page) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.projectId) queryParams.append('projectId', filters.projectId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      queryParams.append('page', page);
      queryParams.append('limit', filters.limit);
      queryParams.append('sortBy', 'project_name');
      queryParams.append('sortOrder', 'ASC');

      const url = `/api/inventory/product-inventory-status-optimized?${queryParams}`;
      const response = await apiRequest(url);
      const data = typeof response === 'object' ? response : await response.json();
      
      if (data && data.success) {
        const processedData = (data.data || []).map(item => ({
          ...item,
          scheduled_entry_quantity: parseInt(item.scheduled_entry_quantity) || 0,
          completed_entry_quantity: parseInt(item.completed_entry_quantity) || 0,
          shipping_quantity: parseInt(item.shipping_quantity) || 0,
          delivered_quantity: parseInt(item.delivered_quantity) || 0,
          total_quantity: parseInt(item.total_quantity) || 0,
          entry_quantity: parseInt(item.entry_quantity) || 0,
          export_quantity: parseInt(item.export_quantity) || 0,
          remain_quantity: parseInt(item.remain_quantity) || 0
        }));
        
        return {
          data: processedData,
          pagination: data.pagination || {}
        };
      }
      throw new Error(data?.error || '추가 데이터를 불러오는데 실패했습니다.');
    } catch (err) {
      console.error('❌ 추가 데이터 로드 오류:', err);
      throw err;
    }
  }, [filters]);

  // 초기 로드
  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // 필터 변경 핸들러 (디바운싱 적용)
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // 필터 변경 시 첫 페이지로 이동
    }));
  }, []);

  // 페이지 변경 핸들러
  const handlePageChange = useCallback((newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  }, []);

  // 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    loadInventoryData(true);
  }, [loadInventoryData]);

  // 프로젝트 히스토리 모달 열기
  const handleViewHistory = useCallback((project) => {
    setSelectedProject(project);
    setShowHistoryModal(true);
  }, []);

  // CSV 내보내기
  const handleExport = useCallback(() => {
    console.log('CSV 내보내기 기능은 향후 구현 예정입니다.');
  }, []);

  // 상태별 아이콘 매핑 (메모이제이션)
  const getStatusIcon = useCallback((status) => {
    const iconMap = {
      '입고예정': <Clock className="w-4 h-4" />,
      '입고중': <Package className="w-4 h-4" />,
      '입고완료': <CheckCircle className="w-4 h-4" />,
      '배송중': <Truck className="w-4 h-4" />,
      '도착완료': <AlertCircle className="w-4 h-4" />
    };
    return iconMap[status] || <Clock className="w-4 h-4" />;
  }, []);

  // 메모이제이션된 컴포넌트 props
  const tableProps = useMemo(() => ({
    data: inventoryData,
    loading,
    pagination,
    onPageChange: handlePageChange,
    onViewHistory: handleViewHistory,
    getStatusIcon,
    onLoadMore: loadMoreData
  }), [inventoryData, loading, pagination, handlePageChange, handleViewHistory, getStatusIcon, loadMoreData]);

  const filterProps = useMemo(() => ({
    filters,
    onFilterChange: handleFilterChange,
    loading
  }), [filters, handleFilterChange, loading]);

  const summaryProps = useMemo(() => ({
    summary,
    loading
  }), [summary, loading]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Warehouse className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">재고조회 (최적화)</h1>
              <p className="text-sm text-gray-600">제품별 입출고 기록 및 재고 현황</p>
              {user && (
                <p className="text-xs text-gray-500">
                  사용자: {user.username} ({user.isAdmin ? '관리자' : '일반'})
                  {isConnected ? (
                    <span className="ml-2 text-green-600 flex items-center">
                      <Wifi className="w-3 h-3 mr-1" />
                      실시간 연결됨
                    </span>
                  ) : (
                    <span className="ml-2 text-red-600 flex items-center">
                      <WifiOff className="w-3 h-3 mr-1" />
                      연결 끊김
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Download className="w-4 h-4 mr-2" />
              내보내기
            </button>
          </div>
        </div>
      </div>

      {/* 실시간 연결 상태 */}
      {connectionError && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <WifiOff className="w-5 h-5 text-yellow-500 mr-2" />
            <span className="text-yellow-700">{connectionError}</span>
          </div>
        </div>
      )}

      {/* 요약 정보 */}
      <InventorySummary {...summaryProps} />

      {/* 필터 */}
      <InventoryFilter {...filterProps} />

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* 가상화된 재고 테이블 */}
      <VirtualizedInventoryTable {...tableProps} />

      {/* 히스토리 모달 */}
      {showHistoryModal && selectedProject && (
        <InventoryHistoryModal
          project={selectedProject}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
};

export default InventoryManagementOptimized;
