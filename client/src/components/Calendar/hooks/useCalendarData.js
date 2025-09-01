import { useState, useEffect } from 'react';

export const useCalendarData = (activeTab) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('인증 토큰이 없습니다.');
        }

        let endpoint;
        if (activeTab === 'order') {
          endpoint = '/api/mj-project/calendar/order-events';
        } else {
          endpoint = '/api/mj-project/calendar/logistics-events';
        }

        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('일정 데이터를 불러오는데 실패했습니다.');
        }

        const result = await response.json();
        
        if (result.success) {
          let processedEvents = result.data;
          
          // 주문 달력인 경우, 발주일과 공장 납기소요일을 합산한 날짜에 초록색 카드 추가
          if (activeTab === 'order') {
            const deliveryEvents = [];
            
            result.data.forEach(event => {
              if (event.expectedDeliveryDate) {
                // 공장 납기 예정일 이벤트 추가
                deliveryEvents.push({
                  ...event,
                  id: `${event.id}_delivery`,
                  title: `납기 예정: ${event.productName}`,
                  date: event.expectedDeliveryDate,
                  time: '17:00', // 하루 마지막 시간
                  location: event.location,
                  description: `공장 납기 예정일 (발주일 + ${event.factoryDeliveryDays}일)`,
                  assignee: event.assignee,
                  productName: event.productName,
                  quantity: event.quantity,
                  unit: event.unit,
                  createdAt: event.createdAt,
                  updatedAt: event.updatedAt,
                  // 추가 정보
                  isOrderCompleted: event.isOrderCompleted,
                  isFactoryShippingCompleted: event.isFactoryShippingCompleted,
                  factoryShippingStatus: event.factoryShippingStatus,
                  entryQuantity: event.entryQuantity,
                  exportQuantity: event.exportQuantity,
                  remainQuantity: event.remainQuantity,
                  representativeImage: event.representativeImage,
                  // 공장 납기 관련
                  factoryDeliveryDays: event.factoryDeliveryDays,
                  expectedDeliveryDate: event.expectedDeliveryDate,
                  isDeliveryEvent: true // 납기 이벤트 구분용
                });
              }
            });
            
            // 발주 이벤트와 납기 이벤트를 합침
            processedEvents = [...result.data, ...deliveryEvents];
          }
          
          setEvents(processedEvents);
        } else {
          throw new Error(result.error || '일정 데이터를 불러오는데 실패했습니다.');
        }
      } catch (error) {
        console.error('일정 데이터 로드 오류:', error);
        setError(error.message);
        // 에러 발생 시 빈 배열로 설정
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [activeTab]);

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

  const refreshEvents = async () => {
    // 현재 탭에 맞는 데이터를 다시 가져오기 위해 강제로 useEffect 트리거
    setEvents([]); // 이벤트 초기화
    setError(null); // 에러 초기화
    
    // 약간의 지연 후 데이터 다시 로드
    setTimeout(() => {
      const fetchEvents = async () => {
        try {
          setLoading(true);
          
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('인증 토큰이 없습니다.');
          }

          let endpoint;
          if (activeTab === 'order') {
            endpoint = '/api/mj-project/calendar/order-events';
          } else {
            endpoint = '/api/mj-project/calendar/logistics-events';
          }

          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('일정 데이터를 불러오는데 실패했습니다.');
          }

          const result = await response.json();
          
          if (result.success) {
            let processedEvents = result.data;
            
            // 주문 달력인 경우, 발주일과 공장 납기소요일을 합산한 날짜에 초록색 카드 추가
            if (activeTab === 'order') {
              const deliveryEvents = [];
              
              result.data.forEach(event => {
                if (event.expectedDeliveryDate) {
                  // 공장 납기 예정일 이벤트 추가
                  deliveryEvents.push({
                    ...event,
                    id: `${event.id}_delivery`,
                    title: `납기 예정: ${event.productName}`,
                    date: event.expectedDeliveryDate,
                    time: '17:00', // 하루 마지막 시간
                    location: event.location,
                    description: `공장 납기 예정일 (발주일 + ${event.factoryDeliveryDays}일)`,
                    assignee: event.assignee,
                    productName: event.productName,
                    quantity: event.quantity,
                    unit: event.unit,
                    createdAt: event.createdAt,
                    updatedAt: event.updatedAt,
                    // 추가 정보
                    isOrderCompleted: event.isOrderCompleted,
                    isFactoryShippingCompleted: event.isFactoryShippingCompleted,
                    factoryShippingStatus: event.factoryShippingStatus,
                    entryQuantity: event.entryQuantity,
                    exportQuantity: event.exportQuantity,
                    remainQuantity: event.remainQuantity,
                    representativeImage: event.representativeImage,
                    // 공장 납기 관련
                    factoryDeliveryDays: event.factoryDeliveryDays,
                    expectedDeliveryDate: event.expectedDeliveryDate,
                    isDeliveryEvent: true // 납기 이벤트 구분용
                  });
                }
              });
              
              // 발주 이벤트와 납기 이벤트를 합침
              processedEvents = [...result.data, ...deliveryEvents];
            }
            
            setEvents(processedEvents);
          } else {
            throw new Error(result.error || '일정 데이터를 불러오는데 실패했습니다.');
          }
        } catch (error) {
          console.error('일정 데이터 새로고침 오류:', error);
          setError(error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchEvents();
    }, 100);
  };

  return {
    events,
    loading,
    error,
    addEvent,
    deleteEvent,
    getEventsByDate,
    refreshEvents
  };
}; 