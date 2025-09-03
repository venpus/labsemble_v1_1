import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CalendarHeader = ({ 
  currentDate, 
  onPreviousMonth, 
  onNextMonth 
}) => {
  return (
    <div className="flex items-center justify-between p-6 border-b">
      <div className="flex items-center space-x-4">
        <button
          onClick={onPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="이전 월"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold text-gray-900">
          {currentDate.toLocaleDateString('ko-KR', { 
            year: 'numeric', 
            month: 'long' 
          })}
        </h2>
        <button
          onClick={onNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="다음 월"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader; 