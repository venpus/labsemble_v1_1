import React, { useState } from 'react';
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
  DollarSign,
  Info,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { versionInfo } from '../../config/version';

const Sidebar = ({ selectedMenu, setSelectedMenu }) => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const [isMjMenuOpen, setIsMjMenuOpen] = useState(false);
  const [isMyInfoMenuOpen, setIsMyInfoMenuOpen] = useState(false);
  const [isAdminToolsMenuOpen, setIsAdminToolsMenuOpen] = useState(false);

  // 나의 정보 메뉴 (드롭다운)
  const myInfoMenuItem = {
    id: 'my-info',
    label: '나의 정보',
    icon: User,
    description: '개인 정보 및 계정 관리',
    subMenus: [
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
      }
    ]
  };

  // 일반 사용자 메뉴
  const userMenuItems = [
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

  // 관리자 도구 메뉴 (드롭다운)
  const adminToolsMenuItem = {
    id: 'admin-tools',
    label: '관리자 도구',
    icon: Shield,
    description: '시스템 관리 및 설정',
    subMenus: [
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
    ]
  };

  // 관리자 전용 메뉴 (기존 참조용)
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

  // MJ 관리 메뉴 (admin 또는 MJ유통 파트너 사용자)
  const mjManagementMenuItem = {
    id: 'mj-management',
    label: 'MJ 관리',
    icon: FileText,
    description: 'MJ 프로젝트 관련 관리',
    subMenus: [
      {
        id: 'mj-projects',
        label: 'MJ 프로젝트',
        icon: FileText,
        path: '/dashboard/mj-projects',
        description: 'MJ 프로젝트 관리 및 조회'
      },
      {
        id: 'mj-calendar',
        label: 'MJ 캘린더',
        icon: Calendar,
        path: '/dashboard/mj-calendar',
        description: 'MJ 프로젝트 일정 및 캘린더 관리'
      },
      {
        id: 'mj-packing-list',
        label: 'MJ 패킹리스트',
        icon: Package,
        path: '/dashboard/mj-packing-list',
        description: 'MJ 프로젝트 패킹리스트 관리'
      },
      {
        id: 'finance',
        label: 'MJ 장부',
        icon: DollarSign,
        path: '/dashboard/finance',
        description: '수입/지출 관리 및 재무 현황'
      }
    ]
  };

  // 메뉴 아이템 결합 (관리자인 경우 회사정보 제외하고 관리자 메뉴 추가)
  const getMenuItems = () => {
    let menuItems = [];
    
    // 나의 정보 메뉴를 맨 앞에 추가 (모든 사용자)
    menuItems.push(myInfoMenuItem);
    
    if (isAdmin) {
      // 관리자는 회사정보 메뉴를 제외한 일반 메뉴 + 관리자 도구 메뉴
      const userMenuWithoutCompany = userMenuItems.filter(item => item.id !== 'company');
      menuItems = [...menuItems, ...userMenuWithoutCompany, adminToolsMenuItem];
    } else {
      // 일반 사용자는 모든 일반 메뉴
      menuItems = [...menuItems, ...userMenuItems];
    }
    
    // MJ 관리 메뉴를 설정 메뉴 위에 삽입 (admin 또는 MJ유통 파트너 사용자)
    if (isAdmin || user?.partnerName === 'MJ유통') {
      // 설정 메뉴의 인덱스를 찾아서 그 앞에 MJ 관리 메뉴 삽입
      const settingsIndex = menuItems.findIndex(item => item.id === 'settings');
      if (settingsIndex !== -1) {
        menuItems.splice(settingsIndex, 0, mjManagementMenuItem);
      } else {
        // 설정 메뉴가 없으면 맨 뒤에 추가
        menuItems.push(mjManagementMenuItem);
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
            const isMjManagement = item.id === 'mj-management';
            const isMyInfo = item.id === 'my-info';
            const isAdminTools = item.id === 'admin-tools';
            
            // 나의 정보 메뉴인 경우 드롭다운으로 렌더링
            if (isMyInfo) {
              return (
                <div key={item.id}>
                  {/* 나의 정보 메인 메뉴 */}
                  <button
                    onClick={() => setIsMyInfoMenuOpen(!isMyInfoMenuOpen)}
                    className={`group w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-all duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-600`}
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className="w-5 h-5 transition-colors text-gray-400 group-hover:text-blue-600" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs transition-colors text-gray-500 group-hover:text-blue-500">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {isMyInfoMenuOpen ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    )}
                  </button>
                  
                  {/* 나의 정보 하위 메뉴들 */}
                  {isMyInfoMenuOpen && (
                    <div className="ml-6 mt-2 space-y-1">
                      {item.subMenus.map((subItem) => {
                        const SubIconComponent = subItem.icon;
                        return (
                          <Link
                            key={subItem.id}
                            to={subItem.path}
                            onClick={() => setSelectedMenu && setSelectedMenu(subItem.id)}
                            className="group flex items-center space-x-3 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <SubIconComponent className="w-4 h-4 transition-colors text-gray-400 group-hover:text-blue-600" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{subItem.label}</div>
                              <div className="text-xs transition-colors text-gray-500 group-hover:text-blue-500">
                                {subItem.description}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            // 관리자 도구 메뉴인 경우 드롭다운으로 렌더링
            if (isAdminTools) {
              return (
                <div key={item.id}>
                  {/* 관리자 도구 메인 메뉴 */}
                  <button
                    onClick={() => setIsAdminToolsMenuOpen(!isAdminToolsMenuOpen)}
                    className={`group w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-all duration-200 text-red-700 hover:bg-red-50 hover:text-red-800 border-l-4 border-red-500`}
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className="w-5 h-5 transition-colors text-red-500 group-hover:text-red-600" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs transition-colors text-red-500 group-hover:text-red-600">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {isAdminToolsMenuOpen ? (
                      <ChevronDown className="w-4 h-4 text-red-500 group-hover:text-red-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-red-500 group-hover:text-red-600" />
                    )}
                  </button>
                  
                  {/* 관리자 도구 하위 메뉴들 */}
                  {isAdminToolsMenuOpen && (
                    <div className="ml-6 mt-2 space-y-1">
                      {item.subMenus.map((subItem) => {
                        const SubIconComponent = subItem.icon;
                        return (
                          <Link
                            key={subItem.id}
                            to={subItem.path}
                            onClick={() => setSelectedMenu && setSelectedMenu(subItem.id)}
                            className="group flex items-center space-x-3 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <SubIconComponent className="w-4 h-4 transition-colors text-red-500 group-hover:text-red-600" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{subItem.label}</div>
                              <div className="text-xs transition-colors text-red-500 group-hover:text-red-600">
                                {subItem.description}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            // MJ 관리 메뉴인 경우 드롭다운으로 렌더링
            if (isMjManagement) {
              return (
                <div key={item.id}>
                  {/* MJ 관리 메인 메뉴 */}
                  <button
                    onClick={() => setIsMjMenuOpen(!isMjMenuOpen)}
                    className={`group w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-all duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-600`}
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className="w-5 h-5 transition-colors text-gray-400 group-hover:text-blue-600" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs transition-colors text-gray-500 group-hover:text-blue-500">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {isMjMenuOpen ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    )}
                  </button>
                  
                  {/* MJ 관리 하위 메뉴들 */}
                  {isMjMenuOpen && (
                    <div className="ml-6 mt-2 space-y-1">
                      {item.subMenus.map((subItem) => {
                        const SubIconComponent = subItem.icon;
                        return (
                          <Link
                            key={subItem.id}
                            to={subItem.path}
                            onClick={() => setSelectedMenu && setSelectedMenu(subItem.id)}
                            className="group flex items-center space-x-3 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <SubIconComponent className="w-4 h-4 transition-colors text-gray-400 group-hover:text-blue-600" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{subItem.label}</div>
                              <div className="text-xs transition-colors text-gray-500 group-hover:text-blue-500">
                                {subItem.description}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            // 일반 메뉴 렌더링
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
          
          {/* 버전 정보 (관리자만 표시) */}
          {isAdmin && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-center mb-2">
                <Info className="w-3 h-3 text-blue-500 mr-1" />
                <span className="text-xs font-medium text-gray-700">시스템 버전</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-blue-600">{versionInfo.version}</p>
                <p className="text-xs text-gray-500 mt-1">{versionInfo.date}</p>
                <p className="text-xs text-gray-400 mt-1 leading-tight">{versionInfo.description}</p>
                {versionInfo.build !== 'dev' && (
                  <p className="text-xs text-gray-400 mt-1">Build: {versionInfo.build}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 