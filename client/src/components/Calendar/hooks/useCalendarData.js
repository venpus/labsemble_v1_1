import { useState, useEffect } from 'react';
import { apiGet } from '../../../utils/api';

export const useCalendarData = (activeTab) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
        }

        // 탭별 API 엔드포인트 선택
        let endpoint;
        if (activeTab === 'order') {
          endpoint = '/api/mj-project/calendar/client-events';
        } else if (activeTab === 'logistics') {
          endpoint = '/api/packing-list/calendar/events';
        }

        const response = await apiGet(endpoint);

        if (!response.ok) {
          throw new Error(`서버 오류 (${response.status}): 일정 데이터를 불러오는데 실패했습니다.`);
        }

        const result = await response.json();
        
        if (result.success) {
          // 탭별 필터링
          let filteredEvents = result.data;
          
          if (activeTab === 'order') {
            // 주문 달력: 발주일과 입고예정일 이벤트만 표시
            filteredEvents = result.data.filter(event => 
              event.eventType === 'order' || event.eventType === 'expected_delivery'
            );
          } else if (activeTab === 'logistics') {
            // 물류 달력: 패킹리스트 이벤트만 표시 (필터링 불필요, API에서 이미 패킹리스트만 반환)
            filteredEvents = result.data;
          }
          
          
          setEvents(filteredEvents);
          setRetryCount(0); // 성공 시 재시도 카운트 리셋
        } else {
          throw new Error(result.error || '일정 데이터를 불러오는데 실패했습니다.');
        }
      } catch (error) {
        console.error('일정 데이터 로드 오류:', error);
        
        // 에러 타입별 메시지 설정
        let errorMessage = error.message;
        if (error.message.includes('Request timeout')) {
          errorMessage = '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('서버에 연결할 수 없습니다')) {
          errorMessage = '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.';
        } else if (error.message.includes('인증 토큰이 없습니다')) {
          errorMessage = '로그인이 필요합니다. 다시 로그인해주세요.';
        }
        
        setError(errorMessage);
        // 에러 발생 시 빈 배열로 설정
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [activeTab, retryCount]);

  const addEvent = (newEvent) => {
    const event = {
      id: Date.now(),
      ...newEvent,
      createdAt: new Date().toISOString()
    };
    setEvents(prev => [...prev, event]);
  };

  const deleteEvent = (eventId) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
  };

  const getEventsByDate = (date) => {
    return events.filter(event => 
      event.date === date.toISOString().split('T')[0]
    );
  };

  // 재시도 함수
  const retryFetch = () => {
    setRetryCount(prev => prev + 1);
  };

  const refreshEvents = async () => {
    // 현재 탭에 맞는 데이터를 다시 가져오기 위해 강제로 useEffect 트리거
    setEvents([]); // 이벤트 초기화
    setError(null); // 에러 초기화
    setRetryCount(prev => prev + 1); // 재시도 트리거
  };

  return {
    events,
    loading,
    error,
    addEvent,
    deleteEvent,
    getEventsByDate,
    refreshEvents,
    retryFetch,
    retryCount
  };
}; 