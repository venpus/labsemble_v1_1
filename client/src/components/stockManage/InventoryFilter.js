import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { apiRequest } from '../../utils/api';

const InventoryFilter = ({ filters, onFilterChange, loading }) => {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 프로젝트 목록 로드
  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await apiRequest('/api/mj-project?page=1&limit=1000');
      if (response.success) {
        setProjects(response.data || []);
      }
    } catch (error) {
      console.error('프로젝트 목록 로드 오류:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleInputChange = (field, value) => {
    onFilterChange({ [field]: value });
  };

  const handleClearFilters = () => {
    onFilterChange({
      projectId: '',
      status: '',
      search: ''
    });
  };

  const statusOptions = [
    { value: '', label: '전체 상태' },
    { value: '입고예정', label: '입고예정' },
    { value: '입고중', label: '입고중' },
    { value: '입고완료', label: '입고완료' },
    { value: '배송중', label: '배송중' },
    { value: '도착완료', label: '도착완료' }
  ];

  const hasActiveFilters = filters.projectId || filters.status || filters.search;

  return (
    <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">필터</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              <X className="w-4 h-4 mr-1" />
              필터 초기화
            </button>
          )}
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
          >
            {showAdvanced ? '간단히' : '상세히'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 검색 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            프로젝트 검색
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleInputChange('search', e.target.value)}
              placeholder="프로젝트명으로 검색..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        {/* 프로젝트 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            프로젝트 선택
          </label>
          <select
            value={filters.projectId}
            onChange={(e) => handleInputChange('projectId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading || loadingProjects}
          >
            <option value="">전체 프로젝트</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_name}
              </option>
            ))}
          </select>
        </div>

        {/* 상태 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            상태 선택
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 페이지 크기 (상세 모드에서만 표시) */}
        {showAdvanced && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              페이지 크기
            </label>
            <select
              value={filters.limit}
              onChange={(e) => handleInputChange('limit', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value={10}>10개씩</option>
              <option value={20}>20개씩</option>
              <option value={50}>50개씩</option>
              <option value={100}>100개씩</option>
            </select>
          </div>
        )}
      </div>

      {/* 활성 필터 표시 */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">활성 필터:</span>
            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                검색: {filters.search}
                <button
                  onClick={() => handleInputChange('search', '')}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.projectId && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                프로젝트: {projects.find(p => p.id === parseInt(filters.projectId))?.project_name || filters.projectId}
                <button
                  onClick={() => handleInputChange('projectId', '')}
                  className="ml-1 hover:text-green-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                상태: {filters.status}
                <button
                  onClick={() => handleInputChange('status', '')}
                  className="ml-1 hover:text-purple-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryFilter;

