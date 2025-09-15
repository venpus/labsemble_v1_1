import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../utils/api';
import InventorySummary from './InventorySummary';
import InventoryFilter from './InventoryFilter';
import InventoryTable from './InventoryTable';
import InventoryHistoryModal from './InventoryHistoryModal';
import { 
  Warehouse, 
  RefreshCw, 
  Download, 
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Truck,
  Package
} from 'lucide-react';

const InventoryManagement = () => {
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
    current_page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0
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

  // 재고 데이터 로드 (메모이제이션)
  const loadInventoryData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 재고 데이터 로드 시작...', { filters });
      
      const queryParams = new URLSearchParams();
      if (filters.projectId) queryParams.append('projectId', filters.projectId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      queryParams.append('page', filters.page);
      queryParams.append('limit', filters.limit);

      const url = `/api/inventory/product-inventory-status?${queryParams}`;
      console.log('📡 API 요청 URL:', url);

      const response = await apiRequest(url);
      console.log('📥 API 응답 (raw):', response);
      
      // 응답이 이미 JSON 객체인지 확인
      let data;
      if (typeof response === 'object' && response.success !== undefined) {
        // 이미 파싱된 객체
        data = response;
        console.log('📥 API 응답 (이미 파싱됨):', data);
      } else {
        // Response 객체이므로 JSON 파싱 필요
        data = await response.json();
        console.log('📥 API 응답 (JSON 파싱됨):', data);
      }
      
      if (data && data.success) {
        // 데이터 타입 변환 (문자열을 숫자로)
        const processedData = (data.data || []).map(item => ({
          ...item,
          scheduled_entry_quantity: parseInt(item.scheduled_entry_quantity) || 0,
          completed_entry_quantity: parseInt(item.completed_entry_quantity) || 0,
          shipping_quantity: parseInt(item.shipping_quantity) || 0,
          arrived_quantity: parseInt(item.arrived_quantity) || 0,
          total_quantity: parseInt(item.total_quantity) || 0,
          entry_quantity: parseInt(item.entry_quantity) || 0,
          export_quantity: parseInt(item.export_quantity) || 0,
          remain_quantity: parseInt(item.remain_quantity) || 0
        }));
        
        setInventoryData(processedData);
        setPagination(data.pagination || {
          current_page: 1,
          per_page: 20,
          total: 0,
          total_pages: 0
        });
        setSummary(data.summary || {
          total_projects: 0,
          status_counts: {
            입고예정: 0,
            입고중: 0,
            입고완료: 0,
            배송중: 0,
            도착완료: 0
          }
        });
        console.log('✅ 재고 데이터 로드 완료:', { processedData, pagination: data.pagination, summary: data.summary });
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

  // 필터 변경 시 데이터 로드
  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // 필터 변경 핸들러
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // 필터 변경 시 첫 페이지로 이동
    }));
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  // 새로고침 핸들러
  const handleRefresh = () => {
    loadInventoryData();
  };

  // 프로젝트 히스토리 모달 열기
  const handleViewHistory = (project) => {
    setSelectedProject(project);
    setShowHistoryModal(true);
  };

  // CSV 내보내기 (향후 구현)
  const handleExport = () => {
    console.log('CSV 내보내기 기능은 향후 구현 예정입니다.');
  };

  // 상태별 아이콘 매핑
  const getStatusIcon = (status) => {
    switch (status) {
      case '입고예정':
        return <Clock className="w-4 h-4" />;
      case '입고중':
        return <Package className="w-4 h-4" />;
      case '입고완료':
        return <CheckCircle className="w-4 h-4" />;
      case '배송중':
        return <Truck className="w-4 h-4" />;
      case '도착완료':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // 디버깅 정보 (렌더링 최적화)
  const debugInfo = useMemo(() => ({
    loading,
    error,
    inventoryDataLength: inventoryData.length,
    filters,
    user: user?.username
  }), [loading, error, inventoryData.length, filters, user?.username]);
  
  console.log('🔍 InventoryManagement 렌더링 상태:', debugInfo);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Warehouse className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">재고조회</h1>
              <p className="text-sm text-gray-600">제품별 입출고 기록 및 재고 현황</p>
              {user && (
                <p className="text-xs text-gray-500">사용자: {user.username} ({user.isAdmin ? '관리자' : '일반'})</p>
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

      {/* 요약 정보 */}
      <InventorySummary 
        summary={summary}
        loading={loading}
      />

      {/* 필터 */}
      <InventoryFilter 
        filters={filters}
        onFilterChange={handleFilterChange}
        loading={loading}
      />

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* 재고 테이블 */}
      <InventoryTable 
        data={inventoryData}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onViewHistory={handleViewHistory}
        getStatusIcon={getStatusIcon}
      />

      {/* 히스토리 모달 */}
      {showHistoryModal && selectedProject && (
        <InventoryHistoryModal
          project={selectedProject}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
      </div>
    </div>
  );
};

export default InventoryManagement;

