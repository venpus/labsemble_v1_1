import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Eye, List, Trash2, X } from 'lucide-react';

const MJPackingList = () => {
  const navigate = useNavigate();
  const [packingLists, setPackingLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 페이징 관련 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // 삭제 미리보기 모달 상태
  const [isDeletePreviewOpen, setIsDeletePreviewOpen] = useState(false);
  const [deletePreviewData, setDeletePreviewData] = useState(null);
  const [pendingDeleteDate, setPendingDeleteDate] = useState(null);

  // 패킹 리스트 데이터 가져오기
  const fetchPackingLists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch('/api/packing-list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('패킹 리스트 조회에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        // pl_date별로 그룹화하여 데이터 정리
        const groupedData = result.data.reduce((acc, item) => {
          const plDate = item.pl_date || '날짜 미지정';
          const existingGroup = acc.find(group => group.pl_date === plDate);
          
          if (existingGroup) {
            // 기존 그룹에 상품명 추가 (고유 제품 체크)
            // project_id가 있으면 project_id + product_name + product_sku로 키 생성
            // project_id가 없으면 product_name만으로 키 생성 (SKU 무관)
            const productKey = item.project_id ? 
              `${item.project_id}_${item.product_name}_${item.product_sku}` : 
              `no-project_${item.product_name}`;
            const existingProductKey = existingGroup.product_keys?.find(key => key === productKey);
            
            if (!existingProductKey) {
              if (!existingGroup.product_keys) {
                existingGroup.product_keys = [];
              }
              existingGroup.product_keys.push(productKey);
              
              // 제품명이 다르면 추가 (같은 client_product_id가 아닌 경우)
              if (!existingGroup.product_names.includes(item.product_name)) {
                existingGroup.product_names.push(item.product_name);
              }
            }
            
            // packing_code별로 box_count를 추적하여 중복 합산 방지
            if (!existingGroup.packing_codes.includes(item.packing_code)) {
              existingGroup.packing_codes.push(item.packing_code);
              const oldBoxCount = existingGroup.total_box_count;
              existingGroup.total_box_count += (item.box_count || 0);
              console.log(`🔄 [MJPackingList] ${plDate} 그룹에 새로운 포장코드 ${item.packing_code} 추가: ${oldBoxCount} + ${item.box_count || 0} = ${existingGroup.total_box_count}`);
            } else {
              console.log(`ℹ️ [MJPackingList] ${plDate} 그룹에 이미 존재하는 포장코드 ${item.packing_code} - 박스수 중복 합산 방지`);
            }
            
            // 물류회사가 다를 경우 배열에 추가 (중복 제거)
            if (item.logistic_company && !existingGroup.logistic_companies.includes(item.logistic_company)) {
              existingGroup.logistic_companies.push(item.logistic_company);
            }
            
            // 배송비 정보는 logistic_payment 테이블에서 별도로 조회하므로 여기서는 제거
          } else {
            // 새로운 그룹 생성
            const productKey = item.client_product_id || `${item.product_name}_${item.product_sku}`;
            acc.push({
              pl_date: plDate,
              total_box_count: item.box_count || 0,
              packing_codes: [item.packing_code], // 포장코드 추적을 위한 배열 추가
              product_names: [item.product_name],
              product_keys: [productKey], // 제품 키 추적을 위한 배열 추가
              logistic_companies: item.logistic_company ? [item.logistic_company] : [],
              total_shipping_cost: 0, // logistic_payment 테이블에서 조회
              paid_shipping_count: 0, // logistic_payment 테이블에서 조회
              unpaid_shipping_count: 0, // logistic_payment 테이블에서 조회
              created_at: item.created_at,
              updated_at: item.updated_at
            });
          }
          
          return acc;
        }, []);
        
        // pl_date 기준으로 정렬 (최신 날짜가 위로)
        groupedData.sort((a, b) => {
          if (a.pl_date === '날짜 미지정') return 1;
          if (b.pl_date === '날짜 미지정') return -1;
          return new Date(b.pl_date) - new Date(a.pl_date);
        });

        // 각 날짜별로 물류비 합계 조회
        const updatedGroupedData = await Promise.all(
          groupedData.map(async (group) => {
            if (group.pl_date === '날짜 미지정') {
              return group;
            }
            
            try {
              const logisticResponse = await fetch(`/api/logistic-payment/summary-by-date/${group.pl_date}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (logisticResponse.ok) {
                const logisticResult = await logisticResponse.json();
                if (logisticResult.success && logisticResult.data) {
                  // 포장코드별 물류비 합계 계산
                  const totalLogisticFee = logisticResult.data.reduce((sum, item) => {
                    const fee = parseFloat(item.total_logistic_fee) || 0;
                    return sum + fee;
                  }, 0);
                  
                  const totalPaidCount = logisticResult.data.reduce((sum, item) => sum + (parseInt(item.paid_count) || 0), 0);
                  const totalUnpaidCount = logisticResult.data.reduce((sum, item) => sum + (parseInt(item.unpaid_count) || 0), 0);
                  
                  console.log(`💰 [MJPackingList] ${group.pl_date} 물류비 합계: ${totalLogisticFee}원 (결제완료: ${totalPaidCount}건, 미결제: ${totalUnpaidCount}건)`);
                  
                  return {
                    ...group,
                    total_shipping_cost: totalLogisticFee,
                    paid_shipping_count: totalPaidCount,
                    unpaid_shipping_count: totalUnpaidCount
                  };
                }
              }
            } catch (error) {
              console.log(`⚠️ [MJPackingList] ${group.pl_date} 물류비 조회 실패 (무시됨):`, error.message);
            }
            
            return group;
          })
        );

        setPackingLists(updatedGroupedData);
        console.log('📊 [MJPackingList] 패킹 리스트 데이터 로드 완료:', {
          totalGroups: updatedGroupedData.length,
          groupDetails: updatedGroupedData.map(group => ({
            pl_date: group.pl_date,
            packing_codes: group.packing_codes,
            total_box_count: group.total_box_count,
            product_count: group.product_names.length,
            logistic_companies: group.logistic_companies,
            total_shipping_cost: group.total_shipping_cost,
            paid_shipping_count: group.paid_shipping_count,
            unpaid_shipping_count: group.paid_shipping_count
          }))
        });
      } else {
        throw new Error(result.error || '패킹 리스트 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ [MJPackingList] 패킹 리스트 조회 오류:', error);
      setError(error.message);
      toast.error('패킹 리스트 조회에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 권한 확인
  const checkUserRole = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // JWT 토큰에서 사용자 정보 추출
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.isAdmin || false);
        console.log('🔐 [MJPackingList] 사용자 권한 확인:', {
          isAdmin: payload.isAdmin,
          userId: payload.userId
        });
      }
    } catch (error) {
      console.error('❌ [MJPackingList] 사용자 권한 확인 오류:', error);
      setIsAdmin(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드 및 권한 확인
  useEffect(() => {
    checkUserRole();
    fetchPackingLists();
  }, []);

  // 새로고침 버튼 클릭
  const handleRefresh = () => {
    setCurrentPage(1); // 새로고침 시 첫 페이지로 이동
    fetchPackingLists();
  };

  // 삭제 미리보기 데이터 가져오기
  const fetchDeletePreview = async (plDate) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const dateParam = plDate === '날짜 미지정' ? 'no-date' : plDate;
      
      const response = await fetch(`/api/packing-list/by-date/${dateParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('삭제 미리보기 데이터 조회에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        setDeletePreviewData(result.data);
        setPendingDeleteDate(plDate);
        setIsDeletePreviewOpen(true);
      } else {
        throw new Error(result.error || '삭제 미리보기 데이터 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ [fetchDeletePreview] 삭제 미리보기 조회 오류:', error);
      toast.error(`삭제 미리보기 조회 실패: ${error.message}`);
    }
  };

  // 삭제 미리보기 모달 닫기
  const closeDeletePreview = () => {
    setIsDeletePreviewOpen(false);
    setDeletePreviewData(null);
    setPendingDeleteDate(null);
  };

  // 실제 삭제 실행
  const executeDelete = async () => {
    if (!pendingDeleteDate) return;

    console.log('🗑️ [executeDelete] 실제 삭제 실행:', {
      plDate: pendingDeleteDate,
      isAdmin,
      timestamp: new Date().toISOString()
    });

    try {
      // 로딩 상태 표시
      toast.loading('패킹리스트를 삭제하는 중...');

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      // 날짜 파라미터 처리
      const dateParam = pendingDeleteDate === '날짜 미지정' ? 'no-date' : pendingDeleteDate;

      // 서버에서 해당 날짜의 패킹리스트 삭제
      const response = await fetch(`/api/packing-list/by-date/${dateParam}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      toast.dismiss();

      if (result.success) {
        console.log('✅ [executeDelete] 패킹리스트 삭제 성공:', result);
        
        // 클라이언트 삭제 로그 기록
        const clientDeleteLog = {
          action: 'DELETE_PACKING_LIST_BY_DATE',
          date: pendingDeleteDate,
          deletedCount: result.deletedCount,
          affectedProjects: result.affectedProjects,
          deletedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        };
        
        console.log('📝 [executeDelete] 클라이언트 삭제 로그:', clientDeleteLog);
        
        // 성공 메시지 표시
        toast.success(`"${pendingDeleteDate}" 출고일자의 패킹리스트가 삭제되었습니다. (${result.deletedCount}개 항목)`);
        
        // 미리보기 모달 닫기
        closeDeletePreview();
        
        // 목록 새로고침
        await fetchPackingLists();
        
      } else {
        console.error('❌ [executeDelete] 패킹리스트 삭제 실패:', result);
        toast.error(result.error || '패킹리스트 삭제에 실패했습니다.');
      }

    } catch (error) {
      console.error('❌ [executeDelete] 패킹리스트 삭제 중 오류:', {
        plDate: pendingDeleteDate,
        error: error.message,
        stack: error.stack
      });

      toast.dismiss();
      toast.error(`패킹리스트 삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  // 특정 날짜의 패킹리스트 삭제 (미리보기)
  const handleDeletePackingList = async (plDate) => {
    console.log('🗑️ [handleDeletePackingList] 패킹리스트 삭제 시작:', {
      plDate,
      isAdmin,
      timestamp: new Date().toISOString()
    });

    try {
      // Admin 권한 확인
      if (!isAdmin) {
        console.log('🚫 [handleDeletePackingList] Admin 권한이 없어 삭제 불가');
        toast.error('패킹리스트 삭제는 관리자만 가능합니다.');
        return;
      }

      // 삭제 미리보기 데이터 가져오기
      await fetchDeletePreview(plDate);

    } catch (error) {
      console.error('❌ [handleDeletePackingList] 패킹리스트 삭제 중 오류:', {
        plDate,
        error: error.message,
        stack: error.stack
      });

      toast.dismiss();
      toast.error(`패킹리스트 삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  // 출고일자 클릭 시 상세페이지로 이동
  const handleDateClick = (plDate) => {
    console.log('🔗 [MJPackingList] 출고일자 클릭 시작');
    console.log('🔗 [MJPackingList] 클릭된 출고일자:', plDate);
    
    // 즉시 피드백 제공
    toast.success(`${plDate} 상세페이지로 이동합니다...`);
    
    // 날짜를 URL 파라미터로 전달 (날짜 미지정인 경우 'no-date'로 처리)
    const dateParam = plDate === '날짜 미지정' ? 'no-date' : plDate;
    const targetPath = `/dashboard/mj-packing-list/date/${dateParam}`;
    console.log('🔗 [MJPackingList] 이동할 경로:', targetPath);
    
    try {
      console.log('🔗 [MJPackingList] navigate 함수 호출 시작');
      navigate(targetPath);
      console.log('🔗 [MJPackingList] navigate 함수 호출 완료');
    } catch (error) {
      console.error('❌ [MJPackingList] 네비게이션 오류:', error);
      toast.error('페이지 이동에 실패했습니다: ' + error.message);
    }
  };

  // 패킹리스트 작성 페이지로 이동
  const handleCreatePackingList = () => {
    console.log('🔗 [MJPackingList] 패킹리스트 작성 버튼 클릭');
    toast.success('패킹리스트 작성 페이지로 이동합니다...');
    navigate('/dashboard/mj-packing-list/create');
  };

  // 페이징 관련 함수들
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // 페이지당 항목 수 변경 시 첫 페이지로 이동
  };

  // 현재 페이지의 데이터 계산
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return packingLists.slice(startIndex, endIndex);
  };

  // 총 페이지 수 계산
  const totalPages = Math.ceil(packingLists.length / itemsPerPage);

  // 페이지 번호 배열 생성
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // 총 페이지 수가 적으면 모든 페이지 표시
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 현재 페이지 주변의 페이지들 표시
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64">
        <div className="text-red-600 text-lg mb-4">오류가 발생했습니다</div>
        <div className="text-gray-600 mb-4">{error}</div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MJ 패킹 리스트</h1>
            <p className="text-gray-600">출고일자별로 그룹화된 패킹 리스트 정보를 확인할 수 있습니다.</p>
          </div>
          
          {/* 패킹리스트 작성 버튼 - Admin 권한 사용자에게만 표시 */}
          {isAdmin && (
            <button
              onClick={handleCreatePackingList}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
              title="새 패킹리스트 작성 (Admin 전용)"
            >
              <Plus className="w-5 h-5 mr-2" />
              패킹리스트 작성
            </button>
          )}
        </div>
      </div>

      {/* 새로고침 버튼 */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          총 {packingLists.length}개의 출고일자
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          새로고침
        </button>
      </div>

      {/* 배송비 요약 카드 */}
      {packingLists.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 cursor-pointer hover:bg-orange-100 transition-colors"
               onClick={() => navigate('/dashboard/mj-packing-list/logistic-payment')}
               title="클릭하여 물류 결제 관리 페이지로 이동">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">총 배송비</p>
                <p className="text-2xl font-bold text-orange-800">
                  {packingLists.reduce((sum, item) => sum + item.total_shipping_cost, 0).toLocaleString()}원
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors"
               onClick={() => navigate('/dashboard/mj-packing-list/logistic-payment')}
               title="클릭하여 물류 결제 관리 페이지로 이동">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">결제완료</p>
                <p className="text-2xl font-bold text-green-800">
                  {packingLists.reduce((sum, item) => sum + item.paid_shipping_count, 0)}건
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition-colors"
               onClick={() => navigate('/dashboard/mj-packing-list/logistic-payment')}
               title="클릭하여 물류 결제 관리 페이지로 이동">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">미결제</p>
                <p className="text-2xl font-bold text-red-800">
                  {packingLists.reduce((sum, item) => sum + item.unpaid_shipping_count, 0)}건
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 패킹 리스트 테이블 */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mx-2">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200" style={{ minWidth: '1400px' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  번호
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  출고일자
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  총 박스수
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  포함 상품명
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  물류회사
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  배송비
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  배송비 결제여부
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  물류비 상세
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  상품 개수
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  상세보기
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  삭제
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {packingLists.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-6 py-12 text-center text-gray-500">
                    저장된 패킹 리스트가 없습니다.
                  </td>
                </tr>
              ) : (
                getCurrentPageData().map((item, index) => (
                  <tr 
                    key={item.pl_date} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                      <div className="flex items-center justify-center">
                        <span className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 font-medium">
                          📅 {item.pl_date === '날짜 미지정' ? '날짜 미지정' : new Date(item.pl_date).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                      <div>
                        <span className="font-semibold text-lg text-gray-700">
                          {item.total_box_count.toLocaleString()} 박스
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      <div className="max-w-md flex justify-center">
                        {(() => {
                          // 상품명별 개수 계산
                          const productCounts = {};
                          item.product_names.forEach(productName => {
                            productCounts[productName] = (productCounts[productName] || 0) + 1;
                          });
                          
                          // 가장 많은 개수를 가진 상품명 찾기
                          const sortedProducts = Object.entries(productCounts)
                            .sort(([,a], [,b]) => b - a);
                          
                          const [mainProduct, mainCount] = sortedProducts[0];
                          const otherProductsCount = sortedProducts.length - 1;
                          
                          if (otherProductsCount === 0) {
                            // 상품이 1종류만 있는 경우
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                {mainProduct}
                              </span>
                            );
                          } else {
                            // 여러 종류의 상품이 있는 경우
                            return (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                {mainProduct} 외 {otherProductsCount}종
                              </span>
                            );
                          }
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                      <div className="space-y-1 flex flex-col items-center">
                        {item.logistic_companies.length > 0 ? (
                          item.logistic_companies.map((company, companyIndex) => (
                            <span key={companyIndex} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {company}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">미지정</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                      <div className="flex flex-col items-center">
                        <span 
                          className="font-semibold text-lg text-orange-600 cursor-pointer hover:text-orange-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/mj-packing-list/logistic-payment?date=${encodeURIComponent(item.pl_date)}`);
                          }}
                          title="클릭하여 물류 결제 관리 페이지로 이동"
                        >
                          {item.total_shipping_cost ? `${item.total_shipping_cost.toLocaleString()}원` : '0원'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center space-x-2 mb-1">
                          <span 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 cursor-pointer hover:bg-green-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/mj-packing-list/logistic-payment?date=${encodeURIComponent(item.pl_date)}`);
                            }}
                            title="클릭하여 물류 결제 관리 페이지로 이동"
                          >
                            ✅ 결제완료: {item.paid_shipping_count}건
                          </span>
                          <span 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 cursor-pointer hover:bg-red-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/mj-packing-list/logistic-payment?date=${encodeURIComponent(item.pl_date)}`);
                            }}
                            title="클릭하여 물류 결제 관리 페이지로 이동"
                          >
                            ❌ 미결제: {item.unpaid_shipping_count}건
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                      <div className="flex justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/mj-packing-list/logistic-payment?date=${encodeURIComponent(item.pl_date)}`);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors"
                          title={`${item.pl_date} 출고일자의 물류비 상세 정보 보기`}
                        >
                          <Package className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                      <div className="flex justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const dateParam = item.pl_date === '날짜 미지정' ? 'no-date' : item.pl_date;
                            navigate(`/dashboard/mj-packing-list/packing-code-detail?date=${encodeURIComponent(dateParam)}`);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                          title={`${item.pl_date} 출고일자의 포장코드별 리스트 보기`}
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                      <div className="flex justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/mj-packing-list/date-detail?date=${encodeURIComponent(item.pl_date)}`);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title={`${item.pl_date} 출고일자의 상세 패킹리스트 보기`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                      <div className="flex justify-center">
                        {isAdmin ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePackingList(item.pl_date);
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            title={`${item.pl_date} 출고일자의 패킹리스트 삭제 (Admin 전용)`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">권한 없음</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이징 컨트롤 */}
      {packingLists.length > 0 && (
        <div className="bg-white px-6 py-4 border-t border-gray-200 mx-2">
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
              {packingLists.length > 0 ? (
                <>
                  {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, packingLists.length)} / {packingLists.length}개
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
      )}

      {/* 데이터 요약 */}
      {packingLists.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-2">📊 데이터 요약:</div>
            <div>• 총 출고일자: {packingLists.length}개</div>
            <div>• 총 상품 수: {packingLists.reduce((sum, item) => sum + item.product_names.length, 0)}개</div>
            <div>• 총 박스 수: {packingLists.reduce((sum, item) => sum + item.total_box_count, 0).toLocaleString()}박스 (포장코드별 1회씩 합산)</div>
            <div>• 사용된 물류회사: {Array.from(new Set(packingLists.flatMap(item => item.logistic_companies))).join(', ') || '없음'}</div>
            <div>• 총 배송비: <span 
              className="cursor-pointer hover:text-blue-600 underline"
              onClick={() => navigate('/dashboard/mj-packing-list/logistic-payment')}
              title="클릭하여 물류 결제 관리 페이지로 이동"
            >{packingLists.reduce((sum, item) => sum + item.total_shipping_cost, 0).toLocaleString()}원</span></div>
            <div>• 배송비 결제 현황: <span 
              className="cursor-pointer hover:text-blue-600 underline"
              onClick={() => navigate('/dashboard/mj-packing-list/logistic-payment')}
              title="클릭하여 물류 결제 관리 페이지로 이동"
            >{packingLists.reduce((sum, item) => sum + item.paid_shipping_count, 0)}건 결제완료 / {packingLists.reduce((sum, item) => sum + item.unpaid_shipping_count, 0)}건 미결제</span></div>
          </div>
        </div>
      )}

      {/* 삭제 미리보기 모달 */}
      {isDeletePreviewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      패킹리스트 삭제 확인
                    </h3>
                    <p className="text-sm text-gray-600">
                      "{pendingDeleteDate}" 출고일자의 패킹리스트를 삭제하시겠습니까?
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeDeletePreview}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 모달 내용 */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              {deletePreviewData && deletePreviewData.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                      <span className="text-yellow-800 font-medium">
                        다음 {deletePreviewData.length}개의 패킹리스트 항목이 삭제됩니다:
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {deletePreviewData.map((item, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">포장코드:</span>
                            <p className="text-gray-900">{item.packing_code}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">상품명:</span>
                            <p className="text-gray-900">{item.product_name}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">박스수:</span>
                            <p className="text-gray-900">{item.box_count}개</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">수량:</span>
                            <p className="text-gray-900">
                              {(item.box_count || 0) * (item.packaging_count || 0) * (item.packaging_method || 0)}개
                            </p>
                          </div>
                        </div>
                        {item.project_id && (
                          <div className="mt-2 text-xs text-blue-600">
                            프로젝트 ID: {item.project_id}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                      <span className="text-red-800 font-medium">
                        ⚠️ 이 작업은 되돌릴 수 없습니다. 삭제 후에는 복구할 수 없습니다.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500">삭제할 데이터가 없습니다.</div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={closeDeletePreview}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={executeDelete}
                disabled={!deletePreviewData || deletePreviewData.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                삭제 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MJPackingList; 