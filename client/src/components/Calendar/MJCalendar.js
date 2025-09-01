import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useCalendarData } from './hooks/useCalendarData';
import { useCalendarNavigation } from './hooks/useCalendarNavigation';
import { useEventForm } from './hooks/useEventForm';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import TabNavigation from './TabNavigation';
import EventModal from './EventModal';

const MJCalendar = () => {
  const [activeTab, setActiveTab] = useState('order');
  
  // 커스텀 훅 사용
  const { events, loading, error, addEvent, refreshEvents } = useCalendarData(activeTab);
  const {
    currentDate,
    selectedDate,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    handleDateClick,
    generateCalendarDays
  } = useCalendarNavigation();
  
  const {
    showEventModal,
    newEvent,
    updateEventField,
    openModal,
    closeModal,
    handleAddEvent,
    setEventDate
  } = useEventForm(addEvent);

  // 날짜 클릭 시 이벤트 날짜 설정
  const handleDateSelect = (date) => {
    handleDateClick(date);
    setEventDate(date);
  };

  const calendarDays = generateCalendarDays();

  // 새로고침 처리
  const handleRefresh = async () => {
    await refreshEvents();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">MJ 캘린더</h1>
              <p className="text-gray-600 mt-1">
                {activeTab === 'order' ? '주문 일정 및 상품 생산 관리' : '물류 일정 및 배송 관리'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                오늘
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className={`px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
              <button
                onClick={openModal}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>일정 추가</span>
              </button>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">데이터 로드 오류</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 탭 네비게이션 */}
        <TabNavigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        <div className="grid grid-cols-1 gap-6">
          {/* 캘린더 */}
          <div className="w-full">
            <div className="bg-white rounded-lg shadow-sm">
              <CalendarHeader
                currentDate={currentDate}
                onPreviousMonth={goToPreviousMonth}
                onNextMonth={goToNextMonth}
              />
              
              {/* 로딩 상태 */}
              {loading && (
                <div className="flex items-center justify-center p-8">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-gray-600">일정을 불러오는 중...</span>
                  </div>
                </div>
              )}
              
              {/* 캘린더 그리드 */}
              {!loading && (
                <CalendarGrid
                  calendarDays={calendarDays}
                  events={events}
                  selectedDate={selectedDate}
                  onDateClick={handleDateSelect}
                  currentMonth={currentDate.getMonth()}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 이벤트 추가 모달 */}
      <EventModal
        isOpen={showEventModal}
        newEvent={newEvent}
        onClose={closeModal}
        onAddEvent={handleAddEvent}
        onUpdateEvent={updateEventField}
      />
    </div>
  );
};

export default MJCalendar; 