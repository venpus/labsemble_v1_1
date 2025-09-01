#!/bin/bash

# 📊 LABSEMBLE 시스템 모니터링 스크립트
# 서버 상태, 성능, 로그 모니터링

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로그 함수
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "${PURPLE}📊 $1${NC}"
}

# 환경 변수
APP_NAME="labsemble"
APP_USER="labsemble"
APP_DIR="/var/www/labsemble"
SERVER_PORT="5000"

# 시스템 리소스 모니터링
system_resources() {
    log_header "시스템 리소스 모니터링"
    
    echo "🖥️  CPU 사용률:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
    
    echo "💾 메모리 사용률:"
    free -h | grep "Mem:" | awk '{print "사용: " $3 "/" $2 " (" int($3/$2*100) "%)"}'
    
    echo "💿 디스크 사용률:"
    df -h / | tail -1 | awk '{print "사용: " $3 "/" $2 " (" $5 ")"}'
    
    echo "🌐 네트워크 연결:"
    netstat -an | grep :$SERVER_PORT | wc -l | awk '{print "활성 연결: " $1}'
    
    echo ""
}

# 서비스 상태 모니터링
service_status() {
    log_header "서비스 상태 모니터링"
    
    # Nginx 상태
    if sudo systemctl is-active --quiet nginx; then
        echo -e "🌐 Nginx: ${GREEN}실행 중${NC}"
    else
        echo -e "🌐 Nginx: ${RED}중지됨${NC}"
    fi
    
    # MariaDB 상태
    if sudo systemctl is-active --quiet mariadb; then
        echo -e "🗄️  MariaDB: ${GREEN}실행 중${NC}"
    else
        echo -e "🗄️  MariaDB: ${RED}중지됨${NC}"
    fi
    
    # PM2 상태
    if pm2 list | grep -q "labsemble-server.*online"; then
        echo -e "⚡ PM2 서버: ${GREEN}실행 중${NC}"
        pm2 list | grep labsemble-server
    else
        echo -e "⚡ PM2 서버: ${RED}중지됨${NC}"
    fi
    
    echo ""
}

# 애플리케이션 성능 모니터링
app_performance() {
    log_header "애플리케이션 성능 모니터링"
    
    cd $APP_DIR
    
    # API 응답 시간 테스트
    echo "🚀 API 응답 시간 테스트:"
    if command -v curl &> /dev/null; then
        RESPONSE_TIME=$(curl -w "@-" -o /dev/null -s "http://localhost:$SERVER_PORT/api/health" <<< "time_total: %{time_total}s")
        echo "   • Health Check: $RESPONSE_TIME"
    else
        echo "   • curl 명령어가 설치되지 않았습니다."
    fi
    
    # 로그 파일 크기
    echo "📝 로그 파일 크기:"
    if [ -d "logs" ]; then
        for log_file in logs/*.log; do
            if [ -f "$log_file" ]; then
                size=$(du -h "$log_file" | cut -f1)
                echo "   • $(basename "$log_file"): $size"
            fi
        done
    fi
    
    # 업로드 디렉토리 크기
    echo "📁 업로드 디렉토리 크기:"
    if [ -d "server/uploads" ]; then
        upload_size=$(du -sh server/uploads | cut -f1)
        echo "   • uploads: $upload_size"
    fi
    
    echo ""
}

# 데이터베이스 상태 모니터링
database_status() {
    log_header "데이터베이스 상태 모니터링"
    
    # MariaDB 프로세스 확인
    DB_PROCESSES=$(ps aux | grep mariadb | grep -v grep | wc -l)
    echo "🗄️  MariaDB 프로세스: $DB_PROCESSES"
    
    # 데이터베이스 크기
    if command -v mysql &> /dev/null; then
        echo "💾 데이터베이스 크기:"
        mysql -u root -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema = 'labsemble' GROUP BY table_schema;" 2>/dev/null || echo "   • 데이터베이스 접근 권한이 없습니다."
    fi
    
    # 테이블 개수
    if command -v mysql &> /dev/null; then
        TABLE_COUNT=$(mysql -u root -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'labsemble';" 2>/dev/null | tail -1)
        echo "📊 테이블 개수: $TABLE_COUNT"
    fi
    
    echo ""
}

# 보안 상태 모니터링
security_status() {
    log_header "보안 상태 모니터링"
    
    # 방화벽 상태
    if command -v ufw &> /dev/null; then
        UFW_STATUS=$(sudo ufw status | head -1)
        echo "🔥 방화벽: $UFW_STATUS"
    fi
    
    # 열린 포트 확인
    echo "🔓 열린 포트:"
    sudo netstat -tlnp | grep LISTEN | awk '{print "   • " $4 " (" $7 ")"}' | head -10
    
    # SSH 접속 시도
    echo "🔐 SSH 접속 시도 (최근 10개):"
    sudo tail -10 /var/log/auth.log | grep "sshd" | awk '{print "   • " $1 " " $2 " " $3 " " $9}' | tail -5
    
    echo ""
}

# 로그 모니터링
log_monitoring() {
    log_header "로그 모니터링"
    
    # Nginx 에러 로그 (최근 5개)
    echo "🌐 Nginx 에러 로그 (최근 5개):"
    if [ -f "/var/log/nginx/error.log" ]; then
        sudo tail -5 /var/log/nginx/error.log | while read line; do
            echo "   • $line"
        done
    else
        echo "   • 에러 로그 파일을 찾을 수 없습니다."
    fi
    
    # PM2 로그 (최근 5개)
    echo "⚡ PM2 로그 (최근 5개):"
    pm2 logs labsemble-server --lines 5 --nostream 2>/dev/null | while read line; do
        echo "   • $line"
    done
    
    # 시스템 로그 (최근 5개)
    echo "🖥️  시스템 로그 (최근 5개):"
    sudo journalctl -n 5 --no-pager | while read line; do
        echo "   • $line"
    done
    
    echo ""
}

# 백업 상태 확인
backup_status() {
    log_header "백업 상태 확인"
    
    BACKUP_DIR="/var/backups/labsemble"
    
    if [ -d "$BACKUP_DIR" ]; then
        echo "💾 백업 디렉토리: $BACKUP_DIR"
        
        # 최근 백업 파일들
        echo "📁 최근 백업 파일들:"
        ls -lt "$BACKUP_DIR" | head -6 | while read line; do
            if [[ $line != total* ]]; then
                echo "   • $line"
            fi
        done
        
        # 백업 디렉토리 크기
        BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
        echo "📊 백업 디렉토리 크기: $BACKUP_SIZE"
    else
        echo "❌ 백업 디렉토리를 찾을 수 없습니다."
    fi
    
    echo ""
}

# 성능 권장사항
performance_recommendations() {
    log_header "성능 권장사항"
    
    # CPU 사용률 확인
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        echo -e "⚠️  CPU 사용률이 높습니다: ${YELLOW}${CPU_USAGE}%${NC}"
        echo "   • PM2 클러스터 모드 확인"
        echo "   • 불필요한 프로세스 정리"
    fi
    
    # 메모리 사용률 확인
    MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$MEM_USAGE" -gt 80 ]; then
        echo -e "⚠️  메모리 사용률이 높습니다: ${YELLOW}${MEM_USAGE}%${NC}"
        echo "   • 메모리 누수 확인"
        echo "   • 불필요한 서비스 정리"
    fi
    
    # 디스크 사용률 확인
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 80 ]; then
        echo -e "⚠️  디스크 사용률이 높습니다: ${YELLOW}${DISK_USAGE}%${NC}"
        echo "   • 로그 파일 정리"
        echo "   • 오래된 백업 파일 정리"
    fi
    
    echo ""
}

# 실시간 모니터링
realtime_monitoring() {
    log_header "실시간 모니터링 시작 (Ctrl+C로 종료)"
    
    echo "🔄 5초마다 업데이트됩니다..."
    echo ""
    
    while true; do
        clear
        echo -e "${CYAN}🕐 $(date)${NC}"
        echo ""
        
        # 간단한 상태 요약
        echo "📊 상태 요약:"
        
        # 서비스 상태
        NGINX_STATUS=$(sudo systemctl is-active nginx 2>/dev/null || echo "unknown")
        PM2_STATUS=$(pm2 list | grep labsemble-server | awk '{print $10}' 2>/dev/null || echo "unknown")
        
        echo -e "   • Nginx: $([ "$NGINX_STATUS" = "active" ] && echo -e "${GREEN}실행 중${NC}" || echo -e "${RED}중지됨${NC}")"
        echo -e "   • PM2: $([ "$PM2_STATUS" = "online" ] && echo -e "${GREEN}실행 중${NC}" || echo -e "${RED}중지됨${NC}")"
        
        # 리소스 사용률
        CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
        MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
        
        echo "   • CPU: ${CPU_USAGE}%"
        echo "   • 메모리: ${MEM_USAGE}%"
        
        # 활성 연결
        ACTIVE_CONNECTIONS=$(netstat -an | grep :$SERVER_PORT | wc -l)
        echo "   • 활성 연결: $ACTIVE_CONNECTIONS"
        
        echo ""
        echo "🔄 다음 업데이트까지 5초 대기..."
        sleep 5
    done
}

# 메인 메뉴
show_menu() {
    clear
    echo -e "${PURPLE}📊 LABSEMBLE 시스템 모니터링${NC}"
    echo "=================================="
    echo "1. 전체 시스템 상태 확인"
    echo "2. 서비스 상태만 확인"
    echo "3. 성능 모니터링"
    echo "4. 보안 상태 확인"
    echo "5. 로그 모니터링"
    echo "6. 백업 상태 확인"
    echo "7. 실시간 모니터링"
    echo "8. 종료"
    echo "=================================="
    echo ""
}

# 메인 실행
main() {
    while true; do
        show_menu
        read -p "선택하세요 (1-8): " choice
        
        case $choice in
            1)
                clear
                system_resources
                service_status
                app_performance
                database_status
                security_status
                backup_status
                performance_recommendations
                read -p "계속하려면 Enter를 누르세요..."
                ;;
            2)
                clear
                service_status
                read -p "계속하려면 Enter를 누르세요..."
                ;;
            3)
                clear
                system_resources
                app_performance
                performance_recommendations
                read -p "계속하려면 Enter를 누르세요..."
                ;;
            4)
                clear
                security_status
                read -p "계속하려면 Enter를 누르세요..."
                ;;
            5)
                clear
                log_monitoring
                read -p "계속하려면 Enter를 누르세요..."
                ;;
            6)
                clear
                backup_status
                read -p "계속하려면 Enter를 누르세요..."
                ;;
            7)
                clear
                realtime_monitoring
                ;;
            8)
                echo "모니터링을 종료합니다."
                exit 0
                ;;
            *)
                echo "잘못된 선택입니다. 다시 시도해주세요."
                sleep 2
                ;;
        esac
    done
}

# 스크립트 실행
if [ "$1" = "--realtime" ]; then
    realtime_monitoring
else
    main
fi 