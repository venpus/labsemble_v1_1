import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Package, Edit, Trash2 } from 'lucide-react';

const PackingListDetail = () => {
  const { packingCode } = useParams();
  const navigate = useNavigate();
  const [packingList, setPackingList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // 사용자 권한 확인
  const checkUserRole = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAdmin(false);
        return;
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
        console.log('🔐 [PackingListDetail] 사용자 권한 확인:', {
          is_admin: userData.is_admin,
          isAdmin: adminStatus
        });
      }
    } catch (error) {
      console.error('❌ [PackingListDetail] 사용자 권한 확인 오류:', error);
      setIsAdmin(false);
    }
  };

  // 특정 포장코드의 패킹 리스트 데이터 가져오기
  const fetchPackingListDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const response = await fetch(`/api/packing-list/by-packing-code/${packingCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('패킹 리스트 상세 조회에 실패했습니다.');
      }

      const result = await response.json();
      
      if (result.success) {
        setPackingList(result.data);
        console.log('📊 [PackingListDetail] 패킹 리스트 상세 데이터 로드 완료:', result.data);
      } else {
        throw new Error(result.error || '패킹 리스트 상세 조회에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ [PackingListDetail] 패킹 리스트 상세 조회 오류:', error);
      setError(error.message);
      toast.error('패킹 리스트 상세 조회에 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (packingCode) {
      checkUserRole();
      fetchPackingListDetail();
    }
  }, [packingCode]);

  // 뒤로 가기
  const handleGoBack = () => {
    navigate('/dashboard/mj-packing-list');
  };

  // 패킹 리스트 편집 페이지로 이동
  const handleEdit = () => {
    navigate(`/dashboard/mj-packing-list/edit/${packingCode}`);
  };

  // 패킹 리스트 삭제
  const handleDelete = async () => {
    if (!isAdmin) {
      toast.error('삭제는 관리자만 가능합니다.');
      return;
    }

    if (!packingCode) {
      toast.error('삭제할 포장코드를 찾을 수 없습니다.');
      return;
    }

    // 사용자 확인
    const isConfirmed = window.confirm(
      `포장코드 "${packingCode}"의 모든 패킹리스트를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      console.log('🗑️ [PackingListDetail] 삭제 시작:', packingCode);
      toast.loading('패킹리스트를 삭제하는 중...');

      const response = await fetch(`/api/packing-list/packing-code/${packingCode}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      toast.dismiss();

      if (result.success) {
        console.log('✅ [PackingListDetail] 삭제 성공:', result);
        toast.success(`${result.message}\n${result.deletedCount}개 항목이 삭제되었습니다.`);
        
        // 목록 페이지로 이동
        setTimeout(() => {
          navigate('/dashboard/mj-packing-list');
        }, 1500);
      } else {
        console.error('❌ [PackingListDetail] 삭제 실패:', result);
        toast.error(result.message || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ [PackingListDetail] 삭제 오류:', error);
      toast.dismiss();
      toast.error('삭제 중 오류가 발생했습니다: ' + error.message);
    }
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
          onClick={handleGoBack}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  if (!packingList || packingList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64">
        <div className="text-gray-600 text-lg mb-4">해당 포장코드의 데이터를 찾을 수 없습니다</div>
        <button
          onClick={handleGoBack}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  // 포장코드별로 그룹화된 요약 정보
  const summary = {
    totalProducts: packingList.length,
    totalBoxCount: packingList[0]?.box_count || 0,
    totalQuantity: packingList.reduce((sum, item) => {
      const quantity = (item.packaging_method || 0) * (item.packaging_count || 0);
      return sum + quantity;
    }, 0)
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleGoBack}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="목록으로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">포장코드: {packingCode}</h1>
              <p className="text-gray-600">패킹 리스트 상세 정보</p>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            편집
          </button>
          {isAdmin ? (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
              title="포장코드의 모든 패킹리스트 삭제"
            >
              <Trash2 className="w-4 h-4" />
              전체 삭제
            </button>
          ) : (
            <span className="px-4 py-2 bg-gray-300 text-gray-500 rounded flex items-center gap-2 cursor-not-allowed">
              <Trash2 className="w-4 h-4" />
              권한 없음
            </span>
          )}
        </div>
      </div>

      {/* 요약 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">총 상품 수</div>
          <div className="text-2xl font-bold text-blue-800">{summary.totalProducts}개</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600 font-medium">박스 수</div>
          <div className="text-2xl font-bold text-green-800">{summary.totalBoxCount.toLocaleString()}박스</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-purple-600 font-medium">총 수량</div>
          <div className="text-2xl font-bold text-purple-800">{summary.totalQuantity.toLocaleString()}개</div>
        </div>
      </div>

      {/* 상품 상세 테이블 */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">상품 상세 정보</h2>
        </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일시
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {packingList.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {item.product_name}
                    </span>
                  </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     {item.product_image ? (
                       <div className="flex items-center justify-center">
                         <img
                           src={item.product_image}
                           alt={item.product_name}
                           className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm"
                           onError={(e) => {
                             e.target.style.display = 'none';
                             e.target.nextSibling.style.display = 'block';
                           }}
                         />
                         <div className="hidden text-xs text-gray-500 text-center">
                           이미지 없음
                         </div>
                       </div>
                     ) : (
                       <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                         <span className="text-xs text-gray-500">이미지 없음</span>
                       </div>
                     )}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     {item.packaging_method || 0}
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.packaging_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {item.quantity_per_box ? `${item.quantity_per_box.toLocaleString()} 개/박스` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PackingListDetail; 