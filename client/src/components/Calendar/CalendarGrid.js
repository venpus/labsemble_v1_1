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
        const dayEvents = events.filter(event => 
          event.date === day.toISOString().split('T')[0]
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