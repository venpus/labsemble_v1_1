import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, 
  Truck, 
  Warehouse, 
  TruckIcon,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

const MJProjectSummaryCards = () => {
  const { user } = useAuth();
  const [summaryData, setSummaryData] = useState({
    orderWaiting: 0,
    factoryShippingWaiting: 0,
    warehouseStatus: {
      waiting: 0,
      inProgress: 0,
      completed: 0
    },
    exportStatus: {
      waiting: 0,
      inProgress: 0,
      completed: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && (user.isAdmin || user.partnerName === 'MJ유통')) {
      fetchMJProjectSummary();
    } else {
      // 권한이 없는 경우 로딩 상태 해제
      setLoading(false);
    }
  }, [user]);

  const fetchMJProjectSummary = async () => {
    try {
      setLoading(true);
      setError(null); // 에러 상태 초기화
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }
      
      const response = await fetch('/api/mj-project', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        } else if (response.status === 403) {
          throw new Error('접근 권한이 없습니다.');
        } else {
          throw new Error(`서버 오류 (${response.status}): MJ 프로젝트 요약 데이터를 불러오는데 실패했습니다.`);
        }
      }

      const data = await response.json();
      
      if (data.success && data.projects) {
        const projects = data.projects;
        
        // 발주대기 프로젝트 수
        const orderWaiting = projects.filter(project => project.is_order_completed === 0).length;
        
        // 공장 출고대기 프로젝트 수
        const factoryShippingWaiting = projects.filter(project => 
          project.factory_shipping_status === '출고 대기'
        ).length;
        
        // 공장 출고완료 프로젝트 수
        const factoryShippingCompleted = projects.filter(project => 
          project.factory_shipping_status === '출고 완료'
        ).length;
        
        // 입고 상태별 프로젝트 수
        const warehouseStatus = {
          waiting: 0,
          inProgress: 0,
          completed: 0
        };
        
        // 출고 상태별 프로젝트 수
        const exportStatus = {
          waiting: 0,
          inProgress: 0,
          completed: 0
        };
        
        projects.forEach(project => {
          const projectQuantity = Number(project.quantity) || 0;
          const warehouseQuantity = Number(project.warehouse_quantity) || 0;
          const entryQuantity = Number(project.entry_quantity) || 0;
          const remainQuantity = Number(project.remain_quantity) || 0;
          const exportQuantity = Number(project.export_quantity) || 0;
          
          // 입고 상태 분류
          if (warehouseQuantity === 0) {
            warehouseStatus.waiting++;
          } else if (projectQuantity > warehouseQuantity) {
            warehouseStatus.inProgress++;
          } else if (projectQuantity === warehouseQuantity && warehouseQuantity > 0) {
            warehouseStatus.completed++;
          }
          
          // 출고 상태 분류 (remain_quantity와 export_quantity 기준으로 수정)
          if (entryQuantity === 0) {
            exportStatus.waiting++; // 입고대기
          } else if (remainQuantity === 0 && exportQuantity === projectQuantity && projectQuantity > 0) {
            exportStatus.completed++; // 출고완료
          } else if (remainQuantity > 0) {
            exportStatus.inProgress++; // 배송중
          } else {
            exportStatus.waiting++; // 기본값
          }
        });
        
        setSummaryData({
          orderWaiting,
          factoryShippingWaiting,
          factoryShippingCompleted,
          warehouseStatus,
          exportStatus
        });
      } else {
        setError(data.message || 'MJ 프로젝트 요약 데이터를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('MJ 프로젝트 요약 데이터 로딩 오류:', error);
      setError(error.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 권한이 없는 사용자는 컴포넌트를 렌더링하지 않음
  if (!user || (!user.isAdmin && user.partnerName !== 'MJ유통')) {
    return null;
  }

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">MJ 프로젝트 현황</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">MJ 프로젝트 현황</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <p className="text-red-700 font-medium">MJ 프로젝트 요약 데이터를 불러오는 중 오류가 발생했습니다</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button
                onClick={fetchMJProjectSummary}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">MJ 프로젝트 현황</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 발주대기 프로젝트 */}
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">발주대기</h3>
              <p className="text-3xl font-bold text-orange-600">{summaryData.orderWaiting}</p>
              <p className="text-sm text-gray-500">프로젝트</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* 공장 출고대기 프로젝트 */}
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">공장 출고대기</h3>
              <p className="text-3xl font-bold text-blue-600">{summaryData.factoryShippingWaiting}</p>
              <p className="text-sm text-gray-500">프로젝트</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* 공장 출고완료 프로젝트 */}
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">공장 출고완료</h3>
              <p className="text-3xl font-bold text-green-600">{summaryData.factoryShippingCompleted}</p>
              <p className="text-sm text-gray-500">프로젝트</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* 입고 상태별 프로젝트 */}
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">입고 현황</h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Warehouse className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">입고대기</span>
              <span className="text-sm font-semibold text-gray-800">{summaryData.warehouseStatus.waiting}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">입고중</span>
              <span className="text-sm font-semibold text-yellow-600">{summaryData.warehouseStatus.inProgress}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">입고완료</span>
              <span className="text-sm font-semibold text-green-600">{summaryData.warehouseStatus.completed}</span>
            </div>
          </div>
        </div>

        {/* 출고 상태별 프로젝트 */}
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">출고 현황</h3>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TruckIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">입고대기</span>
              <span className="text-sm font-semibold text-gray-800">{summaryData.exportStatus.waiting}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">배송중</span>
              <span className="text-sm font-semibold text-blue-600">{summaryData.exportStatus.inProgress}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">출고완료</span>
              <span className="text-sm font-semibold text-green-600">{summaryData.exportStatus.completed}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MJProjectSummaryCards;
