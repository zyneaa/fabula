#!/bin/bash
# Fabula Deployment Script
# Usage: ./deploy.sh [VPS_HOST] [VPS_USER]

set -e

# Configuration
VPS_HOST="${1:-}"
VPS_USER="${2:-ubuntu}"
REPO_URL="https://github.com/zyneaa/fabula.git"
DEPLOY_DIR="/home/${VPS_USER}/fabula"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if VPS_HOST is provided
if [ -z "$VPS_HOST" ]; then
    log_error "VPS_HOST is required"
    echo "Usage: $0 [VPS_HOST] [VPS_USER]"
    echo "Example: $0 123.456.78.90 ubuntu"
    exit 1
fi

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa ]; then
    log_warn "No SSH key found. Attempting to deploy anyway..."
fi

# Function to run remote command
run_remote() {
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${VPS_USER}@${VPS_HOST}" "$1"
}

log_info "Starting Fabula deployment to ${VPS_USER}@${VPS_HOST}"
log_info "=========================================="

# Check SSH connectivity
log_info "Testing SSH connection..."
if ! ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -q "${VPS_USER}@${VPS_HOST}" "echo SSH connection successful"; then
    log_error "SSH connection failed. Please check:"
    log_error "  1. VPS_HOST is correct"
    log_error "  2. SSH key is authorized on VPS"
    log_error "  3. VPS is accessible"
    exit 1
fi
log_info "SSH connection successful!"

# Check if Fabula directory exists
if ! run_remote "[ -d '${DEPLOY_DIR}' ]"; then
    log_info "Repository not found. Cloning..."
    run_remote "git clone ${REPO_URL} ${DEPLOY_DIR}"
fi

# Pull latest code
log_info "Pulling latest code..."
run_remote "cd ${DEPLOY_DIR} && git pull origin main"

# Check if Docker is installed
if ! run_remote "command -v docker > /dev/null 2>&1"; then
    log_error "Docker is not installed on the VPS"
    log_error "Please install Docker first: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# Check if Docker Compose is installed
if ! run_remote "command -v docker-compose > /dev/null 2>&1"; then
    log_error "Docker Compose is not installed on the VPS"
    log_error "Please install Docker Compose: sudo apt install docker-compose-plugin"
    exit 1
fi

# Stop current containers
log_info "Stopping current containers..."
run_remote "cd ${DEPLOY_DIR} && docker compose down || true"

# Pull latest images
log_info "Pulling latest Docker images..."
run_remote "cd ${DEPLOY_DIR} && docker compose pull"

# Start new containers
log_info "Starting new containers..."
run_remote "cd ${DEPLOY_DIR} && docker compose up -d"

# Wait for containers to start
log_info "Waiting for containers to start..."
sleep 10

# Run database migrations
log_info "Running database migrations..."
run_remote "cd ${DEPLOY_DIR} && docker compose exec -T backend alembic upgrade head || true"

# Run health check
log_info "Running health check..."
if run_remote "curl -f http://localhost:8000/health > /dev/null 2>&1"; then
    log_info "Health check passed!"
else
    log_warn "Health check failed. Checking logs..."
    run_remote "cd ${DEPLOY_DIR} && docker compose logs backend"
    exit 1
fi

log_info "=========================================="
log_info "Deployment completed successfully!"
log_info "=========================================="
log_info "Application URL: https://${VPS_HOST}"
log_info "Backend API: https://${VPS_HOST}/api"
log_info "API Docs: https://${VPS_HOST}/docs"
log_info ""
log_info "To access logs:"
log_info "  ssh ${VPS_USER}@${VPS_HOST}"
log_info "  cd ${DEPLOY_DIR}"
log_info "  docker compose logs -f"