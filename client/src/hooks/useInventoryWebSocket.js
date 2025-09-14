import { useState, useEffect, useRef, useCallback } from 'react';

const useInventoryWebSocket = (onInventoryUpdate) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🔌 [WebSocket] 토큰이 없어서 연결을 건너뜁니다.');
        return;
      }

      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/inventory?token=${token}`;
      console.log('🔌 [WebSocket] 연결 시도:', wsUrl);

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ [WebSocket] 연결 성공');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 [WebSocket] 메시지 수신:', data.type);

          switch (data.type) {
            case 'connection':
              console.log('🔌 [WebSocket] 연결 확인:', data.message);
              break;
            case 'inventory_update':
            case 'project_inventory_update':
              console.log('📊 [WebSocket] 재고 업데이트:', data);
              if (onInventoryUpdate) {
                onInventoryUpdate(data);
              }
              break;
            default:
              console.log('📨 [WebSocket] 알 수 없는 메시지 타입:', data.type);
          }
        } catch (error) {
          console.error('❌ [WebSocket] 메시지 파싱 오류:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 [WebSocket] 연결 종료:', event.code, event.reason);
        setIsConnected(false);
        
        // 정상 종료가 아닌 경우 재연결 시도
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 [WebSocket] ${delay}ms 후 재연결 시도 (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionError('연결에 실패했습니다. 페이지를 새로고침해주세요.');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ [WebSocket] 연결 오류:', error);
        setConnectionError('WebSocket 연결 오류가 발생했습니다.');
      };

    } catch (error) {
      console.error('❌ [WebSocket] 연결 생성 오류:', error);
      setConnectionError('WebSocket 연결을 생성할 수 없습니다.');
    }
  }, [onInventoryUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, '사용자 요청에 의한 연결 종료');
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionError(null);
    reconnectAttempts.current = 0;
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log('📤 [WebSocket] 메시지 전송:', message);
    } else {
      console.warn('⚠️ [WebSocket] 연결이 열려있지 않아 메시지를 전송할 수 없습니다.');
    }
  }, []);

  // 컴포넌트 마운트 시 연결
  useEffect(() => {
    connect();

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // 토큰 변경 시 재연결
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        console.log('🔑 [WebSocket] 토큰 변경 감지, 재연결');
        disconnect();
        setTimeout(connect, 1000);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionError,
    sendMessage,
    reconnect: connect,
    disconnect
  };
};

export default useInventoryWebSocket;
