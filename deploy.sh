#!/bin/bash

# 🚀 LABSEMBLE AWS Lightsail 자동 배포 스크립트
# Ubuntu 24.04 LTS + MariaDB + Nginx 환경

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 환경 변수 설정
APP_NAME="labsemble"
APP_USER="labsemble"
APP_DIR="/var/www/labsemble"
SERVER_PORT="5000"
DOMAIN="labsemble.com"  # 실제 도메인으로 변경 필요

# 스크립트 시작
log_info "🚀 LABSEMBLE AWS Lightsail 배포 시작..."
log_info "📍 배포 환경: Ubuntu 24.04 LTS + MariaDB + Nginx"
log_info "🌐 도메인: $DOMAIN"

# 1단계: 시스템 업데이트 및 필수 패키지 설치
log_info "📦 1단계: 시스템 업데이트 및 필수 패키지 설치"
update_system() {
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y curl wget git unzip software-properties-common \
                       apt-transport-https ca-certificates gnupg lsb-release \
                       build-essential python3-pip
    log_success "시스템 업데이트 및 필수 패키지 설치 완료"
}

# 2단계: Node.js 18.x LTS 설치
log_info "🐍 2단계: Node.js 18.x LTS 설치"
install_nodejs() {
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
        log_success "Node.js $(node --version) 설치 완료"
    else
        log_info "Node.js가 이미 설치되어 있습니다: $(node --version)"
    fi
    
    # PM2 설치
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
        log_success "PM2 설치 완료"
    else
        log_info "PM2가 이미 설치되어 있습니다"
    fi
}

# 3단계: Nginx 설치 및 설정
log_info "🌐 3단계: Nginx 설치 및 설정"
install_nginx() {
    if ! command -v nginx &> /dev/null; then
        sudo apt install -y nginx
        sudo systemctl start nginx
        sudo systemctl enable nginx
        log_success "Nginx 설치 및 시작 완료"
    else
        log_info "Nginx가 이미 설치되어 있습니다"
    fi
    
    # Nginx 설정 파일 생성
    create_nginx_config
}

# Nginx 설정 파일 생성
create_nginx_config() {
    log_info "⚙️  Nginx 설정 파일 생성"
    
    sudo tee /etc/nginx/sites-available/labsemble > /dev/null <<EOF
# LABSEMBLE Nginx 설정
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # 클라이언트 최대 업로드 크기
    client_max_body_size 100M;
    
    # React 앱 (정적 파일)
    location / {
        root $APP_DIR/client/build;
        try_files \$uri \$uri/ /index.html;
        
        # 캐싱 설정
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API 프록시 (Node.js 서버)
    location /api/ {
        proxy_pass http://localhost:$SERVER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # 파일 업로드 프록시
    location /uploads/ {
        proxy_pass http://localhost:$SERVER_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # 에러 페이지
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
}
EOF

    # 기본 사이트 비활성화 및 새 사이트 활성화
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo ln -sf /etc/nginx/sites-available/labsemble /etc/nginx/sites-enabled/
    
    # Nginx 설정 테스트 및 재시작
    sudo nginx -t
    sudo systemctl restart nginx
    
    log_success "Nginx 설정 완료"
}

# 4단계: 사용자 생성 및 권한 설정
log_info "👤 4단계: 사용자 생성 및 권한 설정"
setup_user() {
    if ! id "$APP_USER" &>/dev/null; then
        sudo adduser --disabled-password --gecos "" $APP_USER
        sudo usermod -aG sudo $APP_USER
        log_success "사용자 $APP_USER 생성 완료"
    else
        log_info "사용자 $APP_USER가 이미 존재합니다"
    fi
    
    # 애플리케이션 디렉토리 생성 및 권한 설정
    sudo mkdir -p $APP_DIR
    sudo chown -R $APP_USER:$APP_USER $APP_DIR
    sudo chmod -R 755 $APP_DIR
    
    log_success "애플리케이션 디렉토리 권한 설정 완료"
}

# 5단계: 방화벽 설정
log_info "🔥 5단계: 방화벽 설정"
setup_firewall() {
    sudo ufw --force enable
    sudo ufw allow ssh
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw allow $SERVER_PORT
    
    log_success "방화벽 설정 완료"
    sudo ufw status
}

# 6단계: 애플리케이션 배포
log_info "📁 6단계: 애플리케이션 배포"
deploy_app() {
    cd $APP_DIR
    
    # Git 저장소 클론 (이미 존재하면 pull)
    if [ -d ".git" ]; then
        log_info "기존 저장소에서 코드 업데이트"
        git pull origin main
    else
        log_info "Git 저장소 클론"
        # 실제 Git 저장소 URL로 변경 필요
        git clone https://github.com/your-username/labsemble.git .
    fi
    
    # 의존성 설치
    log_info "의존성 설치 중..."
    npm run install:all
    
    # 환경 변수 설정
    setup_environment
    
    # 클라이언트 빌드
    log_info "클라이언트 빌드 중..."
    cd client
    npm run build
    cd ..
    
    log_success "애플리케이션 배포 완료"
}

# 환경 변수 설정
setup_environment() {
    log_info "⚙️  환경 변수 설정"
    
    # .env 파일 생성
    sudo tee server/.env > /dev/null <<EOF
NODE_ENV=production
PORT=$SERVER_PORT
JWT_SECRET=$(openssl rand -base64 32)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-mariadb-password
DB_NAME=labsemble
CORS_ORIGIN=http://$DOMAIN
EOF

    # .env 파일 권한 설정
    sudo chown $APP_USER:$APP_USER server/.env
    sudo chmod 600 server/.env
    
    log_success "환경 변수 설정 완료"
}

# 7단계: PM2 설정 및 서버 시작
log_info "⚡ 7단계: PM2 설정 및 서버 시작"
setup_pm2() {
    cd $APP_DIR
    
    # PM2 설정 파일 생성
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'labsemble-server',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    cwd: '$APP_DIR/server',
    env: {
      NODE_ENV: 'production',
      PORT: $SERVER_PORT
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads']
  }]
};
EOF

    # 로그 디렉토리 생성
    mkdir -p logs
    
    # PM2로 서버 시작
    pm2 start ecosystem.config.js
    
    # PM2 자동 시작 설정
    pm2 startup
    pm2 save
    
    log_success "PM2 설정 및 서버 시작 완료"
}

# 8단계: 데이터베이스 마이그레이션
log_info "🗄️  8단계: 데이터베이스 마이그레이션"
run_migrations() {
    cd $APP_DIR/server
    
    log_info "데이터베이스 마이그레이션 실행 중..."
    npm run migrate
    
    log_success "데이터베이스 마이그레이션 완료"
}

# 9단계: 최종 검증
log_info "🔍 9단계: 최종 검증"
verify_deployment() {
    log_info "서비스 상태 확인 중..."
    
    # Nginx 상태 확인
    if sudo systemctl is-active --quiet nginx; then
        log_success "Nginx 실행 중"
    else
        log_error "Nginx 실행 실패"
        return 1
    fi
    
    # PM2 상태 확인
    if pm2 list | grep -q "labsemble-server.*online"; then
        log_success "PM2 서버 실행 중"
    else
        log_error "PM2 서버 실행 실패"
        return 1
    fi
    
    # API 응답 확인
    sleep 5  # 서버 시작 대기
    if curl -f http://localhost:$SERVER_PORT/api/health > /dev/null 2>&1; then
        log_success "API 서버 응답 확인"
    else
        log_error "API 서버 응답 실패"
        return 1
    fi
    
    log_success "모든 검증 완료!"
}

# 10단계: 배포 완료 요약
deployment_summary() {
    log_success "🎉 LABSEMBLE 배포 완료!"
    echo ""
    echo "📋 배포 요약:"
    echo "   • 애플리케이션: $APP_NAME"
    echo "   • 사용자: $APP_USER"
    echo "   • 디렉토리: $APP_DIR"
    echo "   • 서버 포트: $SERVER_PORT"
    echo "   • 도메인: $DOMAIN"
    echo ""
    echo "🔗 접속 정보:"
    echo "   • 웹사이트: http://$DOMAIN"
    echo "   • API 서버: http://$DOMAIN/api/health"
    echo ""
    echo "📊 모니터링:"
    echo "   • PM2 상태: pm2 status"
    echo "   • PM2 로그: pm2 logs labsemble-server"
    echo "   • Nginx 로그: sudo tail -f /var/log/nginx/access.log"
    echo ""
    echo "⚠️  다음 단계:"
    echo "   1. 도메인 DNS 설정 확인"
    echo "   2. MariaDB 비밀번호 설정"
    echo "   3. HTTPS 인증서 설정 (선택사항)"
    echo ""
}

# 메인 실행 함수
main() {
    log_info "🚀 LABSEMBLE AWS Lightsail 배포 시작"
    
    # 각 단계 실행
    update_system
    install_nodejs
    install_nginx
    setup_user
    setup_firewall
    deploy_app
    setup_pm2
    run_migrations
    verify_deployment
    deployment_summary
    
    log_success "🎉 배포가 성공적으로 완료되었습니다!"
}

# 스크립트 실행
main "$@" 