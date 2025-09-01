import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Package, Calendar, Truck, Box } from 'lucide-react';

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
    logisticCompanies: []
  });

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
        const logisticCompanies = Array.from(new Set(groupedData.map(item => item.logistic_company).filter(Boolean)));

        console.log('📊 [PackingListDateDetail] 요약 정보 계산:', {
          totalBoxes,
          totalProducts,
          logisticCompanies
        });

        setSummary({
          totalBoxes,
          totalProducts,
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
        setIsAdmin(userData.role === 'admin');
        console.log('🔐 [PackingListDateDetail] 사용자 권한 확인:', {
          role: userData.role,
          isAdmin: userData.role === 'admin'
        });
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

  // 편집 페이지로 이동
  const handleEdit = () => {
    toast.info('편집 기능은 준비 중입니다.');
  };

  // 전체 삭제
  const handleDelete = async () => {
    if (!window.confirm(`정말로 ${displayDate}의 모든 패킹리스트를 삭제하시겠습니까?`)) {
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
      
      toast.success(`${displayDate}의 모든 패킹리스트가 삭제되었습니다.`);
      navigate('/dashboard/mj-packing-list');
    } catch (error) {
      console.error('❌ [PackingListDateDetail] 삭제 오류:', error);
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
          <div className="flex space-x-3">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
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

      {/* 패킹리스트 상세 테이블 */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상품 이미지
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  소포장 구성
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  포장수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
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
                            상품 수: {packingGroup.products.length}개 (모든 상품 포함)
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {groupIndex + 1}-{productIndex + 1}
                        </td>
                        
                        {/* 상품명 */}
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {product.product_name}
                          </span>
                        </td>
                        
                        {/* 상품 이미지 */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex-shrink-0 h-12 w-12">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.packaging_method || 0} 개
                        </td>
                        
                        {/* 포장수 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.packaging_count || 0} 개
                        </td>
                        
                        {/* 한박스 내 수량 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
    </div>
  );
};

export default PackingListDateDetail; 