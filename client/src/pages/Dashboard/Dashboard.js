import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Partners from './Admin/Partners';
import UserManage from './Admin/UserManage';
import ProjectLists from '../../components/Project/MJ/ProjectLists';
import ProjectDetails from '../../components/Project/MJ/ProjectDetails';
import { MJCalendar } from '../../components/Calendar';
import { MJPackingList, MakePackingList, PackingListDetail, PackingListDateDetail, LogisticPayment } from '../../components/Logistic';
import { Finance } from '../../components/Finance';

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedMenu, setSelectedMenu] = useState('dashboard');
  const location = useLocation();

  useEffect(() => {
    // URL 경로에 따라 선택된 메뉴 설정
    const path = location.pathname;
    console.log('🔍 [Dashboard] 현재 경로:', path);
    console.log('🔍 [Dashboard] 경로 분할:', path.split('/'));
    
    if (path.includes('/admin/partners')) {
      console.log('🔍 [Dashboard] admin/partners 감지');
      setSelectedMenu('partner-settings');
    } else if (path.includes('/admin/users')) {
      console.log('🔍 [Dashboard] admin/users 감지');
      setSelectedMenu('user-management');
    } else if (path.includes('/admin')) {
      console.log('🔍 [Dashboard] admin 감지');
      setSelectedMenu('admin-dashboard');
    } else if (path.includes('/mj-projects/') && path.split('/').length > 3) {
      console.log('🔍 [Dashboard] mj-projects 상세 감지');
      setSelectedMenu('mj-project-details');
    } else if (path.includes('/mj-projects')) {
      console.log('🔍 [Dashboard] mj-projects 감지');
      setSelectedMenu('mj-projects');
    } else if (path.includes('/mj-calendar')) {
      console.log('🔍 [Dashboard] mj-calendar 감지');
      setSelectedMenu('mj-calendar');
    } else if (path.includes('/mj-packing-list/create')) {
      console.log('🔍 [Dashboard] mj-packing-list/create 감지');
      setSelectedMenu('mj-packing-list-create');
    } else if (path.includes('/mj-packing-list/date/')) {
      console.log('🔍 [Dashboard] mj-packing-list/date 감지:', path);
      setSelectedMenu('mj-packing-list-date-detail');
    } else if (path.includes('/mj-packing-list/logistic-payment')) {
      console.log('🔍 [Dashboard] mj-packing-list/logistic-payment 감지:', path);
      setSelectedMenu('mj-packing-list-logistic-payment');
    } else if (path.includes('/mj-packing-list/date-detail')) {
      console.log('🔍 [Dashboard] mj-packing-list/date-detail 감지:', path);
      setSelectedMenu('mj-packing-list-date-detail');
    } else if (path.includes('/mj-packing-list/') && path.split('/').length > 3) {
      console.log('🔍 [Dashboard] mj-packing-list 상세 감지:', path);
      setSelectedMenu('mj-packing-list-detail');
    } else if (path.includes('/mj-packing-list')) {
      console.log('🔍 [Dashboard] mj-packing-list 감지');
      setSelectedMenu('mj-packing-list');
    } else if (path.includes('/finance')) {
      console.log('🔍 [Dashboard] finance 감지');
      setSelectedMenu('finance');
    } else {
      console.log('🔍 [Dashboard] 기본 대시보드 감지');
      setSelectedMenu('dashboard');
    }
    
    console.log('🔍 [Dashboard] 설정된 메뉴:', selectedMenu);
  }, [location]);

  const renderContent = () => {
    console.log('🔍 [Dashboard] renderContent 호출, selectedMenu:', selectedMenu);
    
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
      case 'mj-packing-list-detail':
        return <PackingListDetail />;
      case 'mj-packing-list-date-detail':
        return <PackingListDateDetail />;
      case 'mj-packing-list-logistic-payment':
        return <LogisticPayment />;
      case 'finance':
        return <Finance />;
      case 'admin-dashboard':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">관리자 대시보드</h1>
            <p className="text-gray-600">관리자 전용 통계 및 현황이 여기에 표시됩니다.</p>
          </div>
        );
      default:
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              환영합니다, {user?.username}님!
            </h1>
            <p className="text-gray-600 mb-6">
              LABSEMBLE 대시보드에 오신 것을 환영합니다.
            </p>
            
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