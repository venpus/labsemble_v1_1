const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { invalidateInventoryCache } = require('../middleware/cache');

class InventoryWebSocket {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/inventory',
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.clients = new Map(); // userId -> WebSocket 연결들
    this.setupEventHandlers();
    
    console.log('🔌 [WebSocket] 재고 실시간 업데이트 서버 시작');
  }
  
  // 클라이언트 인증
  verifyClient(info) {
    const url = new URL(info.req.url, `http://${info.req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.log('❌ [WebSocket] 토큰 없음');
      return false;
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      info.req.user = decoded;
      return true;
    } catch (error) {
      console.log('❌ [WebSocket] 토큰 검증 실패:', error.message);
      return false;
    }
  }
  
  // 이벤트 핸들러 설정
  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const user = req.user;
      console.log(`🔌 [WebSocket] 사용자 연결: ${user.username} (${user.id})`);
      
      // 사용자별 연결 관리
      if (!this.clients.has(user.id)) {
        this.clients.set(user.id, new Set());
      }
      this.clients.get(user.id).add(ws);
      
      // 연결 정보 저장
      ws.userId = user.id;
      ws.isAlive = true;
      
      // 핑/퐁 처리
      ws.on('pong', () => {
        ws.isAlive = true;
      });
      
      // 연결 종료 처리
      ws.on('close', () => {
        console.log(`🔌 [WebSocket] 사용자 연결 종료: ${user.username}`);
        const userConnections = this.clients.get(user.id);
        if (userConnections) {
          userConnections.delete(ws);
          if (userConnections.size === 0) {
            this.clients.delete(user.id);
          }
        }
      });
      
      // 에러 처리
      ws.on('error', (error) => {
        console.error(`❌ [WebSocket] 연결 오류 (${user.username}):`, error);
      });
      
      // 연결 확인 메시지 전송
      ws.send(JSON.stringify({
        type: 'connection',
        message: '재고 실시간 업데이트 연결됨',
        timestamp: new Date().toISOString()
      }));
    });
    
    // 주기적 연결 상태 확인 (30초마다)
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          console.log('🔌 [WebSocket] 비활성 연결 종료');
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }
  
  // 특정 사용자에게 메시지 전송
  sendToUser(userId, message) {
    const userConnections = this.clients.get(userId);
    if (userConnections) {
      const messageStr = JSON.stringify(message);
      userConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
      console.log(`📤 [WebSocket] 사용자 ${userId}에게 메시지 전송:`, message.type);
    }
  }
  
  // 모든 연결된 사용자에게 브로드캐스트
  broadcast(message) {
    const messageStr = JSON.stringify(message);
    this.wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
    console.log(`📢 [WebSocket] 브로드캐스트:`, message.type);
  }
  
  // 재고 업데이트 알림
  notifyInventoryUpdate(updateType, data) {
    const message = {
      type: 'inventory_update',
      updateType, // 'entry', 'shipping', 'delivery', 'status_change'
      data,
      timestamp: new Date().toISOString()
    };
    
    // 캐시 무효화
    invalidateInventoryCache();
    
    // 모든 사용자에게 알림
    this.broadcast(message);
  }
  
  // 프로젝트별 재고 업데이트 알림
  notifyProjectInventoryUpdate(projectId, updateType, data) {
    const message = {
      type: 'project_inventory_update',
      projectId,
      updateType,
      data,
      timestamp: new Date().toISOString()
    };
    
    // 캐시 무효화
    invalidateInventoryCache();
    
    // 모든 사용자에게 알림 (특정 프로젝트 관심자 필터링은 클라이언트에서)
    this.broadcast(message);
  }
  
  // 연결 상태 조회
  getConnectionStats() {
    return {
      totalConnections: this.wss.clients.size,
      uniqueUsers: this.clients.size,
      userConnections: Array.from(this.clients.entries()).map(([userId, connections]) => ({
        userId,
        connectionCount: connections.size
      }))
    };
  }
}

module.exports = InventoryWebSocket;
