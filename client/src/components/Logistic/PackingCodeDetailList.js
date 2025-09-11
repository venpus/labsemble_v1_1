import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Box, Package, Calendar, Truck, Eye, Edit, Trash2, Printer } from 'lucide-react';
import PackingCodeDetailPrint from './PackingCodeDetailPrint';

const PackingCodeDetailList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const date = searchParams.get('date');
  const [packingData, setPackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [summary, setSummary] = useState({
    totalQuantity: 0,
    totalProducts: 0,
    totalBoxes: 0,
    totalPackingCodes: 0,
    logisticCompanies: []
  });

  // 인쇄 모달 상태
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // URL 파라미터에서 날짜 정보 추출
  const displayDate = date === 'no-date' ? '날짜 미지정' : date;

  // 패킹리스트 데이터 가져오기
  const fetchPackingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      console.log(' [PackingCodeDetailList] API 호출 시작:', { 
        date, 
        displayDate,
        url: '/api/packing-list'
      });

      const response = await fetch('/api/packing-list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`패킹 리스트 조회에 실패했습니다. (${response.status})`);
      }

      const result = await response.json();
      
      console.log(' [PackingCodeDetailList] API 응답 상세:', {
        success: result.success,
        dataLength: result.data ? result.data.length : 0,
        sampleData: result.data ? result.data.slice(0, 2) : null,
        // 실제 pl_date 값들 확인
        plDateValues: result.data ? result.data.map(item => ({
          pl_date: item.pl_date,
          pl_date_type: typeof item.pl_date,
          packing_code: item.packing_code
        })).slice(0, 5) : null
      });

      if (result.success) {
        // 특정 날짜의 데이터만 필터링
        let filteredData;
        if (date === 'no-date') {
          filteredData = result.data.filter(item => !item.pl_date || item.pl_date === null || item.pl_date === '');
        } else {
          // 날짜 형식 정규화 - 다양한 형식 지원
          const normalizeDate = (dateStr) => {
            if (!dateStr) return null;
            
            // 이미 YYYY-MM-DD 형식인 경우
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              return dateStr;
            }
            
            // Date 객체로 변환 후 YYYY-MM-DD 형식으로 정규화
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return null;
            return date.toISOString().split('T')[0];
          };
          
          const normalizedSearchDate = normalizeDate(date);
          console.log('🔍 [PackingCodeDetailList] 날짜 정규화:', {
            originalDate: date,
            normalizedSearchDate,
            searchDateType: typeof date
          });
          
          // 더 강력한 날짜 비교 로직
          filteredData = result.data.filter(item => {
            const itemDate = normalizeDate(item.pl_date);
            
            // 정확한 날짜 매치
            const exactMatch = itemDate === normalizedSearchDate;
            
            // 문자열 직접 비교 (백업)
            const stringMatch = item.pl_date === date;
            
            const isMatch = exactMatch || stringMatch;
            
            console.log('🔍 [PackingCodeDetailList] 날짜 비교:', {
              itemDate,
              normalizedSearchDate,
              originalItemDate: item.pl_date,
              originalSearchDate: date,
              exactMatch,
              stringMatch,
              isMatch,
              packing_code: item.packing_code
            });
            
            return isMatch;
          });
        }
        
        console.log('✅ [PackingCodeDetailList] 필터링 결과:', {
          date,
          displayDate,
          totalDataCount: result.data.length,
          filteredDataCount: filteredData.length,
          filterCondition: date === 'no-date' ? 'pl_date가 null/empty' : `pl_date === '${date}'`,
          sampleFilteredData: filteredData.slice(0, 3)
        });

        // 데이터가 없는 경우 처리
        if (filteredData.length === 0) {
          console.log('⚠️ [PackingCodeDetailList] 필터링된 데이터가 없음 - 원본 데이터 재확인');
          console.log('🔍 [PackingCodeDetailList] 원본 데이터의 pl_date 값들:', 
            result.data.map(item => ({
              pl_date: item.pl_date,
              pl_date_type: typeof item.pl_date,
              packing_code: item.packing_code
            })).slice(0, 10)
          );
          console.log('🔍 [PackingCodeDetailList] 검색 조건:', {
            searchDate: date,
            searchDateType: typeof date,
            totalDataCount: result.data.length
          });
          setPackingData([]);
          setSummary({
            totalQuantity: 0,
            totalProducts: 0,
            totalBoxes: 0,
            totalPackingCodes: 0,
            logisticCompanies: []
          });
          return;
        }

        // 제품별로 그룹화하여 총 수량과 포함된 포장코드 정보 포함
        const groupedData = filteredData.reduce((acc, item) => {
          console.log(' [PackingCodeDetailList] 처리 중인 아이템:', {
            packing_code: item.packing_code,
            box_count: item.box_count,
            product_name: item.product_name,
            product_sku: item.product_sku,
            project_id: item.project_id,
            project_name: item.project_name,
            client_product_id: item.client_product_id,
            pl_date: item.pl_date
          });

          // 같은 제품인지 판단
          // 1. project_id가 있는 경우: project_id, product_name, product_sku가 모두 같으면 같은 제품
          // 2. project_id가 없는 경우: product_name만 같으면 같은 제품 (SKU 무관)
          const existingProduct = acc.find(product => {
            if (item.project_id && product.project_id) {
              // 둘 다 project_id가 있는 경우: project_id, product_name, product_sku 모두 비교
              return product.project_id === item.project_id &&
                     product.product_name === item.product_name &&
                     product.product_sku === item.product_sku;
            } else if (!item.project_id && !product.project_id) {
              // 둘 다 project_id가 없는 경우: product_name만 비교 (SKU는 무시)
              return product.product_name === item.product_name;
            }
            // 하나만 project_id가 있는 경우: 다른 제품으로 처리
            return false;
          });
          
          if (existingProduct) {
            // 기존 제품에 포장코드 정보 추가
            const itemQuantity = (item.box_count || 0) * (item.packaging_count || 0) * (item.packaging_method || 0);
            existingProduct.total_quantity += itemQuantity;
            
            // 포장코드 정보 추가 (중복 방지)
            const existingPackingCode = existingProduct.packing_codes.find(pc => pc.packing_code === item.packing_code);
            if (!existingPackingCode) {
              existingProduct.packing_codes.push({
                packing_code: item.packing_code,
                box_count: item.box_count || 0,
                calculated_quantity: itemQuantity
              });
            }
          } else {
            // 새로운 제품 그룹 생성
            const itemQuantity = (item.box_count || 0) * (item.packaging_count || 0) * (item.packaging_method || 0);
            acc.push({
              product_name: item.product_name,
              product_sku: item.product_sku,
              product_image: item.product_image,
              project_id: item.project_id,
              project_name: item.project_name,
              client_product_id: item.client_product_id,
              total_quantity: itemQuantity,
              packing_codes: [{
                packing_code: item.packing_code,
                box_count: item.box_count || 0,
                calculated_quantity: itemQuantity
              }]
            });
          }
          
          return acc;
        }, []);
        
        // 제품명 순으로 정렬
        groupedData.sort((a, b) => a.product_name.localeCompare(b.product_name));
        
        // 중복 제품 확인 (디버깅용)
        const duplicateCheck = {};
        groupedData.forEach(group => {
          // project_id가 있으면 project_id + product_name + product_sku로 키 생성
          // project_id가 없으면 product_name만으로 키 생성 (SKU 무관)
          const key = group.project_id ? 
            `${group.project_id}_${group.product_name}_${group.product_sku}` : 
            `no-project_${group.product_name}`;
            
          if (duplicateCheck[key]) {
            console.warn('⚠️ [PackingCodeDetailList] 중복 제품 발견:', {
              product_name: group.product_name,
              product_sku: group.product_sku,
              project_id: group.project_id,
              comparison_rule: group.project_id ? 'project_id + product_name + product_sku' : 'product_name only',
              existing_group: duplicateCheck[key]
            });
          } else {
            duplicateCheck[key] = group;
          }
        });
        
        console.log('✅ [PackingCodeDetailList] 그룹화된 데이터:', {
          groupCount: groupedData.length,
          groups: groupedData.map(group => ({
            product_name: group.product_name,
            product_sku: group.product_sku,
            project_id: group.project_id,
            project_name: group.project_name,
            total_quantity: group.total_quantity,
            packing_codes_count: group.packing_codes.length,
            packing_codes: group.packing_codes.map(pc => pc.packing_code)
          }))
        });
        
        setPackingData(groupedData);
        
        // 요약 정보 계산 (제품별 기준)
        const totalQuantity = groupedData.reduce((sum, item) => sum + item.total_quantity, 0);
        const totalProducts = groupedData.length;
        
        // 총 박스수: 해당 날짜의 패킹리스트에 포함된 고유한 포장코드의 박스수 합계
        const uniquePackingCodes = Array.from(new Set(filteredData.map(item => item.packing_code)));
        const totalBoxes = uniquePackingCodes.reduce((sum, packingCode) => {
          const packingCodeData = filteredData.find(item => item.packing_code === packingCode);
          return sum + (packingCodeData?.box_count || 0);
        }, 0);
        
        const totalPackingCodes = uniquePackingCodes.length;
        const logisticCompanies = Array.from(new Set(filteredData.map(item => item.logistic_company).filter(Boolean)));
        
        setSummary({
          totalQuantity,
          totalProducts,
          totalBoxes,
          totalPackingCodes,
          logisticCompanies
        });
        
        console.log('✅ [PackingCodeDetailList] 제품별 데이터 로드 완료:', {
          date: displayDate,
          totalProducts: groupedData.length,
          totalQuantity,
          totalBoxes,
          totalPackingCodes,
          logisticCompanies
        });
      } else {
        throw new Error(result.error || '패킹 리스트 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ [PackingCodeDetailList] 데이터 조회 오류:', error);
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
        console.log('🔐 [PackingCodeDetailList] 사용자 권한 확인:', {
          is_admin: userData.is_admin,
          isAdmin: adminStatus
        });
      }
    } catch (error) {
      console.error('❌ [PackingCodeDetailList] 사용자 권한 확인 오류:', error);
      setIsAdmin(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (date) {
      console.log(' [PackingCodeDetailList] 날짜 파라미터 감지:', { date, displayDate });
      checkUserRole();
      fetchPackingData();
    } else {
      console.log('⚠️ [PackingCodeDetailList] 날짜 파라미터가 없음');
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

  // 포장코드 상세 페이지로 이동
  const handlePackingCodeDetail = (packingCode) => {
    navigate(`/dashboard/mj-packing-list/detail/${packingCode}`);
  };

  // 편집 페이지로 이동
  const handleEdit = () => {
    toast.info('편집 기능은 준비 중입니다.');
  };

  // 전체 삭제
  const handleDelete = async () => {
    if (!window.confirm(`정말로 ${displayDate}의 모든 포장코드를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      // 해당 날짜의 모든 포장코드 삭제
      const deletePromises = packingData.map(item => 
        fetch(`/api/packing-list/packing-code/${item.packing_code}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      );

      await Promise.all(deletePromises);
      
      toast.success(`${displayDate}의 모든 포장코드가 삭제되었습니다.`);
      navigate('/dashboard/mj-packing-list');
    } catch (error) {
      console.error('❌ [PackingCodeDetailList] 삭제 오류:', error);
      toast.error('삭제에 실패했습니다: ' + error.message);
    }
  };

  if (!date) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                제품별 리스트
              </h1>
              <p className="text-gray-600">날짜를 선택하여 제품별 리스트를 확인할 수 있습니다.</p>
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
            MJPackingList에서 특정 날짜의 제품별리스트 아이콘을 클릭하여<br />
            해당 날짜의 제품별 리스트를 확인할 수 있습니다.
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
              {displayDate} 제품별 리스트
            </h1>
            <p className="text-gray-600">해당 출고일자의 제품별 총 수량과 포함된 포장코드 정보를 확인할 수 있습니다.</p>
          </div>
          
          {/* 액션 버튼들 */}
          <div className="flex space-x-3">
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
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                전체 삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 요약 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 제품수</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalProducts}개</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Box className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 수량</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalQuantity.toLocaleString()}개</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Box className="w-6 h-6 text-orange-600" />
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

      {/* 데이터가 없는 경우 안내 메시지 */}
      {packingData.length === 0 && !loading && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center mb-8">
          <div className="text-blue-600 mb-4">
            <Package className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-blue-800 mb-2">
            제품 데이터가 없습니다
          </h2>
          <p className="text-blue-700 mb-4">
            <strong>{displayDate}</strong> 출고일자에 해당하는 제품 데이터가 없습니다.<br />
            패킹리스트를 먼저 생성해주세요.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleGoBack}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              패킹리스트로 돌아가기
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('/dashboard/mj-packing-list/create')}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                새 패킹리스트 생성
              </button>
            )}
          </div>
        </div>
      )}

      {/* 제품별 리스트 테이블 */}
      {packingData.length > 0 && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제품명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 개수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    포함 포장 코드
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    포함된 박스수
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packingData.map((item, index) => {
                  // 해당 제품이 포함된 총 박스수 계산
                  const totalBoxes = item.packing_codes.reduce((sum, pc) => sum + pc.box_count, 0);
                  
                  return (
                    <tr key={item.project_id ? 
                      `${item.project_id}_${item.product_name}_${item.product_sku}` : 
                      `no-project_${item.product_name}`} 
                      className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        <div className="flex items-center">
                          {item.product_image ? (
                            <img 
                              src={item.product_image} 
                              alt={item.product_name}
                              className="w-8 h-8 rounded-lg object-cover mr-3"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center mr-3">
                              <Package className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-900">
                              {item.product_name}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              <div>SKU: {item.product_sku}</div>
                              {item.project_id && (
                                <div>프로젝트: {item.project_name || `ID ${item.project_id}`}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Box className="w-4 h-4 mr-2 text-green-500" />
                          <span className="font-bold text-lg text-green-700">
                            {item.total_quantity.toLocaleString()}개
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="space-y-1 max-w-md">
                          {item.packing_codes.map((packingCode, pcIndex) => (
                            <div key={pcIndex} className="flex items-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                <Package className="w-3 h-3 mr-1" />
                                {packingCode.packing_code}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Box className="w-4 h-4 mr-2 text-orange-500" />
                          <span className="font-bold text-lg text-orange-700">
                            {totalBoxes.toLocaleString()}박스
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 인쇄 모달 */}
      <PackingCodeDetailPrint
        isOpen={isPrintModalOpen}
        onClose={handleClosePrintModal}
        packingData={packingData}
        selectedDate={displayDate}
        summary={summary}
      />

    </div>
  );
};

export default PackingCodeDetailList; 