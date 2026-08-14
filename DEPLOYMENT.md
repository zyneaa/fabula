# Fabula Deployment Guide

This guide covers deploying Fabula to your VPS using Docker and Docker Compose.

## Prerequisites

### VPS Requirements

- Ubuntu 22.04 LTS or later
- Docker Engine 24.0+ installed
- Docker Compose 2.20+ installed
- At least 2GB RAM (4GB recommended)
- 20GB free disk space

### Software to Install

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installations
docker --version
docker compose version
```

### Security Setup

```bash
# Enable UFW firewall
sudo ufw enable
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Install Fail2Ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure Fail2Ban for Docker
# Edit /etc/fail2ban/jail.local
```

---

## Deployment Steps

### 1. Clone the Repository

```bash
# SSH to your VPS
ssh whitewolf@139.180.146.168

# Clone the repository
git clone https://github.com/your-username/fabula.git
cd fabula
```

### 2. Configure Environment Variables

```bash
# Copy the production environment template
cp .env.docker .env

# Edit with your production values
nano .env
```

Required variables in `.env`:

```bash
# Database
POSTGRES_PASSWORD=your-secure-password-here

# JWT Authentication
JWT_SECRET=generate-a-long-random-string-here-at-least-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# LLM Integration
OPENROUTER_API_KEY=sk-or-your-openrouter-key

# Application Settings
DEFAULT_LLM_MODEL=google/gemma-4-26b-a4b-it
MAX_UPLOAD_SIZE_MB=50

# CORS - Replace with your domain
CORS_ORIGINS=["https://fabula.example.com","https://www.fabula.example.com"]
```

### 3. Build and Start

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 4. Create Admin User

```bash
# Create the first admin user
docker compose exec backend python scripts/seed_admin.py

# Or with custom credentials
docker compose exec backend \
  env ADMIN_EMAIL=admin@example.com \
  ADMIN_PASSWORD=Admin123 \
  ADMIN_NAME="Admin" \
  python scripts/seed_admin.py
```

### 5. Access the Application

- Frontend: `https://fabula.example.com`
- Backend API: `https://fabula.example.com/api`
- API Docs: `https://fabula.example.com/docs`

---

## Production Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_PASSWORD` | Yes | - | PostgreSQL database password |
| `JWT_SECRET` | Yes | - | Secret key for JWT tokens (32+ chars) |
| `OPENROUTER_API_KEY` | Yes | - | API key for LLM services |
| `CORS_ORIGINS` | Yes | `["http://localhost:3000"]` | Comma-separated list of allowed origins |

### Docker Compose Overrides

Create `docker-compose.override.yml` for custom configurations:

```yaml
version: '3.8'

services:
  backend:
    environment:
      - LOG_LEVEL=debug
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## VPS Security Hardening

### 1. SSH Hardening

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Recommended settings:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2

# Restart SSH
sudo systemctl restart ssh
```

### 2. Docker Security

```bash
# Create a non-root user for Docker
sudo useradd -m dockeruser
sudo usermod -aG docker dockeruser

# Configure Docker daemon
sudo nano /etc/docker/daemon.json

{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "no-new-privileges": true
}

sudo systemctl restart docker
```

### 3. Backup Strategy

```bash
# Create backup script
cat > /opt/backup.sh << 'EOF'
#!/bin/bash
docker compose exec db pg_dump -U fabula fabula > /backups/$(date +%Y%m%d).sql
gzip /backups/$(date +%Y%m%d).sql
find /backups -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/backup.sh

# Add to crontab for daily backups
echo "0 2 * * * /opt/backup.sh" | sudo crontab -
```

---

## Updating the Application

### Automated (via CI/CD)

When you push to the `main` branch, the GitHub Actions workflow will:
1. Build and test the application
2. Run security scans
3. Build and push Docker images
4. Deploy to the VPS

### Manual Update

```bash
# Pull latest code
git pull origin main

# Update Docker images
docker compose pull

# Start updated containers
docker compose up -d

# Run migrations if needed
docker compose exec backend alembic upgrade head
```

---

## Monitoring

### Health Check

```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db

# Test health endpoint
curl http://localhost:8000/health
```

### Resource Monitoring

```bash
# View resource usage
docker stats

# Check disk usage
df -h

# Check Docker disk usage
docker system df
```

### Log Rotation

```bash
# Check log sizes
ls -lh /var/lib/docker/containers/*/*-json.log

# Configure log rotation in daemon.json (see Docker Security section)
```

---

## Troubleshooting

### Containers Not Starting

```bash
# Check logs
docker compose logs

# Check disk space
df -h

# Check Docker status
sudo systemctl status docker
```

### Database Connection Issues

```bash
# Verify database is running
docker compose ps db

# Check database logs
docker compose logs db

# Rebuild database connection
docker compose down
docker compose up -d db
sleep 10
docker compose up -d
```

### Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Re-login
exit
ssh whitewolf@139.180.146.168
```

---

## Scaling

### Horizontal Scaling

For multiple instances:

```yaml
# In docker-compose.yml
deploy:
  replicas: 3
```

### Load Balancer

Use Nginx as a load balancer:

```nginx
upstream fabula_backend {
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}

server {
    location /api/ {
        proxy_pass http://fabula_backend;
    }
}
```

---

## Security Checklist

- [ ] HTTPS configured with valid SSL certificate
- [ ] Database password is strong and unique
- [ ] JWT_SECRET is a long random string
- [ ] CORS_ORIGINS is restricted to your domains
- [ ] UFW firewall is enabled
- [ ] Fail2Ban is installed and configured
- [ ] Docker daemon is hardened
- [ ] SSH uses key-based authentication
- [ ] Regular backups are configured
- [ ] Security scanning is running weekly
- [ ] Docker Hub credentials are stored securely in GitHub
- [ ] Production environment variables are not in git

---

## CI/CD Integration

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `VPS_HOST` | VPS IP address |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | SSH private key |
| `TARGET_URL` | Production URL |

### Setup CI/CD

1. Go to GitHub repository Settings > Secrets
2. Add all required secrets
3. Push to `main` branch to trigger deployment

---

## Support

For issues:
1. Check the logs: `docker compose logs`
2. Review the CI/CD workflow logs on GitHub
3. Check the Fabula Security Scanner reports
4. Review this documentation and README.md