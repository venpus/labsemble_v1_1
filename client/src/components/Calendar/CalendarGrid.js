import React from 'react';
import CalendarDay from './CalendarDay';

const CalendarGrid = ({ 
  calendarDays, 
  events, 
  selectedDate, 
  onDateClick,
  currentMonth
}) => {
  return (
    <div className="grid grid-cols-7">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b col-span-7">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      
      {/* 캘린더 그리드 */}
      {calendarDays.map((day, index) => {
        // 로컬 날짜 형식으로 변환 (YYYY-MM-DD)
        const localDateString = day.getFullYear() + '-' + 
          String(day.getMonth() + 1).padStart(2, '0') + '-' + 
          String(day.getDate()).padStart(2, '0');
        
        const dayEvents = events.filter(event => 
          event.date === localDateString
        );
        
        return (
          <CalendarDay
            key={index}
            day={day}
            events={dayEvents}
            isSelected={selectedDate && day.toDateString() === selectedDate.toDateString()}
            onDateClick={onDateClick}
            index={index}
            currentMonth={currentMonth}
          />
        );
      })}
    </div>
  );
};

export default CalendarGrid; 