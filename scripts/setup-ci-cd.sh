#!/bin/bash
# Fabula CI/CD Setup Script
# This script helps configure GitHub secrets for CI/CD deployment

set -e

echo "=========================================="
echo "  Fabula CI/CD Setup Helper"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
REPO_NAME="${REPO_NAME:-}"
DOCKERHUB_USERNAME="${DOCKERHUB_USERNAME:-}"
VPS_HOST="${VPS_HOST:-}"

echo "This script will help you configure GitHub secrets for CI/CD."
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}GitHub CLI (gh) not found${NC}"
    echo "Install: https://cli.github.com/"
    echo ""
    echo "Skipping GitHub CLI setup. Configure secrets manually."
    echo ""
fi

# Collect configuration
echo "Please provide your deployment configuration:"
echo ""

read -p "GitHub Repository Name (owner/repo): " REPO_NAME
if [ -z "$REPO_NAME" ]; then
    echo -e "${RED}Repository name is required${NC}"
    exit 1
fi

read -p "Docker Hub Username: " DOCKERHUB_USERNAME
if [ -z "$DOCKERHUB_USERNAME" ]; then
    echo -e "${RED}Docker Hub username is required${NC}"
    exit 1
fi

read -p "VPS Host (IP or domain): " VPS_HOST
if [ -z "$VPS_HOST" ]; then
    echo -e "${RED}VPS host is required${NC}"
    exit 1
fi

read -p "VPS SSH Username (default: whitewolf): " VPS_USER
VPS_USER="${VPS_USER:-whitewolf}"

read -p "Target URL for scanning: " TARGET_URL
if [ -z "$TARGET_URL" ]; then
    echo -e "${YELLOW}Target URL not provided. Security scans will use localhost${NC}"
    TARGET_URL="http://localhost:8000"
fi

echo ""
echo "=========================================="
echo "  Next Steps"
echo "=========================================="
echo ""

if command -v gh &> /dev/null; then
    echo -e "${GREEN}Using GitHub CLI to configure secrets...${NC}"
    echo ""
    
    # Login to GitHub
    gh auth status || gh auth login
    
    # Configure Docker Hub credentials
    echo "Setting up Docker Hub credentials..."
    read -sp "Docker Hub Password or Access Token: " DOCKERHUB_TOKEN
    echo ""
    
    # Set GitHub secrets
    gh secret set DOCKERHUB_USERNAME -b"$DOCKERHUB_USERNAME" --repo "$REPO_NAME"
    gh secret set DOCKERHUB_TOKEN -b"$DOCKERHUB_TOKEN" --repo "$REPO_NAME"
    gh secret set VPS_HOST -b"$VPS_HOST" --repo "$REPO_NAME"
    gh secret set VPS_USER -b"$VPS_USER" --repo "$REPO_NAME"
    gh secret set TARGET_URL -b"$TARGET_URL" --repo "$REPO_NAME"
    
    # SSH key handling
    echo ""
    echo -e "${YELLOW}SSH Key Setup${NC}"
    echo "Please configure your SSH key as a GitHub secret:"
    echo "  1. Generate SSH key: ssh-keygen -t rsa -b 4096"
    echo "  2. Copy public key to VPS: ssh-copy-id $VPS_USER@$VPS_HOST"
    echo "  3. Set private key as secret:"
    echo "     gh secret set VPS_SSH_KEY -b\"\$(cat ~/.ssh/id_rsa)\" --repo $REPO_NAME"
    echo ""
    
    echo -e "${GREEN}Configuration complete!${NC}"
    echo "Run the CI/CD pipeline with:"
    echo "  git push origin main"
else
    echo -e "${YELLOW}Manual GitHub Secret Configuration Required${NC}"
    echo ""
    echo "1. Go to: https://github.com/$REPO_NAME/settings/secrets/actions"
    echo ""
    echo "2. Add these secrets:"
    echo ""
    echo "   DOCKERHUB_USERNAME"
    echo "   Value: $DOCKERHUB_USERNAME"
    echo ""
    echo "   DOCKERHUB_TOKEN"
    echo "   Value: [Your Docker Hub access token]"
    echo ""
    echo "   VPS_HOST"
    echo "   Value: $VPS_HOST"
    echo ""
    echo "   VPS_USER"
    echo "   Value: $VPS_USER"
    echo ""
    echo "   VPS_SSH_KEY"
    echo "   Value: [Your SSH private key - see SSH Key Setup below]"
    echo ""
    echo "   TARGET_URL"
    echo "   Value: $TARGET_URL"
    echo ""
    
    echo "=========================================="
    echo "  SSH Key Setup"
    echo "=========================================="
    echo ""
    echo "1. Generate SSH key (if you don't have one):"
    echo "   ssh-keygen -t rsa -b 4096 -f ~/.ssh/fabula_deploy"
    echo ""
    echo "2. Copy public key to VPS:"
    echo "   ssh-copy-id -i ~/.ssh/fabula_deploy.pub $VPS_USER@$VPS_HOST"
    echo ""
    echo "3. Set private key as GitHub secret:"
    echo "   cat ~/.ssh/fabula_deploy | gh secret set VPS_SSH_KEY --repo $REPO_NAME"
    echo ""
    echo -e "${GREEN}Setup complete!${NC}"
fi

echo ""
echo "=========================================="
echo "  Testing Your Setup"
echo "=========================================="
echo ""
echo "1. Make a small change to your code"
echo "2. Push to main: git push origin main"
echo "3. Check: https://github.com/$REPO_NAME/actions"
echo ""
echo "=========================================="