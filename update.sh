#!/bin/bash

# 🔄 LABSEMBLE Update Deployment Script
# For updating the existing deployed application

set -e

# Define colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Log functions
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

# Environment variables
APP_NAME="labsemble"
APP_USER="labsemble"
APP_DIR="/var/www/labsemble"
SERVER_PORT="5000"

# Create backup
create_backup() {
    log_info "💾 Creating backup..."
    
    BACKUP_DIR="/var/backups/labsemble"
    BACKUP_NAME="labsemble-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    sudo mkdir -p $BACKUP_DIR
    
    # Backup application directory
    cd $APP_DIR
    sudo tar -czf $BACKUP_DIR/$BACKUP_NAME --exclude=node_modules --exclude=logs .
    
    # Backup database
    DB_BACKUP_NAME="labsemble-db-$(date +%Y%m%d-%H%M%S).sql"
    sudo mysqldump -u root -p$DB_PASSWORD labsemble > $BACKUP_DIR/$DB_BACKUP_NAME
    
    log_success "Backup completed: $BACKUP_DIR/$BACKUP_NAME"
    log_success "Database backup completed: $BACKUP_DIR/$DB_BACKUP_NAME"
}

# Update code
update_code() {
    log_info "📥 Updating code..."
    
    cd $APP_DIR
    
    # Check Git status
    if [ -d ".git" ]; then
        # Check for changes
        if ! git diff-index --quiet HEAD --; then
            log_warning "Local changes detected. Continuing with backup."
            git stash
        fi
        
        # Fetch latest code from remote repository
        git fetch origin
        git reset --hard origin/main
        
        log_success "Code update completed"
    else
        log_error "Git repository not found"
        exit 1
    fi
}

# Update dependencies
update_dependencies() {
    log_info "📦 Updating dependencies..."
    
    cd $APP_DIR
    
    # Update client dependencies
    cd client
    npm ci --production
    cd ..
    
    # Update server dependencies
    cd server
    npm ci --production
    cd ..
    
    log_success "Dependencies updated"
}

# Build client
build_client() {
    log_info "🏗️  Building client..."
    
    cd $APP_DIR/client
    
    # Production build
    npm run build
    
    cd ..
    
    log_success "Client build completed"
}

# Restart server
restart_server() {
    log_info "🔄 Restarting server..."
    
    cd $APP_DIR
    
    # Restart server with PM2
    pm2 restart labsemble-server
    
    # Check server status
    sleep 5
    
    if pm2 list | grep -q "labsemble-server.*online"; then
        log_success "Server restarted"
    else
        log_error "Server restart failed"
        exit 1
    fi
}

    # Run database migrations
run_migrations() {
    log_info "🗄️  Running database migrations..."
    
    cd $APP_DIR/server
    
    # Run migrations
    npm run migrate
    
    log_success "Database migrations completed"
}

# Verify update
verify_update() {
    log_info "🔍 Verifying update..."
    
    # Check server status
    if pm2 list | grep -q "labsemble-server.*online"; then
        log_success "PM2 server is running"
    else
        log_error "PM2 server is not running"
        return 1
    fi
    
    # Check API response
    sleep 3
    if curl -f http://localhost:$SERVER_PORT/api/health > /dev/null 2>&1; then
        log_success "API server is responding"
    else
        log_error "API server is not responding"
        return 1
    fi
    
    # Check Nginx status
    if sudo systemctl is-active --quiet nginx; then
        log_success "Nginx is running"
    else
        log_error "Nginx is not running"
        return 1
    fi
    
    log_success "All verifications completed!"
}

# Rollback function
rollback() {
    log_warning "🔄 Running rollback..."
    
    cd $APP_DIR
    
    # Stop PM2 server
    pm2 stop labsemble-server
    
    # Restore from backup
    LATEST_BACKUP=$(ls -t /var/backups/labsemble/labsemble-*.tar.gz | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        sudo tar -xzf $LATEST_BACKUP -C $APP_DIR
        log_success "Code rollback completed"
    fi
    
    # Restore database from backup
    LATEST_DB_BACKUP=$(ls -t /var/backups/labsemble/labsemble-db-*.sql | head -1)
    if [ -n "$LATEST_DB_BACKUP" ]; then
        sudo mysql -u root -p$DB_PASSWORD labsemble < $LATEST_DB_BACKUP
        log_success "Database rollback completed"
    fi
    
    # Restart server
    pm2 start ecosystem.config.js --env production
    
    log_warning "Rollback completed."
}

# Update summary
update_summary() {
    log_success "🎉 Update completed successfully!"
    echo ""
    echo "📋 Update summary:"
    echo "   • Application: $APP_NAME"
    echo "   • Update time: $(date)"
    echo "   • Server status: $(pm2 list | grep labsemble-server | awk '{print $10}')"
    echo ""
    echo "📊 Monitoring:"
    echo "   • PM2 status: pm2 status"
    echo "   • PM2 logs: pm2 logs labsemble-server"
    echo "   • Nginx logs: sudo tail -f /var/log/nginx/access.log"
    echo ""
    echo "⚠️  If issues occur:"
    echo "   • Rollback: ./update.sh --rollback"
    echo "   • Check logs: pm2 logs labsemble-server --lines 100"
}

# Main execution
main() {
    log_info "🔄 LABSEMBLE update started"
    
    # MariaDB password input
    read -s -p "Enter the MariaDB root password: " DB_PASSWORD
    echo ""
    
    if [ -z "$DB_PASSWORD" ]; then
        log_error "Please enter the MariaDB root password."
        exit 1
    fi
    
    # Check rollback option
    if [ "$1" = "--rollback" ]; then
        rollback
        exit 0
    fi
    
    # Run each step
    create_backup
    update_code
    update_dependencies
    build_client
    run_migrations
    restart_server
    verify_update
    update_summary
    
    log_success "🎉 Update completed successfully!"
}

# Run script
main "$@" 