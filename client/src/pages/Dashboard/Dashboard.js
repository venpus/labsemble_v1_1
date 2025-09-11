import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Partners from './Admin/Partners';
import UserManage from './Admin/UserManage';
import AppUpdateManagement from './Admin/AppUpdateManagement';
import ProjectLists from '../../components/Project/MJ/ProjectLists';
import ProjectDetails from '../../components/Project/MJ/ProjectDetails';
import { MJCalendar } from '../../components/Calendar';
import { MJPackingList, MakePackingList, PackingListDetail, PackingListDateDetail, LogisticPayment, PackingCodeDetailList } from '../../components/Logistic';
import PackingListEdit from '../../components/Logistic/PackingListEdit';
import { Finance } from '../../components/Finance';
import MJProjectSummaryCards from '../../components/Dashboard/MJProjectSummaryCards';

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedMenu, setSelectedMenu] = useState('dashboard');
  const location = useLocation();

  useEffect(() => {
    // URL 경로에 따라 선택된 메뉴 설정
    const path = location.pathname;
    
    if (path.includes('/admin/partners')) {
      setSelectedMenu('partner-settings');
    } else if (path.includes('/admin/users')) {
      setSelectedMenu('user-management');
    } else if (path.includes('/admin/app-update')) {
      setSelectedMenu('app-update-management');
    } else if (path.includes('/admin')) {
      setSelectedMenu('admin-dashboard');
    } else if (path.includes('/mj-projects/') && path.split('/').length > 3) {
      setSelectedMenu('mj-project-details');
    } else if (path.includes('/mj-projects')) {
      setSelectedMenu('mj-projects');
    } else if (path.includes('/mj-calendar')) {
      setSelectedMenu('mj-calendar');
    } else if (path.includes('/mj-packing-list/packing-code-detail')) {
      setSelectedMenu('mj-packing-list-packing-codes');
    } else if (path.includes('/mj-packing-list/create')) {
      setSelectedMenu('mj-packing-list-create');
    } else if (path.includes('/mj-packing-list/edit')) {
      setSelectedMenu('mj-packing-list-edit');
    } else if (path.includes('/mj-packing-list/date/') || path.includes('/mj-packing-list/date-detail')) {
      setSelectedMenu('mj-packing-list-date-detail');
    } else if (path.includes('/mj-packing-list/logistic-payment')) {
      setSelectedMenu('mj-packing-list-logistic-payment');
    } else if (path.includes('/mj-packing-list/') && path.split('/').length > 3) {
      setSelectedMenu('mj-packing-list-detail');
    } else if (path.includes('/mj-packing-list')) {
      setSelectedMenu('mj-packing-list');
    } else if (path.includes('/finance')) {
      setSelectedMenu('finance');
    } else {
      setSelectedMenu('dashboard');
    }
    
  }, [location]);

  const renderContent = () => {
    
    switch (selectedMenu) {
      case 'partner-settings':
        return <Partners />;
      case 'user-management':
        return <UserManage />;
      case 'mj-projects':
        return <ProjectLists />;
      case 'mj-project-details':
        return <ProjectDetails />;
      case 'mj-calendar':
        return <MJCalendar />;
      case 'mj-packing-list':
        return <MJPackingList />;
      case 'mj-packing-list-create':
        return <MakePackingList />;
      case 'mj-packing-list-edit':
        return <PackingListEdit />;
      case 'mj-packing-list-detail':
        return <PackingListDetail />;
      case 'mj-packing-list-date-detail':
        return <PackingListDateDetail />;
      case 'mj-packing-list-logistic-payment':
        return <LogisticPayment />;
      case 'mj-packing-list-packing-codes':
        return <PackingCodeDetailList />;
      case 'finance':
        return <Finance />;
      case 'admin-dashboard':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">관리자 대시보드</h1>
            <p className="text-gray-600">관리자 전용 통계 및 현황이 여기에 표시됩니다.</p>
          </div>
        );
      case 'app-update-management':
        return <AppUpdateManagement />;
      default:
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              환영합니다, {user?.username}님!
            </h1>
            <p className="text-gray-600 mb-6">
              LABSEMBLE 대시보드에 오신 것을 환영합니다.
            </p>
            
            {/* MJ 프로젝트 요약 카드 (관리자 또는 MJ유통 파트너만 표시) */}
            {(user?.isAdmin || user?.partnerName === 'MJ유통') && (
              <MJProjectSummaryCards />
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">총 주문</h3>
                <p className="text-3xl font-bold text-blue-600">24</p>
                <p className="text-sm text-gray-500">이번 달</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">진행중</h3>
                <p className="text-3xl font-bold text-yellow-600">8</p>
                <p className="text-sm text-gray-500">현재 진행</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">완료</h3>
                <p className="text-3xl font-bold text-green-600">16</p>
                <p className="text-sm text-gray-500">이번 달</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">최근 활동</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">새로운 주문이 등록되었습니다.</span>
                    <span className="text-xs text-gray-400">2시간 전</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">주문 #1234가 완료되었습니다.</span>
                    <span className="text-xs text-gray-400">1일 전</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">견적 요청이 접수되었습니다.</span>
                    <span className="text-xs text-gray-400">2일 전</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} />
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard; 