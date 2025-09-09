import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Calendar,
  Package,
  DollarSign,
  Calculator,
  Truck,
  Link as LinkIcon
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ListSearch from './ListSearch';
import { formatDate } from '../../../utils/timezone';

const ProjectLists = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); // 입력 중인 검색어
  const [appliedSearchTerm, setAppliedSearchTerm] = useState(''); // 실제 적용된 검색어
  const [currentPage, setCurrentPage] = useState(1);
  // itemsPerPage를 URL 파라미터에서 직접 읽어서 사용
  const getItemsPerPage = () => {
    const limit = searchParams.get('limit');
    return limit ? parseInt(limit, 10) || 10 : 10;
  };
  
  // itemsPerPage 값을 메모이제이션
  const itemsPerPage = getItemsPerPage();
  
  // itemsPerPage는 URL 파라미터에서 직접 읽어서 사용
  const [totalItems, setTotalItems] = useState(0);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [filterOrderStatus, setFilterOrderStatus] = useState('all');
  const [filterShippingStatus, setFilterShippingStatus] = useState('all');
  const [filterWarehouseStatus, setFilterWarehouseStatus] = useState('all');

  // URL 파라미터에서 상태 복원 및 API 호출
  useEffect(() => {
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const search = searchParams.get('search');
    const orderStatus = searchParams.get('orderStatus');
    const shippingStatus = searchParams.get('shippingStatus');
    const warehouseStatus = searchParams.get('warehouseStatus');
    
    console.log('🔄 [ProjectLists] URL 파라미터 복원 시작:', { 
      page, limit, search, orderStatus, shippingStatus, warehouseStatus, 
      searchParams: searchParams.toString()
    });
    
    // 페이지 복원
    if (page) {
      const pageNum = parseInt(page, 10) || 1;
      console.log('📄 [ProjectLists] 페이지 복원:', pageNum);
      setCurrentPage(pageNum);
    }
    
    // limit 복원 - itemsPerPage는 자동으로 처리됨
    if (limit) {
      const limitNum = parseInt(limit, 10) || 10;
      console.log('📊 [ProjectLists] 페이지당 항목 수 복원:', limitNum);
    }
    
    // 검색어 복원
    if (search !== null) {
      console.log('🔍 [ProjectLists] 검색어 복원:', search);
      setSearchTerm(search);
      setAppliedSearchTerm(search);
    } else {
      // 검색어가 URL에 없으면 초기화
      console.log('🔍 [ProjectLists] 검색어 초기화');
      setSearchTerm('');
      setAppliedSearchTerm('');
    }
    
    // 필터 복원
    if (orderStatus !== null) {
      console.log('📋 [ProjectLists] 발주상태 필터 복원:', orderStatus);
      setFilterOrderStatus(orderStatus);
    } else {
      setFilterOrderStatus('all');
    }
    if (shippingStatus !== null) {
      console.log('🚚 [ProjectLists] 공장출고 필터 복원:', shippingStatus);
      setFilterShippingStatus(shippingStatus);
    } else {
      setFilterShippingStatus('all');
    }
    if (warehouseStatus !== null) {
      console.log('📦 [ProjectLists] 입고상태 필터 복원:', warehouseStatus);
      setFilterWarehouseStatus(warehouseStatus);
    } else {
      setFilterWarehouseStatus('all');
    }
    
    console.log('🔄 [ProjectLists] URL 파라미터 복원 완료');
    
    // 상태 복원 완료 후 API 호출
    if (isAuthenticated) {
      const timeoutId = setTimeout(() => {
        console.log('🚀 [ProjectLists] 상태 복원 후 API 호출:', {
          search,
          page: page || '1',
          limit: limit || '10',
          orderStatus: orderStatus || 'all',
          shippingStatus: shippingStatus || 'all',
          warehouseStatus: warehouseStatus || 'all'
        });
        // URL 파라미터를 직접 사용하여 API 호출
        fetchProjectsWithParams({
          search: search || '',
          page: page || '1',
          limit: limit || '10',
          orderStatus: orderStatus || 'all',
          shippingStatus: shippingStatus || 'all',
          warehouseStatus: warehouseStatus || 'all'
        });
      }, 100); // 100ms 지연으로 상태 업데이트 완료 대기
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, isAuthenticated]); // searchParams와 isAuthenticated 변경 시에만 실행

  // appliedSearchTerm이 변경될 때마다 API 호출 (검색 실행 시에만)
  // 주석 처리: 상태 복원 시 fetchProjectsWithParams가 처리하므로 중복 방지
  // useEffect(() => {
  //   if (isAuthenticated && appliedSearchTerm !== undefined && appliedSearchTerm !== '') {
  //     console.log('🔍 [ProjectLists] appliedSearchTerm 변경으로 API 호출:', {
  //       appliedSearchTerm,
  //       currentPage,
  //       itemsPerPage,
  //       filterOrderStatus,
  //       filterShippingStatus,
  //       filterWarehouseStatus
  //     });
  //     fetchProjects();
  //   }
  // }, [appliedSearchTerm, currentPage, itemsPerPage, filterOrderStatus, filterShippingStatus, filterWarehouseStatus, isAuthenticated]);

  // 기존 API 호출 useEffect는 제거됨 - 상태 복원 후 API 호출로 대체

  // 검색어가 변경되면 첫 페이지로 이동
  useEffect(() => {
    if (appliedSearchTerm !== '') {
      setCurrentPage(1);
    }
  }, [appliedSearchTerm]);

  // itemsPerPage가 변경되면 현재 페이지를 1로 리셋 (URL 파라미터가 없을 때만)
  useEffect(() => {
    const page = searchParams.get('page');
    if (!page) {
      setCurrentPage(1);
    }
  }, [itemsPerPage, searchParams]);


  // 서버에서 이미 필터링된 데이터를 받으므로 클라이언트 사이드 필터링 비활성화
  // useEffect(() => {
  //   applyFilters();
  // }, [projects, searchTerm, filterOrderStatus, filterShippingStatus, filterWarehouseStatus, searchParams]);

  // 검색 실행 함수
  const handleSearch = () => {
    console.log('🔍 [ProjectLists] 검색 실행:', { searchTerm, appliedSearchTerm });
    setAppliedSearchTerm(searchTerm);
    setCurrentPage(1);
    // URL 파라미터 업데이트
    updateUrlParams({ 
      search: searchTerm,
      page: 1 
    });
    // 검색 실행 후 즉시 API 호출
    setTimeout(() => {
      if (isAuthenticated) {
        console.log('🔍 [ProjectLists] 검색 실행 후 API 호출');
        fetchProjects();
      }
    }, 100);
  };

  // 필터 초기화 함수
  const handleClearFilters = () => {
    setSearchTerm('');
    setAppliedSearchTerm('');
    setFilterOrderStatus('all');
    setFilterShippingStatus('all');
    setFilterWarehouseStatus('all');
    setCurrentPage(1);
    // URL 파라미터 초기화
    updateUrlParams({ 
      search: '',
      orderStatus: 'all',
      shippingStatus: 'all',
      warehouseStatus: 'all',
      page: 1 
    });
  };

  // 검색 및 필터링 적용
  const applyFilters = () => {
    let filtered = [...projects];

    // 프로젝트명 검색은 서버에서 처리되므로 클라이언트에서는 제거

    // 발주상태 필터
    if (filterOrderStatus !== 'all') {
      if (filterOrderStatus === 'completed') {
        filtered = filtered.filter(project => project.is_order_completed === 1);
      } else if (filterOrderStatus === 'waiting') {
        filtered = filtered.filter(project => project.is_order_completed === 0);
      }
    }

    // 공장출고 필터
    if (filterShippingStatus !== 'all') {
      if (filterShippingStatus === '미설정') {
        filtered = filtered.filter(project => !project.factory_shipping_status);
      } else {
        filtered = filtered.filter(project => project.factory_shipping_status === filterShippingStatus);
      }
    }

    // 입고상태 필터
    if (filterWarehouseStatus !== 'all') {
      filtered = filtered.filter(project => {
        const projectQuantity = Number(project.quantity) || 0;
        const warehouseQuantity = Number(project.warehouse_quantity) || 0;
        
        switch (filterWarehouseStatus) {
          case '입고완료':
            return (projectQuantity === warehouseQuantity || projectQuantity < warehouseQuantity) && warehouseQuantity > 0;
          case '입고중':
            return projectQuantity > warehouseQuantity && warehouseQuantity > 0;
          case '입고 대기':
            return warehouseQuantity === 0;
          default:
            return true;
        }
      });
    }

    setFilteredProjects(filtered);
    setTotalItems(filtered.length);
    
    // URL 파라미터가 없을 때만 첫 페이지로 이동 (검색/필터링 시)
    const page = searchParams.get('page');
    console.log('🔍 [ProjectLists] applyFilters 실행:', { 
      filteredCount: filtered.length, 
      hasPageParam: !!page, 
      currentPage: currentPage,
      searchParams: searchParams.toString()
    });
    
    if (!page) {
      console.log('📄 [ProjectLists] 페이지 파라미터 없음, 1페이지로 리셋');
      setCurrentPage(1);
    } else {
      console.log('📄 [ProjectLists] 페이지 파라미터 있음, 페이지 유지:', page);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // URL 파라미터 구성
      const params = new URLSearchParams();
      if (appliedSearchTerm) params.append('search', appliedSearchTerm);
      if (filterOrderStatus !== 'all') params.append('orderStatus', filterOrderStatus);
      if (filterShippingStatus !== 'all') params.append('shippingStatus', filterShippingStatus);
      if (filterWarehouseStatus !== 'all') params.append('warehouseStatus', filterWarehouseStatus);
      params.append('page', currentPage);
      params.append('limit', itemsPerPage);
      
      console.log('🔍 [ProjectLists] API 요청 파라미터:', {
        appliedSearchTerm,
        filterOrderStatus,
        filterShippingStatus,
        filterWarehouseStatus,
        currentPage,
        itemsPerPage: itemsPerPage,
        url: `/api/mj-project?${params.toString()}`
      });
      
      const response = await fetch(`/api/mj-project?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      
      if (data.success) {
        // 서버에서 이미 필터링된 프로젝트를 받음
        setProjects(data.projects);
        setFilteredProjects(data.projects);
        setTotalItems(data.pagination?.total || data.projects.length);
        console.log('🔍 [ProjectLists] 서버에서 받은 프로젝트:', {
          projectsCount: data.projects.length,
          totalItems: data.pagination?.total || data.projects.length,
          currentPage: currentPage,
          itemsPerPage: itemsPerPage,
          pagination: data.pagination
        });
      } else {
        setError(data.message || '프로젝트 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // URL 파라미터를 직접 사용하는 API 호출 함수
  const fetchProjectsWithParams = async (params) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // URL 파라미터 구성
      const urlParams = new URLSearchParams();
      if (params.search) urlParams.append('search', params.search);
      if (params.orderStatus !== 'all') urlParams.append('orderStatus', params.orderStatus);
      if (params.shippingStatus !== 'all') urlParams.append('shippingStatus', params.shippingStatus);
      if (params.warehouseStatus !== 'all') urlParams.append('warehouseStatus', params.warehouseStatus);
      urlParams.append('page', params.page);
      urlParams.append('limit', params.limit);
      
      console.log('🔍 [ProjectLists] fetchProjectsWithParams API 요청 파라미터:', {
        ...params,
        url: `/api/mj-project?${urlParams.toString()}`
      });
      
      const response = await fetch(`/api/mj-project?${urlParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('프로젝트 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      
      if (data.success) {
        // 서버에서 이미 필터링된 프로젝트를 받음
        setProjects(data.projects);
        setFilteredProjects(data.projects);
        setTotalItems(data.pagination?.total || data.projects.length);
        console.log('🔍 [ProjectLists] fetchProjectsWithParams 서버에서 받은 프로젝트:', {
          projectsCount: data.projects.length,
          totalItems: data.pagination?.total || data.projects.length,
          currentPage: params.page,
          itemsPerPage: params.limit,
          pagination: data.pagination
        });
      } else {
        setError(data.message || '프로젝트 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProject = (projectId) => {
    // 현재 모든 상태를 URL에 포함하여 상세보기로 이동
    const returnParams = new URLSearchParams();
    returnParams.set('page', currentPage.toString());
    returnParams.set('limit', itemsPerPage.toString());
    
    // 검색 조건들도 포함 (appliedSearchTerm이 있으면 사용, 없으면 searchTerm 사용)
    const currentSearchTerm = appliedSearchTerm || searchTerm;
    if (currentSearchTerm) returnParams.set('search', currentSearchTerm);
    if (filterOrderStatus !== 'all') returnParams.set('orderStatus', filterOrderStatus);
    if (filterShippingStatus !== 'all') returnParams.set('shippingStatus', filterShippingStatus);
    if (filterWarehouseStatus !== 'all') returnParams.set('warehouseStatus', filterWarehouseStatus);
    
    console.log('🔗 [ProjectLists] 프로젝트 상세보기로 이동:', {
      projectId,
      returnParams: returnParams.toString(),
      currentSearchTerm,
      appliedSearchTerm,
      searchTerm
    });
    
    navigate(`/dashboard/mj-projects/${projectId}?return=${encodeURIComponent(returnParams.toString())}`);
  };

  const handleEditProject = (projectId) => {
    // 편집 페이지로 이동할 때도 현재 페이지 정보 포함
    const returnParams = new URLSearchParams();
    returnParams.set('page', currentPage.toString());
    returnParams.set('limit', itemsPerPage.toString());
    
    // 검색 조건들도 포함 (appliedSearchTerm이 있으면 사용, 없으면 searchTerm 사용)
    const currentSearchTerm = appliedSearchTerm || searchTerm;
    if (currentSearchTerm) returnParams.set('search', currentSearchTerm);
    if (filterOrderStatus !== 'all') returnParams.set('orderStatus', filterOrderStatus);
    if (filterShippingStatus !== 'all') returnParams.set('shippingStatus', filterShippingStatus);
    if (filterWarehouseStatus !== 'all') returnParams.set('warehouseStatus', filterWarehouseStatus);
    
    navigate(`/dashboard/mj-projects/${projectId}/edit?return=${encodeURIComponent(returnParams.toString())}`);
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/mj-project/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // 삭제 성공 시 목록에서 제거
        setProjects(projects.filter(project => project.id !== projectId));
        alert('프로젝트가 삭제되었습니다.');
      } else {
        const data = await response.json();
        alert(data.message || '프로젝트 삭제에 실패했습니다.');
      }
    } catch (error) {
      alert('프로젝트 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCreateProject = () => {
    navigate('/services/mj-distribution');
  };

  // URL 파라미터 업데이트 함수
  const updateUrlParams = (updates) => {
    const newSearchParams = new URLSearchParams(searchParams);
    
    // 페이지 관련 파라미터
    if (updates.page !== undefined) {
      newSearchParams.set('page', updates.page.toString());
    }
    if (updates.limit !== undefined) {
      newSearchParams.set('limit', updates.limit.toString());
    }
    
    // 필터 관련 파라미터
    if (updates.search !== undefined) {
      if (updates.search) {
        newSearchParams.set('search', updates.search);
      } else {
        newSearchParams.delete('search');
      }
    }
    if (updates.orderStatus !== undefined) {
      if (updates.orderStatus !== 'all') {
        newSearchParams.set('orderStatus', updates.orderStatus);
      } else {
        newSearchParams.delete('orderStatus');
      }
    }
    if (updates.shippingStatus !== undefined) {
      if (updates.shippingStatus !== 'all') {
        newSearchParams.set('shippingStatus', updates.shippingStatus);
      } else {
        newSearchParams.delete('shippingStatus');
      }
    }
    if (updates.warehouseStatus !== undefined) {
      if (updates.warehouseStatus !== 'all') {
        newSearchParams.set('warehouseStatus', updates.warehouseStatus);
      } else {
        newSearchParams.delete('warehouseStatus');
      }
    }
    
    setSearchParams(newSearchParams);
  };

  // 페이징 관련 함수들
  const handlePageChange = (page) => {
    console.log('📄 [ProjectLists] 페이지 변경:', { from: currentPage, to: page });
    setCurrentPage(page);
    updateUrlParams({ page });
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    console.log('📊 [ProjectLists] 페이지당 항목 수 변경:', {
      from: itemsPerPage,
      to: newItemsPerPage,
      currentPage: currentPage
    });
    // itemsPerPage는 URL 파라미터로 관리되므로 setItemsPerPage 제거
    setCurrentPage(1); // 페이지 크기가 변경되면 첫 페이지로 이동
    
    // 현재 검색 조건들을 유지하면서 limit만 업데이트
    const updates = { 
      page: 1, 
      limit: newItemsPerPage,
      search: appliedSearchTerm || searchTerm,
      orderStatus: filterOrderStatus,
      shippingStatus: filterShippingStatus,
      warehouseStatus: filterWarehouseStatus
    };
    
    updateUrlParams(updates);
    console.log('📊 [ProjectLists] URL 파라미터 업데이트 완료:', updates);
  };

  // 서버에서 이미 페이징된 데이터를 받으므로 클라이언트 사이드 페이징 불필요
  // const getCurrentPageProjects = () => {
  //   const startIndex = (currentPage - 1) * itemsPerPage;
  //   const endIndex = startIndex + itemsPerPage;
  //   return filteredProjects.slice(startIndex, endIndex);
  // };

  // 총 페이지 수 계산 (서버에서 받은 pagination 정보 사용)
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // 페이지 번호 배열 생성 (최대 5개씩 표시)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  // 페이징 컨트롤 컴포넌트
  const PaginationControls = () => {
    if (projects.length === 0) return null;

    return (
      <div className="bg-white px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          {/* 페이지당 항목 수 선택 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">페이지당 표시:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10개</option>
              <option value={15}>15개</option>
              <option value={20}>20개</option>
              <option value={30}>30개</option>
            </select>
          </div>

          {/* 페이지 정보 */}
          <div className="text-sm text-gray-700">
            {totalItems > 0 ? (
              <>
                {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems}개
                <span className="ml-2 text-gray-500">
                  (현재 페이지: {projects.length}개 표시)
                </span>
              </>
            ) : (
              '0개'
            )}
          </div>

          {/* 페이지 네비게이션 */}
          <div className="flex items-center space-x-1">
            {/* 첫 페이지로 이동 */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              처음
            </button>
            
            {/* 이전 페이지 */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>

            {/* 페이지 번호들 */}
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}

            {/* 다음 페이지 */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
            
            {/* 마지막 페이지로 이동 */}
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              마지막
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 중복된 함수 제거됨 - 위에서 이미 정의됨

  // formatDate 함수는 utils/timezone에서 import하여 사용



  const getOrderStatusBadge = (project) => {
    // DB의 is_order_completed 값을 기준으로 발주 상태 결정
    if (project.is_order_completed === 1) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          완료
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          대기
        </span>
      );
    }
  };

  const getShippingStatusBadge = (project) => {
    // DB의 factory_shipping_status 값을 기준으로 출고 상태 결정
    if (!project.factory_shipping_status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          미설정
        </span>
      );
    }

    const statusConfig = {
      '출고 완료': { color: 'bg-green-100 text-green-800' },
      '정시출고': { color: 'bg-green-100 text-green-800' },
      '정상 출고': { color: 'bg-green-100 text-green-800' },
      '조기출고': { color: 'bg-blue-100 text-blue-800' },
      '조기 출고': { color: 'bg-blue-100 text-blue-800' },
      '출고연기': { color: 'bg-yellow-100 text-yellow-800' },
      '출고 연기': { color: 'bg-yellow-100 text-yellow-800' },
      '출고 대기': { color: 'bg-orange-100 text-orange-800' }
    };

    const config = statusConfig[project.factory_shipping_status] || { color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {project.factory_shipping_status}
      </span>
    );
  };

  const getWarehouseStatusBadge = (project) => {
    // mj_project.quantity와 warehouse_entries.quantity를 비교하여 입고 상태 결정
    const projectQuantity = Number(project.quantity) || 0;
    const warehouseQuantity = Number(project.warehouse_quantity) || 0;
    

    
    // 입고완료: mj_project.quantity <= warehouse_entries.quantity && warehouse_entries.quantity > 0
    if ((projectQuantity === warehouseQuantity || projectQuantity < warehouseQuantity) && warehouseQuantity > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          입고완료
        </span>
      );
    }
    
    // 입고중: mj_project.quantity > warehouse_entries.quantity && warehouse_entries.quantity != 0
    if (projectQuantity > warehouseQuantity && warehouseQuantity > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          입고중
        </span>
      );
    }
    
    // 입고 대기: warehouse_entries.quantity == 0
    if (warehouseQuantity === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          입고 대기
        </span>
      );
    }
    
    // 기본 상태 (예상치 못한 경우)
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        오류
      </span>
    );
  };

    const getExportStatusBadge = (project) => {
    // mj_project 테이블의 quantity, entry_quantity, remain_quantity, export_quantity를 비교하여 출고 상태 결정
    const projectQuantity = Number(project.quantity) || 0;
    const entryQuantity = Number(project.entry_quantity) || 0;
    const remainQuantity = Number(project.remain_quantity) || 0;
    const exportQuantity = Number(project.export_quantity) || 0;
    
    // 입고대기: entry_quantity가 0인 경우
    if (entryQuantity === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          입고대기
        </span>
      );
    }
    
    // 출고완료: remain_quantity가 0이고 export_quantity가 quantity와 같거나 더 큰 경우
    if (remainQuantity === 0 && (exportQuantity === projectQuantity || exportQuantity > projectQuantity) && projectQuantity > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          출고완료
        </span>
      );
    }
    
    // 배송중: remain_quantity > 0 (재고가 남아있음)
    if (remainQuantity > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          배송중
        </span>
      );
    }
    
    // 기본 상태 (예상치 못한 경우)
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        출고 준비
      </span>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
          <p className="text-gray-600 mb-6">MJ 프로젝트 목록을 보려면 로그인해주세요.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">프로젝트 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchProjects}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">MJ 프로젝트 목록</h1>
              <p className="text-gray-600">
                {user?.isAdmin 
                  ? '전체 MJ 프로젝트를 관리합니다.' 
                  : '내가 소유한 MJ 프로젝트 목록입니다.'
                }
              </p>
            </div>
            <button
              onClick={handleCreateProject}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              새 프로젝트 등록
            </button>
          </div>
        </div>

        {/* Search Component */}
        <ListSearch
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterOrderStatus={filterOrderStatus}
          setFilterOrderStatus={setFilterOrderStatus}
          filterShippingStatus={filterShippingStatus}
          setFilterShippingStatus={setFilterShippingStatus}
          filterWarehouseStatus={filterWarehouseStatus}
          setFilterWarehouseStatus={setFilterWarehouseStatus}
          onSearch={handleSearch}
          onClearFilters={handleClearFilters}
          updateUrlParams={updateUrlParams}
        />

        {/* Projects Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">프로젝트가 없습니다</h3>
              <p className="text-gray-600 mb-6">
                {user?.isAdmin 
                  ? '등록된 MJ 프로젝트가 없습니다.' 
                  : '아직 소유한 MJ 프로젝트가 없습니다.'
                }
              </p>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                첫 프로젝트 등록하기
              </button>
            </div>
          ) : (
            <div>
              {/* 상단 페이징 컨트롤 */}
              <PaginationControls />
              
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      날짜
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      대표이미지
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
                      총계
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      발주 상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      공장 출고
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      입고 상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      출고 상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => (
                                      <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <span>
                            {project.actual_order_date 
                              ? formatDate(project.actual_order_date) 
                              : formatDate(project.created_at)
                            }
                          </span>
                        </div>
                      </td>
                    <td className="px-6 py-4">
                        {project.representative_image ? (
                          <div className="flex-shrink-0">
                            <img
                              src={project.representative_image.url || `/uploads/project/mj/registImage/${project.representative_image.filename}`}
                              alt={`${project.project_name} 대표이미지`}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm cursor-pointer"
                              onError={(e) => {
                                // 이미지 로드 실패 시 대체 URL 시도
                                if (project.representative_image.fallback_url) {
                                  e.target.src = project.representative_image.fallback_url;
                                } else if (project.representative_image.filename) {
                                  const fallbackUrl = `/uploads/project/mj/registImage/${project.representative_image.filename}`;
                                  e.target.src = fallbackUrl;
                                }
                                
                                // 대체 URL도 실패하면 기본 아이콘 표시
                                e.target.onerror = () => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                };
                              }}
                              onClick={() => handleViewProject(project.id)}
                            />
                            <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 text-xs hidden">
                              <Package className="w-6 h-6" />
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 text-xs cursor-pointer"
                            onClick={() => handleViewProject(project.id)}
                            title="상세보기"
                          >
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {project.project_name}
                        </div>
                        {project.description && (
                          <div className="text-sm text-gray-500">
                            {project.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <Package className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{project.quantity?.toLocaleString() || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                          onClick={() => navigate(`/dashboard/mj-projects/${project.id}?tab=payment`)}
                          title="결제정보 보기"
                        >
                          <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                          <span>
                            {project.unit_price ? `¥${project.unit_price.toLocaleString()}` : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                          onClick={() => navigate(`/dashboard/mj-projects/${project.id}?tab=payment`)}
                          title="결제정보 보기"
                        >
                          <Calculator className="w-4 h-4 mr-2 text-gray-400" />
                          <span>
                            {project.total_amount ? `¥${project.total_amount.toLocaleString()}` : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                          onClick={() => navigate(`/dashboard/mj-projects/${project.id}?tab=delivery`)}
                          title="납기정보 보기"
                        >
                          <Truck className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{getOrderStatusBadge(project)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center text-sm text-gray-900 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                          onClick={() => navigate(`/dashboard/mj-projects/${project.id}?tab=delivery`)}
                          title="납기정보 보기"
                        >
                          <Package className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{getShippingStatusBadge(project)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center text-gray-900 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                          onClick={() => navigate(`/dashboard/mj-projects/${project.id}?tab=delivery`)}
                          title="납기정보 보기"
                        >
                          <Truck className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{getWarehouseStatusBadge(project)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center text-gray-900 cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors group"
                          onClick={() => navigate(`/dashboard/mj-projects/${project.id}?tab=shipping`)}
                          title="물류정보 보기"
                        >
                          <Truck className="w-4 h-4 mr-2 text-gray-400 group-hover:text-blue-500 transition-colors" />
                          <span className="group-hover:underline">{getExportStatusBadge(project)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewProject(project.id)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="상세보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditProject(project.id)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* 하단 페이징 컨트롤 */}
              <PaginationControls />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectLists; 