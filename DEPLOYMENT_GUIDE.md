# 🚀 LABSEMBLE AWS Lightsail 배포 가이드

## 📋 **사전 준비사항**

### **1. AWS Lightsail 인스턴스 정보**
- **OS**: Ubuntu 24.04 LTS
- **플랜**: 2GB RAM, 1 vCPU (권장)
- **스토리지**: 60GB SSD
- **네트워크**: 고정 IP 할당

### **2. 도메인 정보**
- **도메인**: `your-domain.com` (실제 도메인으로 변경)
- **DNS**: AWS Route 53 또는 외부 DNS 제공업체

### **3. MariaDB 정보**
- **버전**: 10.x 이상
- **포트**: 3306 (기본)
- **사용자**: root 또는 전용 사용자

---

## 🔧 **1단계: 서버 접속 및 기본 설정**

### **1.1 SSH 접속**
```bash
# SSH 키를 사용한 접속
ssh -i your-key.pem ubuntu@your-server-ip

# 또는 비밀번호 접속
ssh ubuntu@your-server-ip
```

### **1.2 시스템 업데이트**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip software-properties-common \
                   apt-transport-https ca-certificates gnupg lsb-release \
                   build-essential python3-pip
```

### **1.3 방화벽 설정**
```bash
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5000
sudo ufw status
```

---

## 🐍 **2단계: Node.js 설치**

### **2.1 Node.js 18.x LTS 설치**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 버전 확인
node --version
npm --version
```

### **2.2 PM2 설치**
```bash
sudo npm install -g pm2
pm2 --version
```

---

## 🌐 **3단계: Nginx 설치 및 설정**

### **3.1 Nginx 설치**
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

### **3.2 Nginx 설정 파일 생성**
```bash
# 기본 사이트 비활성화
sudo rm -f /etc/nginx/sites-enabled/default

# LABSEMBLE 설정 파일 생성
sudo nano /etc/nginx/sites-available/labsemble
```

**설정 파일 내용:**
```nginx
# LABSEMBLE Nginx Settings
server {
    listen 80;
    server_name labsemble.com www.labsemble.com;
    
    # Client MAX Uploads size
    client_max_body_size 100M;
    
    # React app (Static Files)
    location / {
        root /var/www/labsemble/client/build;
        try_files $uri $uri/ /index.html;
        
        # Cashing
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy (Node.js Server)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # File Uploads Proxy
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Erroe Page
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
}
```

### **3.3 Nginx 설정 활성화**
```bash
sudo ln -sf /etc/nginx/sites-available/labsemble /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 👤 **4단계: 사용자 및 디렉토리 설정**

### **4.1 애플리케이션 사용자 생성**
```bash
sudo adduser --disabled-password --gecos "" labsemble
sudo usermod -aG sudo labsemble
```

### **4.2 애플리케이션 디렉토리 생성**
```bash
sudo mkdir -p /var/www/labsemble
sudo chown -R labsemble:labsemble /var/www/labsemble
sudo chmod -R 755 /var/www/labsemble
```

---

## 🗄️ **5단계: MariaDB 설정**

### **5.1 MariaDB 서비스 상태 확인**
```bash
sudo systemctl status mariadb
sudo systemctl enable mariadb
```

### **5.2 데이터베이스 및 사용자 생성**
```bash
sudo mysql -u root -p

# MariaDB 내에서 실행
CREATE DATABASE IF NOT EXISTS labsemble CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'labsemble_user'@'localhost' IDENTIFIED BY 'your-secure-password';
GRANT ALL PRIVILEGES ON labsemble.* TO 'labsemble_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 📁 **6단계: 애플리케이션 배포**

### **6.1 Git 저장소 클론**
```bash
cd /var/www/labsemble
sudo -u labsemble git clone https://github.com/venpus/labsemble2.git .
```

### **6.2 의존성 설치**
```bash
sudo -u labsemble npm run install:all
```

### **6.3 환경 변수 설정**
```bash
sudo -u labsemble nano server/.env
```

**환경 변수 내용:**
```bash
NODE_ENV=production
PORT=5000
JWT_SECRET=4eaf9a18c33769cfa3eaf93042a7a87f
DB_HOST=localhost
DB_USER=venpus
DB_PASSWORD=TianXian007!
DB_NAME=labsemble
CORS_ORIGIN=http://labsesmble.com
```

### **6.4 환경별 설정 상세 가이드**

#### **개발 환경 (Development)**
```bash
# server/.env
NODE_ENV=development
PORT=5000
JWT_SECRET=your-dev-secret-key
DB_HOST=localhost
DB_USER=your_dev_user
DB_PASSWORD=your_dev_password
DB_NAME=labsemble_dev
CORS_ORIGIN=http://localhost:3000

# 로깅 설정
# - 모든 로그 출력 (디버깅용)
# - 콘솔에 상세한 디버깅 정보 표시
# - 이미지 처리 과정, API 호출 과정 등 모든 정보 로깅
```

#### **스테이징 환경 (Staging)**
```bash
# server/.env
NODE_ENV=staging
PORT=5000
JWT_SECRET=your-staging-secret-key
DB_HOST=staging-db-host
DB_USER=your_staging_user
DB_PASSWORD=your_staging_password
DB_NAME=labsemble_staging
CORS_ORIGIN=https://staging.your-domain.com

# 로깅 설정
# - 에러 로그와 경고 로그만 출력
# - 디버깅 로그는 제한적으로 출력
# - 성능 모니터링을 위한 기본 정보 로깅
```

#### **상용 환경 (Production)**
```bash
# server/.env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-production-secret-key
DB_HOST=production-db-host
DB_USER=your_production_user
DB_PASSWORD=your_production_password
DB_NAME=labsemble_production
CORS_ORIGIN=https://your-domain.com

# 로깅 설정
# - 에러 로그만 출력 (중요한 에러 모니터링)
# - 디버깅 로그 자동 비활성화
# - 성능 최적화 및 보안 강화
```

#### **환경별 로그 레벨 비교**

| 환경 | 디버깅 로그 | 정보 로그 | 경고 로그 | 에러 로그 | 성능 |
|------|-------------|-----------|-----------|-----------|------|
| **Development** | ✅ 출력 | ✅ 출력 | ✅ 출력 | ✅ 출력 | 일반 |
| **Staging** | ⚠️ 제한적 | ✅ 출력 | ✅ 출력 | ✅ 출력 | 최적화 |
| **Production** | ❌ 비활성화 | ❌ 비활성화 | ❌ 비활성화 | ✅ 출력 | 최고 |

#### **환경별 설정 파일 관리**
```bash
# 환경별 설정 파일 생성
sudo -u labsemble cp server/env.example server/.env.development
sudo -u labsemble cp server/env.example server/.env.staging
sudo -u labsemble cp server/env.example server/.env.production

# 환경별 설정 적용
# Development
sudo -u labsemble cp server/.env.development server/.env

# Staging
sudo -u labsemble cp server/.env.staging server/.env

# Production
sudo -u labsemble cp server/.env.production server/.env
```

#### **환경별 PM2 설정**
```javascript
// ecosystem.config.js - 환경별 설정
module.exports = {
  apps: [{
    name: 'labsemble-server',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    cwd: '/var/www/labsemble',
    
    // Development 환경
    env_development: {
      NODE_ENV: 'development',
      PORT: 5000,
      instances: 1,
      watch: true,
      ignore_watch: ['node_modules', 'logs', 'uploads']
    },
    
    // Staging 환경
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 5000,
      instances: 2,
      watch: false,
      max_memory_restart: '512M'
    },
    
    // Production 환경
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      instances: 'max',
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10
    }
  }]
};
```

#### **환경별 서버 시작 명령어**
```bash
# Development 환경
sudo -u labsemble pm2 start ecosystem.config.js --env development

# Staging 환경
sudo -u labsemble pm2 start ecosystem.config.js --env staging

# Production 환경
sudo -u labsemble pm2 start ecosystem.config.js --env production

# 환경 변경 시 재시작
sudo -u labsemble pm2 restart labsemble-server --update-env
```

### **6.4 클라이언트 빌드**
```bash
cd client
sudo -u labsemble npm run build
cd ..
```

---

## ⚡ **7단계: PM2 설정 및 서버 시작**

### **7.1 PM2 설정 파일 생성**
```bash
sudo -u labsemble nano ecosystem.config.js
```

**설정 파일 내용:**
```javascript
module.exports = {
  apps: [{
    name: 'labsemble-server',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    cwd: '/var/www/labsemble',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', '.env']
  }]
};
```

### **7.2 로그 디렉토리 생성 및 서버 시작**
```bash
sudo -u labsemble mkdir -p logs
sudo -u labsemble pm2 start ecosystem.config.js
sudo -u labsemble pm2 startup
sudo -u labsemble pm2 save
```

---

## 🔄 **8단계: 자동 배포 스크립트 사용**

### **8.1 스크립트 권한 설정**
```bash
chmod +x deploy.sh
chmod +x setup-env.sh
chmod +x update.sh
chmod +x monitor.sh
```

### **8.2 전체 배포 실행**
```bash
./deploy.sh
```

### **8.3 환경 설정만 실행**
```bash
./setup-env.sh
```

---

## 📊 **9단계: 모니터링 및 유지보수**

### **9.1 시스템 모니터링**
```bash
# 전체 시스템 상태 확인
./monitor.sh

# 실시간 모니터링
./monitor.sh --realtime

# 서비스 상태만 확인
pm2 status
sudo systemctl status nginx
sudo systemctl status mariadb
```

### **9.2 로그 모니터링**
```bash
# PM2 로그
pm2 logs labsemble-server

# Nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 시스템 로그
sudo journalctl -u nginx -f
sudo journalctl -u mariadb -f
```

### **9.3 코드 업데이트**
```bash
# 코드 업데이트 및 재배포
./update.sh

# 문제 발생 시 롤백
./update.sh --rollback
```

---

## 🔐 **10단계: 보안 강화**

### **10.1 SSH 보안**
```bash
# SSH 포트 변경 (선택사항)
sudo nano /etc/ssh/sshd_config
# Port 2222

# SSH 키 인증만 허용
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no
# PubkeyAuthentication yes

sudo systemctl restart sshd
```

### **10.2 방화벽 추가 설정**
```bash
# SSH 포트 변경 시
sudo ufw allow 2222
sudo ufw deny 22

# 특정 IP만 허용 (선택사항)
sudo ufw allow from your-ip-address to any port 22
```

### **10.3 정기 보안 업데이트**
```bash
# 자동 보안 업데이트 설정
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 🚨 **문제 해결**

### **1. 서버가 시작되지 않는 경우**
```bash
# PM2 로그 확인
pm2 logs labsemble-server --lines 100

# 서버 수동 시작 테스트
cd /var/www/labsemble/server
node index.js
```

### **2. Nginx 오류**
```bash
# Nginx 설정 테스트
sudo nginx -t

# Nginx 로그 확인
sudo tail -f /var/log/nginx/error.log
```

### **3. 데이터베이스 연결 오류**
```bash
# MariaDB 상태 확인
sudo systemctl status mariadb

# 데이터베이스 연결 테스트
mysql -u labsemble_user -p labsemble
```

### **4. 권한 문제**
```bash
# 파일 권한 재설정
sudo chown -R labsemble:labsemble /var/www/labsemble
sudo chmod -R 755 /var/www/labsemble
sudo chmod 600 /var/www/labsemble/server/.env
```

---

## 📋 **배포 체크리스트**

- [ ] AWS Lightsail 인스턴스 생성 완료
- [ ] Ubuntu 24.04 LTS 설치 완료
- [ ] Node.js 18.x LTS 설치 완료
- [ ] PM2 설치 완료
- [ ] Nginx 설치 및 설정 완료
- [ ] MariaDB 설정 완료
- [ ] 애플리케이션 사용자 생성 완료
- [ ] Git 저장소 클론 완료
- [ ] 의존성 설치 완료
- [ ] 환경 변수 설정 완료
- [ ] 클라이언트 빌드 완료
- [ ] PM2 설정 및 서버 시작 완료
- [ ] 데이터베이스 마이그레이션 완료
- [ ] Nginx 설정 적용 완료
- [ ] 방화벽 설정 완료
- [ ] 도메인 DNS 설정 완료
- [ ] 웹사이트 접속 테스트 완료
- [ ] API 엔드포인트 테스트 완료

---

## 🌐 **최종 접속 테스트**

### **웹사이트 접속**
```bash
curl -I http://your-domain.com
```

### **API 서버 테스트**
```bash
curl http://your-domain.com/api/health
```

### **파일 업로드 테스트**
```bash
curl -X POST -F "file=@test.txt" http://your-domain.com/api/warehouse/upload-images
```

---

## 🎯 **성능 최적화 팁**

### **1. Nginx 최적화**
```nginx
# gzip 압축 활성화
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# 정적 파일 캐싱
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### **2. PM2 최적화**
```javascript
// 클러스터 모드로 CPU 코어 수만큼 인스턴스 실행
instances: 'max',
exec_mode: 'cluster'
```

### **3. 데이터베이스 최적화**
```sql
-- 인덱스 추가
CREATE INDEX idx_project_id ON warehouse_entries(project_id);
CREATE INDEX idx_entry_date ON warehouse_entries(entry_date);
```

---

**🎉 축하합니다! LABSEMBLE이 AWS Lightsail에 성공적으로 배포되었습니다!**

---

## 📞 **지원 및 문의**

문제가 발생하거나 추가 도움이 필요한 경우:
1. **로그 확인**: `./monitor.sh` 실행
2. **문서 참조**: 이 가이드의 문제 해결 섹션
3. **GitHub Issues**: 프로젝트 저장소에 이슈 등록

**Happy Deploying! 🚀** 