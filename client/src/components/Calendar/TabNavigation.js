import React from 'react';

const TabNavigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'order', label: '주문달력', color: 'blue' },
    { id: 'logistics', label: '물류달력', color: 'green' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* 탭 네비게이션 */}
        <div className="flex space-x-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const colorClasses = {
              blue: isActive 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600',
              green: isActive 
                ? 'bg-green-600 text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-600'
            };

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${colorClasses[tab.color]}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 카드 의미 설명 범례 (컴팩트 버전) */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-gray-600 font-medium">📅 카드 의미:</span>
          
          {/* 주문달력 범례 */}
          {activeTab === 'order' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 rounded"></div>
                <span className="text-gray-600">📋 발주일</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 rounded"></div>
                <span className="text-gray-600">📦 입고예정</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded"></div>
                <span className="text-gray-600">✅ 발주완료</span>
              </div>
            </>
          )}
          
          {/* 물류달력 범례 (패킹리스트) */}
          {activeTab === 'logistics' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-100 to-violet-100 border border-purple-300 rounded"></div>
                <span className="text-gray-600">📦 패킹리스트</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded"></div>
                <span className="text-gray-600">💰 결제완료</span>
              </div>
            </>
          )}
          
          {/* 구분선 */}
          <div className="w-px h-4 bg-gray-300"></div>
          
          {/* 팁 */}
          <div className="text-gray-500">
            💡 클릭하여 상세보기
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabNavigation; 