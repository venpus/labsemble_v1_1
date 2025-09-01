import { useState, useCallback } from 'react';

export const useCalendarNavigation = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // 이전 월로 이동
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  // 다음 월로 이동
  const goToNextMonth = useCallback(() => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // 오늘 날짜로 이동
  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  // 날짜 선택
  const handleDateClick = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  // 현재 월의 첫 번째 날과 마지막 날 계산
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

  // 캘린더 그리드 생성
  const generateCalendarDays = useCallback(() => {
    const days = [];
    const currentDateObj = new Date(startDate);

    // 한달 전체 표시 (42일 - 6주)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDateObj));
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }

    return days;
  }, [startDate]);

  return {
    currentDate,
    selectedDate,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    handleDateClick,
    generateCalendarDays
  };
}; 