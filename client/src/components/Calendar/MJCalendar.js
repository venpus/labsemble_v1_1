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
  const { events, loading, error, addEvent, refreshEvents, retryFetch, retryCount } = useCalendarData(activeTab);
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
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">데이터 로드 오류</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                  {retryCount > 0 && (
                    <p className="mt-1 text-xs text-red-600">
                      재시도 횟수: {retryCount}회
                    </p>
                  )}
                </div>
                <div className="mt-3 flex space-x-3">
                  <button
                    onClick={retryFetch}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    다시 시도
                  </button>
                  <button
                    onClick={refreshEvents}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    새로고침
                  </button>
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
                  <div className="flex flex-col items-center space-y-3">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="text-gray-600">일정을 불러오는 중...</span>
                    </div>
                    {retryCount > 0 && (
                      <div className="text-xs text-gray-500">
                        재시도 중... ({retryCount}회)
                      </div>
                    )}
                    <div className="w-64 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                    </div>
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