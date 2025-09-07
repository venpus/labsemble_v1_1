import React from 'react';
import { Search, Filter, X } from 'lucide-react';

const ListSearch = ({ 
  searchTerm, 
  setSearchTerm, 
  filterOrderStatus, 
  setFilterOrderStatus, 
  filterShippingStatus, 
  setFilterShippingStatus, 
  filterWarehouseStatus, 
  setFilterWarehouseStatus,
  onSearch,
  onClearFilters,
  updateUrlParams
}) => {
  const orderStatusOptions = [
    { value: 'all', label: '전체' },
    { value: 'completed', label: '완료' },
    { value: 'waiting', label: '대기' }
  ];

  const shippingStatusOptions = [
    { value: 'all', label: '전체' },
    { value: '출고 완료', label: '출고 완료' },
    { value: '정시 출고', label: '정시 출고' },
    { value: '조기 출고', label: '조기 출고' },
    { value: '출고 연기', label: '출고 연기' },
    { value: '출고 대기', label: '출고 대기' },
    { value: '미설정', label: '미설정' }
  ];

  const warehouseStatusOptions = [
    { value: 'all', label: '전체' },
    { value: '입고완료', label: '입고완료' },
    { value: '입고중', label: '입고중' },
    { value: '입고 대기', label: '입고 대기' }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterOrderStatus('all');
    setFilterShippingStatus('all');
    setFilterWarehouseStatus('all');
    onClearFilters();
  };

  const hasActiveFilters = searchTerm || 
    filterOrderStatus !== 'all' || 
    filterShippingStatus !== 'all' || 
    filterWarehouseStatus !== 'all';

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Search className="w-5 h-5 mr-2 text-blue-600" />
          프로젝트 검색
        </h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4 mr-1" />
            필터 초기화
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        {/* 검색어 입력 */}
        <div>
          <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-2">
            프로젝트 검색
          </label>
          <div className="relative">
            <input
              type="text"
              id="searchTerm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (updateUrlParams) {
                  updateUrlParams({ search: e.target.value });
                }
              }}
              placeholder="프로젝트명 또는 공급자명을 입력하세요..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            프로젝트명과 공급자명에서 검색됩니다.
          </p>
        </div>

        {/* 필터 옵션들 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 발주상태 필터 */}
          <div>
            <label htmlFor="orderStatus" className="block text-sm font-medium text-gray-700 mb-2">
              발주상태
            </label>
            <select
              id="orderStatus"
              value={filterOrderStatus}
              onChange={(e) => {
                setFilterOrderStatus(e.target.value);
                if (updateUrlParams) {
                  updateUrlParams({ orderStatus: e.target.value });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {orderStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 공장출고 필터 */}
          <div>
            <label htmlFor="shippingStatus" className="block text-sm font-medium text-gray-700 mb-2">
              공장출고
            </label>
            <select
              id="shippingStatus"
              value={filterShippingStatus}
              onChange={(e) => {
                setFilterShippingStatus(e.target.value);
                if (updateUrlParams) {
                  updateUrlParams({ shippingStatus: e.target.value });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {shippingStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 입고상태 필터 */}
          <div>
            <label htmlFor="warehouseStatus" className="block text-sm font-medium text-gray-700 mb-2">
              입고상태
            </label>
            <select
              id="warehouseStatus"
              value={filterWarehouseStatus}
              onChange={(e) => {
                setFilterWarehouseStatus(e.target.value);
                if (updateUrlParams) {
                  updateUrlParams({ warehouseStatus: e.target.value });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {warehouseStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 검색 버튼 */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            검색
          </button>
        </div>
      </form>

      {/* 활성 필터 표시 */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                프로젝트명: {searchTerm}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    if (updateUrlParams) {
                      updateUrlParams({ search: '' });
                    }
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterOrderStatus !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                발주상태: {orderStatusOptions.find(opt => opt.value === filterOrderStatus)?.label}
                <button
                  onClick={() => {
                    setFilterOrderStatus('all');
                    if (updateUrlParams) {
                      updateUrlParams({ orderStatus: 'all' });
                    }
                  }}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterShippingStatus !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                공장출고: {shippingStatusOptions.find(opt => opt.value === filterShippingStatus)?.label}
                <button
                  onClick={() => {
                    setFilterShippingStatus('all');
                    if (updateUrlParams) {
                      updateUrlParams({ shippingStatus: 'all' });
                    }
                  }}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterWarehouseStatus !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                입고상태: {warehouseStatusOptions.find(opt => opt.value === filterWarehouseStatus)?.label}
                <button
                  onClick={() => {
                    setFilterWarehouseStatus('all');
                    if (updateUrlParams) {
                      updateUrlParams({ warehouseStatus: 'all' });
                    }
                  }}
                  className="ml-2 text-orange-600 hover:text-orange-800"
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

export default ListSearch; 