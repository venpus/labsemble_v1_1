import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  User, 
  FileText, 
  Settings,
  Building,
  Users,
  Shield,
  Calendar,
  Package,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ selectedMenu, setSelectedMenu }) => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;

  // 일반 사용자 메뉴
  const userMenuItems = [
    {
      id: 'dashboard',
      label: 'My Page',
      icon: Home,
      path: '/dashboard',
      description: '전체 현황 및 요약 정보'
    },
    {
      id: 'profile',
      label: '프로필 관리',
      icon: User,
      path: '/dashboard/profile',
      description: '개인정보 및 계정 설정'
    },
    {
      id: 'company',
      label: '회사 정보',
      icon: Building,
      path: '/dashboard/company',
      description: '회사 정보 및 설정'
    },
    {
      id: 'settings',
      label: '설정',
      icon: Settings,
      path: '/dashboard/settings',
      description: '계정 및 시스템 설정'
    }
  ];

  // 관리자 전용 메뉴
  const adminMenuItems = [
    {
      id: 'user-management',
      label: '사용자 관리',
      icon: Users,
      path: '/dashboard/admin/users',
      description: '전체 사용자 관리 및 권한 설정'
    },
    {
      id: 'partner-settings',
      label: '파트너스 설정',
      icon: Building,
      path: '/dashboard/admin/partners',
      description: '파트너사 정보 및 권한 관리'
    },

    {
      id: 'admin-dashboard',
      label: '관리자 대시보드',
      icon: Shield,
      path: '/dashboard/admin',
      description: '시스템 현황 및 관리 통계'
    }
  ];

  // MJ 프로젝트 메뉴 (admin 또는 MJ유통 파트너 사용자)
  const mjProjectMenuItem = {
    id: 'mj-projects',
    label: 'MJ 프로젝트',
    icon: FileText,
    path: '/dashboard/mj-projects',
    description: 'MJ 프로젝트 관리 및 조회'
  };

  // MJ 캘린더 메뉴 (admin 또는 MJ유통 파트너 사용자)
  const mjCalendarMenuItem = {
    id: 'mj-calendar',
    label: 'MJ 캘린더',
    icon: Calendar,
    path: '/dashboard/mj-calendar',
    description: 'MJ 프로젝트 일정 및 캘린더 관리'
  };

  // MJ 패킹리스트 메뉴 (admin 또는 MJ유통 파트너 사용자)
  const mjPackingListMenuItem = {
    id: 'mj-packing-list',
    label: 'MJ 패킹리스트',
    icon: Package,
    path: '/dashboard/mj-packing-list',
    description: 'MJ 프로젝트 패킹리스트 관리'
  };

  // Finance 메뉴 (admin 또는 MJ유통 파트너 사용자)
  const financeMenuItem = {
    id: 'finance',
    label: 'MJ 장부',
    icon: DollarSign,
    path: '/dashboard/finance',
    description: '수입/지출 관리 및 재무 현황'
  };

  // 메뉴 아이템 결합 (관리자인 경우 회사정보 제외하고 관리자 메뉴 추가)
  const getMenuItems = () => {
    let menuItems = [];
    
    if (isAdmin) {
      // 관리자는 회사정보 메뉴를 제외한 일반 메뉴 + 관리자 메뉴
      const userMenuWithoutCompany = userMenuItems.filter(item => item.id !== 'company');
      menuItems = [...userMenuWithoutCompany, ...adminMenuItems];
    } else {
      // 일반 사용자는 모든 일반 메뉴
      menuItems = [...userMenuItems];
    }
    
    // MJ 프로젝트 메뉴를 설정 메뉴 위에 삽입 (admin 또는 MJ유통 파트너 사용자)
    if (isAdmin || user?.partnerName === 'MJ유통') {
      // 설정 메뉴의 인덱스를 찾아서 그 앞에 MJ 프로젝트 메뉴 삽입
      const settingsIndex = menuItems.findIndex(item => item.id === 'settings');
      if (settingsIndex !== -1) {
        menuItems.splice(settingsIndex, 0, mjProjectMenuItem);
      } else {
        // 설정 메뉴가 없으면 맨 뒤에 추가
        menuItems.push(mjProjectMenuItem);
      }
    }

    // MJ 캘린더 메뉴를 MJ 프로젝트 메뉴 다음에 삽입 (admin 또는 MJ유통 파트너 사용자)
    if (isAdmin || user?.partnerName === 'MJ유통') {
      // MJ 프로젝트 메뉴의 인덱스를 찾아서 그 다음에 MJ 캘린더 메뉴 삽입
      const mjProjectIndex = menuItems.findIndex(item => item.id === 'mj-projects');
      if (mjProjectIndex !== -1) {
        menuItems.splice(mjProjectIndex + 1, 0, mjCalendarMenuItem);
      } else {
        // MJ 프로젝트 메뉴가 없으면 설정 메뉴 위에 추가
        const settingsIndex = menuItems.findIndex(item => item.id === 'settings');
        if (settingsIndex !== -1) {
          menuItems.splice(settingsIndex, 0, mjCalendarMenuItem);
        } else {
          // 설정 메뉴가 없으면 맨 뒤에 추가
          menuItems.push(mjCalendarMenuItem);
        }
      }
    }

    // MJ 패킹리스트 메뉴를 MJ 캘린더 메뉴 다음에 삽입 (admin 또는 MJ유통 파트너 사용자)
    if (isAdmin || user?.partnerName === 'MJ유통') {
      // MJ 캘린더 메뉴의 인덱스를 찾아서 그 다음에 MJ 패킹리스트 메뉴 삽입
      const mjCalendarIndex = menuItems.findIndex(item => item.id === 'mj-calendar');
      if (mjCalendarIndex !== -1) {
        menuItems.splice(mjCalendarIndex + 1, 0, mjPackingListMenuItem);
      } else {
        // MJ 캘린더 메뉴가 없으면 MJ 프로젝트 메뉴 다음에 추가
        const mjProjectIndex = menuItems.findIndex(item => item.id === 'mj-projects');
        if (mjProjectIndex !== -1) {
          menuItems.splice(mjProjectIndex + 1, 0, mjPackingListMenuItem);
        } else {
          // MJ 프로젝트 메뉴가 없으면 설정 메뉴 위에 추가
          const settingsIndex = menuItems.findIndex(item => item.id === 'settings');
          if (settingsIndex !== -1) {
            menuItems.splice(settingsIndex, 0, mjPackingListMenuItem);
          } else {
            // 설정 메뉴가 없으면 맨 뒤에 추가
            menuItems.push(mjPackingListMenuItem);
          }
        }
      }
    }

    // Finance 메뉴를 MJ 패킹리스트 메뉴 다음에 삽입 (admin 또는 MJ유통 파트너 사용자)
    if (isAdmin || user?.partnerName === 'MJ유통') {
      // MJ 패킹리스트 메뉴의 인덱스를 찾아서 그 다음에 Finance 메뉴 삽입
      const mjPackingListIndex = menuItems.findIndex(item => item.id === 'mj-packing-list');
      if (mjPackingListIndex !== -1) {
        menuItems.splice(mjPackingListIndex + 1, 0, financeMenuItem);
      } else {
        // MJ 패킹리스트 메뉴가 없으면 MJ 캘린더 메뉴 다음에 추가
        const mjCalendarIndex = menuItems.findIndex(item => item.id === 'mj-calendar');
        if (mjCalendarIndex !== -1) {
          menuItems.splice(mjCalendarIndex + 1, 0, financeMenuItem);
        } else {
          // MJ 캘린더 메뉴가 없으면 MJ 프로젝트 메뉴 다음에 추가
          const mjProjectIndex = menuItems.findIndex(item => item.id === 'mj-projects');
          if (mjProjectIndex !== -1) {
            menuItems.splice(mjProjectIndex + 1, 0, financeMenuItem);
          } else {
            // MJ 프로젝트 메뉴가 없으면 설정 메뉴 위에 추가
            const settingsIndex = menuItems.findIndex(item => item.id === 'settings');
            if (settingsIndex !== -1) {
              menuItems.splice(settingsIndex, 0, financeMenuItem);
            } else {
              // 설정 메뉴가 없으면 맨 뒤에 추가
              menuItems.push(financeMenuItem);
            }
          }
        }
      }
    }
    
    return menuItems;
  };

  const allMenuItems = getMenuItems();

  return (
    <div className="w-64 bg-white shadow-lg min-h-screen">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">대시보드</h2>
          <p className="text-sm text-gray-600">
            {isAdmin ? 'LABSEMBLE 관리자 센터' : 'LABSEMBLE 관리 센터'}
          </p>
          {isAdmin && (
            <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <Shield className="w-3 h-3 mr-1" />
              관리자
            </div>
          )}
        </div>
        
        {/* Navigation Menu */}
        <nav className="space-y-2">
          {allMenuItems.map((item) => {
            const IconComponent = item.icon;
            const isAdminItem = adminMenuItems.some(adminItem => adminItem.id === item.id);
            
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setSelectedMenu && setSelectedMenu(item.id)}
                className={`group flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isAdminItem
                    ? 'text-red-700 hover:bg-red-50 hover:text-red-800 border-l-4 border-red-500' 
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <IconComponent className={`w-5 h-5 transition-colors ${
                  isAdminItem
                    ? 'text-red-500 group-hover:text-red-600' 
                    : 'text-gray-400 group-hover:text-blue-600'
                }`} />
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className={`text-xs transition-colors ${
                    isAdminItem
                      ? 'text-red-500 group-hover:text-red-600' 
                      : 'text-gray-500 group-hover:text-blue-500'
                  }`}>
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <p className="text-xs text-gray-500">LABSEMBLE v2.0</p>
            {isAdmin && (
              <p className="text-xs text-red-500 mt-1 font-medium">관리자 모드</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 