import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../../utils/api';

const useInventoryData = (initialFilters = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    projectId: '',
    status: '',
    search: '',
    page: 1,
    limit: 20,
    ...initialFilters
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

  // 재고 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      if (filters.projectId) queryParams.append('projectId', filters.projectId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      queryParams.append('page', filters.page);
      queryParams.append('limit', filters.limit);

      const response = await apiRequest(`/api/inventory/product-inventory-status?${queryParams}`);
      
      if (response.success) {
        setData(response.data);
        setPagination(response.pagination);
        setSummary(response.summary);
        return response;
      } else {
        throw new Error(response.error || '재고 데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('❌ 재고 데이터 로드 오류:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 필터 업데이트
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1 // 페이지가 명시되지 않으면 1로 리셋
    }));
  }, []);

  // 페이지 변경
  const changePage = useCallback((newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  }, []);

  // 필터 초기화
  const resetFilters = useCallback(() => {
    setFilters({
      projectId: '',
      status: '',
      search: '',
      page: 1,
      limit: 20
    });
  }, []);

  // 데이터 새로고침
  const refresh = useCallback(() => {
    return loadData();
  }, [loadData]);

  // 초기 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // 데이터
    data,
    loading,
    error,
    pagination,
    summary,
    filters,
    
    // 액션
    updateFilters,
    changePage,
    resetFilters,
    refresh,
    loadData
  };
};

export default useInventoryData;



