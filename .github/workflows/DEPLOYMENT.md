# Deploying Fabula to VPS

## Prerequisites

### VPS Setup
- **VPS:** 139.180.146.168
- **User:** whitewolf (with sudo privileges)
- **SSH Access:** SSH key authentication enabled

### VPS Requirements
```bash
# SSH to VPS
ssh whitewolf@139.180.146.168

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker whitewolf

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Enable UFW firewall
sudo ufw enable
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Install Fail2Ban
sudo apt install fail2ban -y
```

---

## GitHub Secrets Configuration

Go to: **GitHub > Repository > Settings > Secrets and variables > Actions**

### Required Secrets

| Secret | Value | Description |
|--------|-------|-------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username | For pushing images |
| `DOCKERHUB_TOKEN` | Docker Hub access token | For authentication |
| `VPS_HOST` | `139.180.146.168` | Your VPS IP address |
| `VPS_USER` | `whitewolf` | SSH username on VPS |
| `VPS_SSH_KEY` | Your private SSH key | For SSH deployment |
| `TARGET_URL` | `https://fabula.example.com` | Production URL for scanning |

### SSH Key Setup

**On your local machine:**
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/fabula_deploy

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/fabula_deploy.pub whitewolf@139.180.146.168

# Copy private key content
cat ~/.ssh/fabula_deploy
```

**In GitHub Secrets:**
1. Go to Repository Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Name: `VPS_SSH_KEY`
4. Paste the private key content
5. Save

---

## Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# SSH to VPS
ssh whitewolf@139.180.146.168

# Clone repository
git clone https://github.com/your-username/fabula.git
cd fabula

# Configure environment
cp .env.production.example .env
# Edit .env with your values

# Start services
docker compose up -d

# Create admin user
docker compose exec backend python scripts/seed_admin.py
```

---

## CI/CD Deployment Flow

### How It Works

```
Code Push → GitHub Actions → Build → Scan → Deploy
```

### Triggering Deployment

```bash
# Push to main branch
git add .
git commit -m "Update application"
git push origin main
```

### Viewing Deployment

1. Go to **GitHub > Actions**
2. Click on the workflow run
3. Watch the deployment progress
4. Check logs for any issues

---

## Troubleshooting

### SSH Connection Failed

```bash
# Test SSH connection
ssh whitewolf@139.180.146.168

# Check SSH key permissions
chmod 600 ~/.ssh/deploy_key
```

### Docker Issues

```bash
# On VPS, check Docker status
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Check running containers
docker compose ps
```

### Deployment Failed

```bash
# SSH to VPS
ssh whitewolf@139.180.146.168

# Check logs
docker compose logs -f backend

# Check disk space
df -h

# Check Docker disk usage
docker system df
```

---

## Post-Deployment

### Verify Deployment

```bash
# SSH to VPS
ssh whitewolf@139.180.146.168

# Check services
docker compose ps

# Test health endpoint
curl http://localhost:8000/health

# View logs
docker compose logs -f
```

### Update Application

```bash
# On VPS, pull latest and restart
cd ~/fabula
git pull origin main
docker compose pull
docker compose up -d
docker compose exec backend alembic upgrade head
```

---

## Security Checklist

- [ ] SSH keys properly configured
- [ ] Firewall enabled (UFW)
- [ ] Fail2Ban installed
- [ ] Docker not exposed on public ports
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Regular backups configured

---

## Support

For issues:
1. Check GitHub Actions logs
2. Review VPS logs: `docker compose logs -f`
3. Check deployment documentation
4. Review CI/CD pipeline logs