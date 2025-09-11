import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Package, Calendar, Truck, Box, Printer, Trash2, X } from 'lucide-react';
import PackingListDetailPrints from './PackingListDetailPrints';

const PackingListDateDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const date = searchParams.get('date');
  const [packingData, setPackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [summary, setSummary] = useState({
    totalBoxes: 0,
    totalProducts: 0,
    totalQuantity: 0,
    logisticCompanies: []
  });

  // 인쇄 모달 상태
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  
  // 삭제 미리보기 모달 상태
  const [isDeletePreviewOpen, setIsDeletePreviewOpen] = useState(false);
  const [deletePreviewData, setDeletePreviewData] = useState(null);

  // URL 파라미터에서 날짜 정보 추출
  const displayDate = date === 'no-date' ? '날짜 미지정' : date;

  // 패킹리스트 데이터 가져오기
  const fetchPackingData = async () => {
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
        // 특정 날짜의 데이터만 필터링
        let filteredData;
        if (date === 'no-date') {
          filteredData = result.data.filter(item => !item.pl_date);
        } else {
          filteredData = result.data.filter(item => item.pl_date === date);
        }
        
        console.log('🔍 [PackingListDateDetail] 필터링 조건:', {
          date,
          totalDataCount: result.data.length,
          filteredDataCount: filteredData.length,
          sampleData: filteredData.slice(0, 3)
        });

        console.log('🔍 [PackingListDateDetail] 필터링된 원본 데이터:', filteredData);
        
        // 포장코드별로 그룹화하되 모든 상품 데이터 포함
        const groupedData = filteredData.reduce((acc, item) => {
          console.log('🔍 [PackingListDateDetail] 처리 중인 아이템:', {
            packing_code: item.packing_code,
            box_count: item.box_count,
            product_name: item.product_name,
            product_sku: item.product_sku,
            client_product_id: item.client_product_id,
            logistic_company: item.logistic_company
          });
          
          const existingGroup = acc.find(group => group.packing_code === item.packing_code);
          
          if (existingGroup) {
            console.log('🔄 [PackingListDateDetail] 기존 그룹에 상품 추가:', existingGroup.packing_code);
            // 기존 그룹에 상품 추가 (중복 제거 없이 모든 상품 포함)
            existingGroup.products.push({
              product_name: item.product_name,
              product_sku: item.product_sku,
              product_image: item.product_image,
              client_product_id: item.client_product_id, // client_product_id 추가
              packaging_method: item.packaging_method,
              packaging_count: item.packaging_count,
              quantity_per_box: item.quantity_per_box,
              created_at: item.created_at
            });
            // box_count는 기존 값 유지 (같은 포장코드의 box_count는 일치해야 함)
            if (existingGroup.box_count !== item.box_count) {
              console.warn(`⚠️ [PackingListDateDetail] ${existingGroup.packing_code}의 box_count 불일치: 기존 ${existingGroup.box_count} vs 현재 ${item.box_count}`);
            }
          } else {
            console.log('🆕 [PackingListDateDetail] 새로운 그룹 생성:', item.packing_code);
            // 새로운 그룹 생성
            acc.push({
              packing_code: item.packing_code,
              box_count: item.box_count || 0,
              logistic_company: item.logistic_company,
              pl_date: item.pl_date,
              products: [{
                product_name: item.product_name,
                product_sku: item.product_sku,
                product_image: item.product_image,
                client_product_id: item.client_product_id, // client_product_id 추가
                packaging_method: item.packaging_method,
                packaging_count: item.packaging_count,
                quantity_per_box: item.quantity_per_box,
                created_at: item.created_at
              }]
            });
          }
          
          return acc;
        }, []);
        
        console.log('📊 [PackingListDateDetail] 그룹화된 데이터:', groupedData);

        // 데이터 유효성 검사
        if (groupedData.length === 0) {
          console.log('⚠️ [PackingListDateDetail] 그룹화된 데이터가 없음');
          setPackingData([]);
          setSummary({
            totalBoxes: 0,
            totalProducts: 0,
            logisticCompanies: []
          });
          return;
        }
        
        setPackingData(groupedData);

        // 요약 정보 계산
        // 각 packing_code별로 box_count 하나씩만 합산 (중복 제거)
        const totalBoxes = groupedData.reduce((sum, item) => {
          const boxCount = item.box_count || 0;
          console.log(`📊 [PackingListDateDetail] ${item.packing_code} 박스수: ${boxCount} (포장코드별 1회만 합산)`);
          return sum + boxCount;
        }, 0);
        
        // 모든 상품 개수 합산 (중복 포함)
        const totalProducts = groupedData.reduce((sum, item) => sum + item.products.length, 0);
        
        // 총 수량 계산 (packaging_method * packaging_count * box_count)
        const totalQuantity = groupedData.reduce((sum, item) => {
          const itemQuantity = item.products.reduce((productSum, product) => {
            const quantity = (product.packaging_method || 0) * (product.packaging_count || 0) * (item.box_count || 0);
            return productSum + quantity;
          }, 0);
          return sum + itemQuantity;
        }, 0);
        
        const logisticCompanies = Array.from(new Set(groupedData.map(item => item.logistic_company).filter(Boolean)));

        console.log('📊 [PackingListDateDetail] 요약 정보 계산:', {
          totalBoxes,
          totalProducts,
          totalQuantity,
          logisticCompanies
        });

        setSummary({
          totalBoxes,
          totalProducts,
          totalQuantity,
          logisticCompanies
        });

        console.log('📊 [PackingListDateDetail] 데이터 로드 완료:', {
          date: displayDate,
          totalGroups: groupedData.length,
          totalBoxes,
          totalProducts,
          logisticCompanies
        });
      } else {
        throw new Error(result.error || '패킹 리스트 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ [PackingListDateDetail] 데이터 조회 오류:', error);
      setError(error.message);
      toast.error('데이터 조회에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 권한 확인
  const checkUserRole = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        const adminStatus = Boolean(userData.is_admin);
        setIsAdmin(adminStatus);
        console.log('🔐 [PackingListDateDetail] 사용자 권한 확인:', {
          is_admin: userData.is_admin,
          isAdmin: adminStatus,
          userData: userData
        });
      } else {
        console.error('❌ [PackingListDateDetail] 권한 확인 API 응답 실패:', response.status, response.statusText);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('❌ [PackingListDateDetail] 사용자 권한 확인 오류:', error);
      setIsAdmin(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (date) {
      console.log('📅 [PackingListDateDetail] 날짜 파라미터 감지:', date);
      checkUserRole();
      fetchPackingData();
    } else {
      console.log('⚠️ [PackingListDateDetail] 날짜 파라미터가 없음');
      setLoading(false);
    }
  }, [date]);

  // 뒤로 가기
  const handleGoBack = () => {
    navigate('/dashboard/mj-packing-list');
  };

  // 인쇄 모달 열기
  const handlePrint = () => {
    if (packingData.length === 0) {
      toast.error('인쇄할 데이터가 없습니다.');
      return;
    }
    setIsPrintModalOpen(true);
  };

  // 인쇄 모달 닫기
  const handleClosePrintModal = () => {
    setIsPrintModalOpen(false);
  };

  // 편집 페이지로 이동
  const handleEdit = () => {
    if (!isAdmin) {
      toast.error('편집은 관리자만 가능합니다.');
      return;
    }

    // 날짜별 패킹리스트 편집 페이지로 이동
    // URL 파라미터로 날짜 정보 전달
    navigate(`/dashboard/mj-packing-list/edit?date=${encodeURIComponent(date)}`);
  };

  // 삭제 미리보기 열기
  const openDeletePreview = () => {
    if (!isAdmin) {
      toast.error('삭제는 관리자만 가능합니다.');
      return;
    }

    // 삭제할 데이터 미리보기 정보 생성
    const affectedProjects = [...new Set(packingData.map(item => item.project_id).filter(Boolean))];
    const packingCodes = [...new Set(packingData.map(item => item.packing_code))];
    
    setDeletePreviewData({
      date: displayDate,
      totalItems: packingData.length,
      totalBoxes: summary.totalBoxes,
      totalQuantity: summary.totalQuantity,
      affectedProjects: affectedProjects.length,
      packingCodes: packingCodes.length,
      logisticCompanies: summary.logisticCompanies.length,
      packingData: packingData.slice(0, 5) // 처음 5개만 미리보기
    });
    
    setIsDeletePreviewOpen(true);
  };

  // 삭제 미리보기 닫기
  const closeDeletePreview = () => {
    setIsDeletePreviewOpen(false);
    setDeletePreviewData(null);
  };

  // 실제 삭제 실행
  const executeDelete = async () => {
    if (!isAdmin) {
      toast.error('삭제는 관리자만 가능합니다.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      console.log('🗑️ [PackingListDateDetail] 날짜별 삭제 시작:', {
        date,
        displayDate,
        totalItems: packingData.length,
        timestamp: new Date().toISOString()
      });

      // 삭제 미리보기 모달 닫기
      closeDeletePreview();

      // 로딩 토스트 표시
      toast.loading('패킹리스트를 삭제하는 중...');

      // 날짜별 단일 API 호출로 변경
      const response = await fetch(`/api/packing-list/by-date/${date}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      toast.dismiss();

      if (result.success) {
        console.log('✅ [PackingListDateDetail] 삭제 성공:', {
          deletedCount: result.deletedCount,
          affectedProjects: result.affectedProjects,
          date: result.date
        });

        toast.success(`${result.message}\n${result.deletedCount}개 항목이 삭제되었습니다.`);
        
        // 목록 페이지로 이동
        setTimeout(() => {
          navigate('/dashboard/mj-packing-list');
        }, 1500);
      } else {
        console.error('❌ [PackingListDateDetail] 삭제 실패:', result);
        toast.error(result.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ [PackingListDateDetail] 삭제 오류:', {
        error: error.message,
        stack: error.stack,
        date,
        timestamp: new Date().toISOString()
      });
      toast.dismiss();
      toast.error('삭제 중 오류가 발생했습니다: ' + error.message);
    }
  };





  if (!date) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                패킹리스트 상세
              </h1>
              <p className="text-gray-600">날짜를 선택하여 패킹리스트 상세 정보를 확인할 수 있습니다.</p>
            </div>
            
            <button
              onClick={handleGoBack}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="text-yellow-600 mb-4">
            <Calendar className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            날짜를 선택해주세요
          </h2>
          <p className="text-yellow-700 mb-4">
            MJPackingList에서 특정 날짜의 상세보기 아이콘을 클릭하여<br />
            해당 날짜의 패킹리스트 상세 정보를 확인할 수 있습니다.
          </p>
          <button
            onClick={handleGoBack}
            className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            패킹리스트로 돌아가기
          </button>
        </div>
      </div>
    );
  }

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
          onClick={handleGoBack}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {displayDate} 패킹리스트 상세
            </h1>
            <p className="text-gray-600">해당 출고일자의 모든 패킹리스트 정보를 확인할 수 있습니다.</p>
          </div>
          
          {/* 액션 버튼들 */}
          <div className="flex space-x-3 no-print">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </button>
            
            {/* 인쇄 버튼 */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <Printer className="w-4 h-4 mr-2" />
              인쇄
            </button>
            
            {/* Admin 권한 사용자에게만 편집 버튼 표시 */}
            {isAdmin && (
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                편집
              </button>
            )}
            {/* Admin 권한 사용자에게만 전체 삭제 버튼 표시 */}
            {isAdmin && (
              <button
                onClick={openDeletePreview}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                전체 삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 요약 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 포장코드</p>
              <p className="text-2xl font-bold text-gray-900">{packingData.length}개</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Box className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 박스수</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalBoxes.toLocaleString()}박스</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">물류회사</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.logisticCompanies.length > 0 ? summary.logisticCompanies.join(', ') : '미지정'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 웹 화면용 컨테이너 */}
      <div className="web-only bg-white shadow-md rounded-lg overflow-hidden">
        {/* 패킹리스트 상세 테이블 */}
        <div className="overflow-x-auto">
          <table className="min-w-full web-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  번호
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품명
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품 이미지
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  소포장 구성
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  포장수
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  한박스 내 수량
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {packingData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    해당 날짜의 패킹리스트가 없습니다.
                  </td>
                </tr>
              ) : (
                packingData.map((packingGroup, groupIndex) => (
                  <React.Fragment key={packingGroup.packing_code}>
                    {/* 포장코드 그룹 헤더 */}
                    <tr className="web-group-header">
                      <td colSpan="6" className="px-6 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="text-lg font-bold text-gray-900">
                              📦 포장코드: {packingGroup.packing_code}
                            </span>
                            <span className="text-lg font-bold text-blue-600">
                              총 {packingGroup.box_count ? packingGroup.box_count.toLocaleString() : '0'} 박스
                            </span>
                            <span className="text-lg font-bold text-purple-600">
                              물류회사: {packingGroup.logistic_company || '미지정'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            상품 종류: {packingGroup.products.length}개
                          </span>
                        </div>
                      </td>
                    </tr>
                    
                    {packingGroup.products.map((product, productIndex) => (
                      <tr 
                        key={`${packingGroup.packing_code}-${productIndex}`} 
                        className={`hover:bg-gray-50 ${
                          productIndex === 0 ? 'border-t-0' : 'border-t border-gray-100'
                        }`}
                      >
                        {/* 번호 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                          {groupIndex + 1}-{productIndex + 1}
                        </td>
                        
                        {/* 상품명 */}
                        <td className="px-6 py-4 text-sm text-gray-900 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {product.product_name}
                          </span>
                        </td>
                        
                        {/* 상품 이미지 */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex-shrink-0 h-12 w-12 mx-auto">
                            {product.product_image ? (
                              <img
                                src={product.product_image}
                                alt={product.product_name || '상품 이미지'}
                                className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center ${
                                product.product_image ? 'hidden' : 'flex'
                              }`}
                            >
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          </div>
                        </td>
                        
                        {/* 소포장 구성 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                          {product.packaging_method || 0} 개
                        </td>
                        
                        {/* 포장수 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                          {product.packaging_count || 0} 개
                        </td>
                        
                        {/* 한박스 내 수량 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                          <span className="font-bold">
                            {product.packaging_method && product.packaging_count && product.packaging_method > 0 && product.packaging_count > 0
                              ? `${(product.packaging_method * product.packaging_count).toLocaleString()} 개/박스`
                              : '-'
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 인쇄 모달 */}
      <PackingListDetailPrints
        isOpen={isPrintModalOpen}
        onClose={handleClosePrintModal}
        packingData={packingData.flatMap(group => group.products.map(product => ({
          ...product,
          packing_code: group.packing_code,
          box_count: group.box_count,
          logistic_company: group.logistic_company
        })))}
        selectedDate={displayDate}
        summary={summary}
      />

      {/* 삭제 미리보기 모달 */}
      {isDeletePreviewOpen && deletePreviewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">삭제 확인</h2>
                    <p className="text-gray-600">다음 데이터가 삭제됩니다</p>
                  </div>
                </div>
                <button
                  onClick={closeDeletePreview}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 삭제 정보 */}
              <div className="space-y-4 mb-6">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">삭제 대상 정보</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">출고일자:</span>
                      <span className="ml-2 font-medium">{deletePreviewData.date}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">총 항목 수:</span>
                      <span className="ml-2 font-medium text-red-600">{deletePreviewData.totalItems}개</span>
                    </div>
                    <div>
                      <span className="text-gray-600">총 박스 수:</span>
                      <span className="ml-2 font-medium text-red-600">{deletePreviewData.totalBoxes}박스</span>
                    </div>
                    <div>
                      <span className="text-gray-600">총 수량:</span>
                      <span className="ml-2 font-medium text-red-600">{deletePreviewData.totalQuantity.toLocaleString()}개</span>
                    </div>
                    <div>
                      <span className="text-gray-600">영향받는 프로젝트:</span>
                      <span className="ml-2 font-medium text-red-600">{deletePreviewData.affectedProjects}개</span>
                    </div>
                    <div>
                      <span className="text-gray-600">포장코드 수:</span>
                      <span className="ml-2 font-medium text-red-600">{deletePreviewData.packingCodes}개</span>
                    </div>
                  </div>
                </div>

                {/* 미리보기 데이터 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">삭제될 상품 미리보기</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {deletePreviewData.packingData.map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm py-1 border-b border-gray-200 last:border-b-0">
                        <div className="flex-1">
                          <span className="font-medium">{item.packing_code}</span>
                          <span className="text-gray-500 ml-2">- {item.product_name}</span>
                        </div>
                        <div className="text-gray-600">
                          {item.box_count}박스 × {item.packaging_count}개
                        </div>
                      </div>
                    ))}
                    {deletePreviewData.totalItems > 5 && (
                      <div className="text-center text-gray-500 text-sm py-2">
                        ... 외 {deletePreviewData.totalItems - 5}개 항목
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 경고 메시지 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">주의사항</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>이 작업은 되돌릴 수 없습니다.</li>
                        <li>관련된 프로젝트의 출고 수량이 자동으로 재계산됩니다.</li>
                        <li>물류 결제 정보도 함께 삭제됩니다.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeDeletePreview}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={executeDelete}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
                >
                  삭제 실행
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PackingListDateDetail; 