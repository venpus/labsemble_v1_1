import React from 'react';
import { BarChart3, CreditCard, BookOpen } from 'lucide-react';

const FinanceTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    {
      id: 'summary',
      label: '재무 요약',
      icon: BarChart3,
      description: '전체 재무 현황 및 통계'
    },
    {
      id: 'payment',
      label: '지급현황',
      icon: CreditCard,
      description: '지급 예정 및 결제 현황'
    },
    {
      id: 'ledger',
      label: '장부',
      icon: BookOpen,
      description: '상세 거래내역 및 장부'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 px-2 py-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <IconComponent className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className="font-semibold">{tab.label}</span>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* 탭 설명 */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            activeTab === 'summary' ? 'bg-green-500' : 
            activeTab === 'payment' ? 'bg-orange-500' : 'bg-blue-500'
          }`}></div>
          <p className="text-sm text-gray-700 font-medium">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinanceTabs;
