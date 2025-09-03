#!/bin/bash

# 🔧 LABSEMBLE 환경 설정 스크립트
# MariaDB 설정 및 환경 변수 구성

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 환경 변수
APP_NAME="labsemble"
APP_USER="labsemble"
APP_DIR="/var/www/labsemble"
DB_NAME="labsemble"
DB_USER="venpus"
DB_PASSWORD="TianXian007!"

# MariaDB 설정
setup_mariadb() {
    log_info "🗄️  MariaDB 설정 시작"
    
    # MariaDB 서비스 상태 확인
    if ! sudo systemctl is-active --quiet mariadb; then
        log_error "MariaDB가 실행되지 않고 있습니다. 먼저 MariaDB를 시작해주세요."
        exit 1
    fi
    
    # 데이터베이스 생성
    log_info "데이터베이스 생성 중..."
    sudo mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    # 사용자 생성 및 권한 부여
    log_info "데이터베이스 사용자 생성 중..."
    sudo mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
    sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
    sudo mysql -e "FLUSH PRIVILEGES;"
    
    log_success "MariaDB 설정 완료"
}

# 환경 변수 파일 생성
create_env_file() {
    log_info "⚙️  환경 변수 파일 생성"
    
    # JWT 시크릿 생성
    JWT_SECRET=$(openssl rand -base64 32)
    
    # .env 파일 생성
    sudo tee $APP_DIR/server/.env > /dev/null <<EOF
# LABSEMBLE 프로덕션 환경 설정
NODE_ENV=production
PORT=5000

# JWT 설정
JWT_SECRET=$JWT_SECRET

# 데이터베이스 설정
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# CORS 설정
CORS_ORIGIN=http://your-domain.com

# 파일 업로드 설정
MAX_FILE_SIZE=100MB
UPLOAD_PATH=uploads

# 로깅 설정
LOG_LEVEL=info
LOG_FILE=logs/app.log

# 보안 설정
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

    # .env 파일 권한 설정
    sudo chown $APP_USER:$APP_USER $APP_DIR/server/.env
    sudo chmod 600 $APP_DIR/server/.env
    
    log_success "환경 변수 파일 생성 완료"
}

# PM2 환경 설정
setup_pm2_env() {
    log_info "⚡ PM2 환경 설정"
    
    cd $APP_DIR
    
    # PM2 환경별 설정 파일 생성
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'labsemble-server',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    cwd: '$APP_DIR/server',
    
    // 프로덕션 환경
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      DB_HOST: 'localhost',
      DB_USER: '$DB_USER',
      DB_PASSWORD: '$DB_PASSWORD',
      DB_NAME: '$DB_NAME'
    },
    
    // 개발 환경
    env_development: {
      NODE_ENV: 'development',
      PORT: 5000,
      DB_HOST: 'localhost',
      DB_USER: '$DB_USER',
      DB_PASSWORD: '$DB_PASSWORD',
      DB_NAME: '$DB_NAME'
    },
    
    // 로그 설정
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // 성능 설정
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    
    // 파일 감시 설정
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', '.env'],
    
    // 클러스터 설정
    min_uptime: '10s',
    max_restarts: 5
  }]
};
EOF

    log_success "PM2 환경 설정 완료"
}

# Nginx 환경별 설정
setup_nginx_env() {
    log_info "🌐 Nginx 환경별 설정"
    
    # 프로덕션용 Nginx 설정
    sudo tee /etc/nginx/sites-available/labsemble-prod > /dev/null <<EOF
# LABSEMBLE 프로덕션 Nginx 설정
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # 보안 헤더
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
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
        
        # HTML 파일은 캐시하지 않음
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
    
    # API 프록시 (Node.js 서버)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        
        # API 요청 제한
        limit_req zone=api burst=20 nodelay;
    }
    
    # 파일 업로드 프록시
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # 업로드 파일 캐싱
        expires 1d;
        add_header Cache-Control "public";
    }
    
    # 정적 파일 최적화
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }
    
    # 에러 페이지
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    
    # gzip 압축
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}

# API 요청 제한 설정
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
EOF

    # 개발용 Nginx 설정
    sudo tee /etc/nginx/sites-available/labsemble-dev > /dev/null <<EOF
# LABSEMBLE 개발 Nginx 설정
server {
    listen 80;
    server_name dev.your-domain.com;
    
    # 클라이언트 최대 업로드 크기
    client_max_body_size 100M;
    
    # React 개발 서버 프록시
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # API 프록시 (Node.js 서버)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # 파일 업로드 프록시
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    log_success "Nginx 환경별 설정 완료"
}

# 메인 실행
main() {
    log_info "🔧 LABSEMBLE 환경 설정 시작"
    
    # 비밀번호 입력 받기
    read -s -p "MariaDB 비밀번호를 입력하세요: " DB_PASSWORD
    echo ""
    
    if [ -z "$DB_PASSWORD" ]; then
        log_error "비밀번호를 입력해주세요."
        exit 1
    fi
    
    # 각 단계 실행
    setup_mariadb
    create_env_file
    setup_pm2_env
    setup_nginx_env
    
    log_success "🎉 환경 설정이 완료되었습니다!"
    echo ""
    echo "📋 다음 단계:"
    echo "   1. 도메인을 실제 도메인으로 변경"
    echo "   2. Nginx 설정 파일에서 도메인 수정"
    echo "   3. PM2로 서버 시작: pm2 start ecosystem.config.js --env production"
    echo "   4. Nginx 설정 적용: sudo nginx -t && sudo systemctl reload nginx"
}

main "$@" 