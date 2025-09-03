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

  // 프로젝트 상세 페이지로 이동
  const handleEventClick = (event, e) => {
    e.stopPropagation(); // 날짜 클릭 이벤트 전파 방지
    
    // 납기 예정 이벤트인 경우 원본 프로젝트 ID 사용
    const projectId = event.isDeliveryEvent ? event.id.replace('_delivery', '') : event.id;
    
    // 프로젝트 상세 페이지로 이동 (ProjectDetails 컴포넌트가 렌더링됨)
    navigate(`/dashboard/mj-projects/${projectId}`);
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
    // 납기 예정 이벤트 (초록색)
    if (event.isDeliveryEvent) {
      return 'bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 text-green-800';
    }
    
    // 발주일 이벤트 (노란색) - 납기 이벤트가 아니고 factoryDeliveryDays가 있는 경우
    if (!event.isDeliveryEvent && event.factoryDeliveryDays) {
      return 'bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 text-yellow-800';
    }
    
    // 발주 완료 여부 확인
    if (event.isOrderCompleted) {
      return 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700';
    }
    
    // 물류 출고 완료 여부 확인
    if (event.isFactoryShippingCompleted) {
      return 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700';
    }
    
    // 기본 스타일
    return 'bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 text-gray-700';
  };

  // 이벤트 상태에 따른 아이콘 또는 표시
  const getEventStatus = (event) => {
    // 납기 예정 이벤트
    if (event.isDeliveryEvent) {
      return '📦';
    }
    
    // 발주일 이벤트
    if (!event.isDeliveryEvent && event.factoryDeliveryDays) {
      return '📋';
    }
    
    // 발주 완료 여부 확인
    if (event.isOrderCompleted) {
      return '✅';
    }
    
    // 물류 출고 완료 여부 확인
    if (event.isFactoryShippingCompleted) {
      return '🚚';
    }
    
    return '';
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
            
            {/* 수량 정보 */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-xs">수량:</span>
              <span className="font-medium text-gray-900 text-sm">
                {hoveredEvent.quantity.toLocaleString()}{hoveredEvent.unit}
              </span>
            </div>
          </div>

          {/* 화살표 */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
        </div>
      )}
    </>
  );
};

export default CalendarDay; 