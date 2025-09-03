import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Box, Package, Calendar, Truck, Eye, Edit, Trash2 } from 'lucide-react';

const PackingCodeDetailList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const date = searchParams.get('date');
  const [packingData, setPackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [summary, setSummary] = useState({
    totalBoxes: 0,
    totalPackingCodes: 0,
    totalProducts: 0,
    logisticCompanies: []
  });

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
            totalBoxes: 0,
            totalPackingCodes: 0,
            totalProducts: 0,
            logisticCompanies: []
          });
          return;
        }

        // 포장코드별로 그룹화하여 박스수 정보 포함
        const groupedData = filteredData.reduce((acc, item) => {
          console.log(' [PackingCodeDetailList] 처리 중인 아이템:', {
            packing_code: item.packing_code,
            box_count: item.box_count,
            product_name: item.product_name,
            pl_date: item.pl_date
          });

          const existingGroup = acc.find(group => group.packing_code === item.packing_code);
          
          if (existingGroup) {
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
              console.warn(`⚠️ [PackingCodeDetailList] ${existingGroup.packing_code}의 box_count 불일치: 기존 ${existingGroup.box_count} vs 현재 ${item.box_count}`);
            }
          } else {
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
        
        // 포장코드 순으로 정렬
        groupedData.sort((a, b) => a.packing_code.localeCompare(b.packing_code));
        
        console.log(' [PackingCodeDetailList] 그룹화된 데이터:', {
          groupCount: groupedData.length,
          groups: groupedData.map(group => ({
            packing_code: group.packing_code,
            box_count: group.box_count,
            product_count: group.products.length,
            logistic_company: group.logistic_company
          }))
        });
        
        setPackingData(groupedData);
        
        // 요약 정보 계산
        // 각 packing_code별로 box_count 하나씩만 합산 (중복 제거)
        const totalBoxes = groupedData.reduce((sum, item) => {
          const boxCount = item.box_count || 0;
          console.log(` [PackingCodeDetailList] ${item.packing_code} 박스수: ${boxCount} (포장코드별 1회만 합산)`);
          return sum + boxCount;
        }, 0);
        
        // 모든 상품 개수 합산 (중복 포함)
        const totalProducts = groupedData.reduce((sum, item) => sum + item.products.length, 0);
        const logisticCompanies = Array.from(new Set(groupedData.map(item => item.logistic_company).filter(Boolean)));
        
        setSummary({
          totalBoxes,
          totalPackingCodes: groupedData.length,
          totalProducts,
          logisticCompanies
        });
        
        console.log('✅ [PackingCodeDetailList] 포장코드별 데이터 로드 완료:', {
          date: displayDate,
          totalPackingCodes: groupedData.length,
          totalBoxes,
          totalProducts,
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
        setIsAdmin(userData.role === 'admin');
        console.log(' [PackingCodeDetailList] 사용자 권한 확인:', {
          role: userData.role,
          isAdmin: userData.role === 'admin'
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
                포장별 리스트
              </h1>
              <p className="text-gray-600">날짜를 선택하여 포장코드별 리스트를 확인할 수 있습니다.</p>
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
            MJPackingList에서 특정 날짜의 포장별리스트 아이콘을 클릭하여<br />
            해당 날짜의 포장코드별 리스트를 확인할 수 있습니다.
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
              {displayDate} 포장별 리스트
            </h1>
            <p className="text-gray-600">해당 출고일자의 포장코드별 박스수 정보를 확인할 수 있습니다.</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 포장코드</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalPackingCodes}개</p>
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
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 상품수</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalProducts}개</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Truck className="w-6 h-6 text-orange-600" />
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
            포장코드 데이터가 없습니다
          </h2>
          <p className="text-blue-700 mb-4">
            <strong>{displayDate}</strong> 출고일자에 해당하는 포장코드 데이터가 없습니다.<br />
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

      {/* 포장코드별 리스트 테이블 */}
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
                    포장코드
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    박스수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    물류회사
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    포함 상품
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상세보기
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packingData.map((item, index) => (
                  <tr key={item.packing_code} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                          <Package className="w-4 h-4 mr-2" />
                          {item.packing_code}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Box className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="font-semibold text-lg text-gray-700">
                          {item.box_count.toLocaleString()} 박스
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {item.logistic_company ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            <Truck className="w-3 h-3 mr-1" />
                            {item.logistic_company}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">미지정</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1 max-w-md">
                        {item.products.map((product, productIndex) => (
                          <div key={productIndex} className="flex items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {product.product_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handlePackingCodeDetail(item.packing_code)}
                          className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title={`${item.packing_code} 포장코드 상세보기`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackingCodeDetailList; 