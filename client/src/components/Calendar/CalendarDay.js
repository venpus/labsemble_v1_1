import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CalendarDay = ({ 
  day, 
  events, 
  isSelected, 
  onDateClick, 
  index,
  currentMonth 
}) => {
  const navigate = useNavigate();
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  const isCurrentMonth = day.getMonth() === currentMonth;
  const isToday = day.toDateString() === new Date().toDateString();
  
  // 행의 마지막 날짜인지 확인 (7의 배수 - 1)
  const isEndOfRow = (index + 1) % 7 === 0;
  // 행의 첫 번째 날짜인지 확인 (7의 배수)
  const isStartOfRow = (index + 1) % 7 === 1;

  const handleDateClick = () => {
    onDateClick(day);
  };

  // 이벤트 클릭 시 해당 페이지로 이동
  const handleEventClick = (event, e) => {
    e.stopPropagation(); // 날짜 클릭 이벤트 전파 방지
    
    if (event.eventType === 'packing_list') {
      // 패킹리스트 이벤트인 경우 해당 날짜의 패킹리스트 상세 페이지로 이동 (쿼리 파라미터 사용)
      navigate(`/dashboard/mj-packing-list/date-detail?date=${event.date}`);
    } else {
      // 프로젝트 관련 이벤트인 경우 프로젝트 상세 페이지로 이동
      const projectId = event.projectId || event.id.split('_')[0];
      navigate(`/dashboard/mj-projects/${projectId}`);
    }
  };

  // 마우스 호버 이벤트 처리
  const handleMouseEnter = (event, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setHoveredEvent(event);
  };

  const handleMouseLeave = () => {
    setHoveredEvent(null);
  };

  // 이벤트 상태에 따른 스타일 결정
  const getEventStyle = (event) => {
    // 이벤트 타입별 스타일
    switch (event.eventType) {
      case 'order': // 발주일
        if (event.status === 'completed') {
          return 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700';
        }
        return 'bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 text-yellow-800';
      
      case 'expected_delivery': // 입고예정일
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 text-blue-800';
      
      case 'actual_delivery': // 입고완료일
        return 'bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 text-green-800';
      
      case 'packing_list': // 패킹리스트
        if (event.status === 'completed' || event.isPaid) {
          return 'bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 text-purple-700';
        }
        return 'bg-gradient-to-r from-purple-100 to-violet-100 border border-purple-300 text-purple-800';
      
      default:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 text-gray-700';
    }
  };

  // 이벤트 상태에 따른 아이콘 또는 표시
  const getEventStatus = (event) => {
    // 이벤트 타입별 아이콘
    switch (event.eventType) {
      case 'order': // 발주일
        return event.status === 'completed' ? '✅' : '📋';
      
      case 'expected_delivery': // 입고예정일
        return '📦';
      
      case 'actual_delivery': // 입고완료일
        return '🚚';
      
      case 'packing_list': // 패킹리스트
        return event.isPaid ? '💰' : '📦';
      
      default:
        return '';
    }
  };

  return (
    <>
      <div
        onClick={handleDateClick}
        className={`border-b cursor-pointer transition-colors ${
          isCurrentMonth ? 'bg-white' : 'bg-gray-50'
        } ${
          isToday ? 'bg-blue-50' : ''
        } ${
          isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : ''
        } hover:bg-gray-50 ${
          isStartOfRow ? 'border-l' : ''
        } ${
          isEndOfRow ? 'border-r' : 'border-r'
        }`}
        style={{
          minHeight: `${Math.max(100, events.length * 32 + 50)}px`,
          height: `${Math.max(100, events.length * 32 + 50)}px`
        }}
      >
        {/* 날짜 표시 */}
        <div className={`text-sm font-medium p-1.5 ${
          isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
        } ${
          isToday ? 'text-white bg-orange-500 px-2 py-1 rounded-full font-bold shadow-md' : ''
        }`}>
          {day.getDate()}
        </div>
        
        {/* 이벤트 표시 */}
        <div className="px-1.5 pb-1.5 space-y-0.5">
          {events.slice(0, 10).map(event => (
            <div
              key={event.id}
              onClick={(e) => handleEventClick(event, e)}
              onMouseEnter={(e) => handleMouseEnter(event, e)}
              onMouseLeave={handleMouseLeave}
              className={`text-xs p-1 rounded-md ${getEventStyle(event)} cursor-pointer hover:shadow-md hover:scale-105 transition-all duration-200 transform`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate flex-1">
                  {getEventStatus(event)} {event.productName}
                </span>
                <span className="font-medium ml-1 flex-shrink-0">
                  {event.quantity}{event.unit}
                </span>
              </div>
            </div>
          ))}
          {events.length > 10 && (
            <div className="text-xs text-gray-500 text-center py-0.5">
              +{events.length - 10} more
            </div>
          )}
        </div>
      </div>

      {/* 호버 툴팁 */}
      {hoveredEvent && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          {/* 상품 이미지 */}
          {hoveredEvent.representativeImage && hoveredEvent.representativeImage.url ? (
            <div className="mb-2">
              <img
                src={hoveredEvent.representativeImage.url}
                alt={hoveredEvent.productName}
                className="w-full h-24 object-cover rounded-md"
                onError={(e) => {
                  e.target.style.display = 'none';
                  // 이미지 로드 실패 시 플레이스홀더 표시
                  const placeholder = document.createElement('div');
                  placeholder.className = 'w-full h-24 bg-gray-100 rounded-md flex items-center justify-center';
                  placeholder.innerHTML = '<span class="text-gray-400 text-sm">이미지 로드 실패</span>';
                  e.target.parentNode.appendChild(placeholder);
                }}
              />
            </div>
          ) : (
            <div className="mb-2 w-full h-24 bg-gray-100 rounded-md flex items-center justify-center">
              <span className="text-gray-400 text-sm">이미지 없음</span>
            </div>
          )}

          {/* 상품 정보 */}
          <div className="space-y-1">
            <h4 className="font-semibold text-gray-900 text-sm">
              {hoveredEvent.productName}
            </h4>
            
            {/* 패킹리스트 정보 */}
            {hoveredEvent.eventType === 'packing_list' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-xs">물류회사:</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {hoveredEvent.logisticCompany || '미지정'}
                  </span>
                </div>
                {hoveredEvent.groupInfo && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-xs">패킹리스트 건수:</span>
                    <span className="font-medium text-gray-900 text-sm">
                      {hoveredEvent.groupInfo.itemCount}건
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-xs">포장코드:</span>
                  <span className="font-medium text-gray-900 text-sm text-right max-w-32 truncate" title={hoveredEvent.packingCode}>
                    {hoveredEvent.packingCode}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-xs">총 박스수:</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {hoveredEvent.boxCount}개
                  </span>
                </div>
                {hoveredEvent.trackingNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-xs">운송장번호:</span>
                    <span className="font-medium text-gray-900 text-sm text-right max-w-32 truncate" title={hoveredEvent.trackingNumber}>
                      {hoveredEvent.trackingNumber}
                    </span>
                  </div>
                )}
                {hoveredEvent.shippingCost > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 text-xs">총 배송비:</span>
                    <span className="font-medium text-gray-900 text-sm">
                      {hoveredEvent.shippingCost.toLocaleString()}원
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-xs">결제상태:</span>
                  <span className={`font-medium text-sm ${hoveredEvent.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                    {hoveredEvent.isPaid ? '완료' : '미완료'}
                  </span>
                </div>
                {hoveredEvent.groupInfo && hoveredEvent.groupInfo.projectNames.length > 1 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="text-gray-600 text-xs mb-1">포함된 프로젝트:</div>
                    <div className="text-xs text-gray-700 max-h-16 overflow-y-auto">
                      {hoveredEvent.groupInfo.projectNames.map((name, index) => (
                        <div key={index} className="truncate">• {name}</div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            
          </div>

          {/* 화살표 */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
        </div>
      )}
    </>
  );
};

export default CalendarDay; 