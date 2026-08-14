# Fabula Deployment Checklist

Use this checklist to ensure a complete and secure deployment.

## Pre-Deployment

### VPS Preparation
- [ ] VPS running Ubuntu 22.04 LTS or later at **139.180.146.168**
- [ ] User **whitewolf** created with sudo privileges
- [ ] Docker Engine installed and running
- [ ] Docker Compose installed
- [ ] User whitewolf added to docker group: `sudo usermod -aG docker whitewolf`
- [ ] SSH key authentication configured for whitewolf

### Network Configuration
- [ ] Domain name pointing to VPS IP
- [ ] DNS records configured (A, AAAA, CNAME)
- [ ] Port 80 (HTTP) open
- [ ] Port 443 (HTTPS) open
- [ ] Port 22 (SSH) restricted to trusted IPs

### Security Setup
- [ ] UFW firewall enabled
- [ ] SSH only allows key-based authentication
- [ ] Fail2Ban installed and running
- [ ] Regular backups configured
- [ ] SSL certificate obtained (Let's Encrypt recommended)

## Environment Configuration

### Required Variables
- [ ] `POSTGRES_PASSWORD` - Strong, unique password
- [ ] `JWT_SECRET` - 32+ character random string
- [ ] `OPENROUTER_API_KEY` - Valid OpenRouter API key
- [ ] `CORS_ORIGINS` - Production domains only

### Optional Variables
- [ ] `DEFAULT_LLM_MODEL` - Specific model if needed
- [ ] `UPLOAD_DIR` - Custom upload directory
- [ ] `MAX_UPLOAD_SIZE_MB` - File size limit

## Docker Configuration

### Container Setup
- [ ] `docker-compose.production.yml` created
- [ ] `uploads` directory exists and is writable
- [ ] Database volume permissions correct
- [ ] SSL certificates mounted if needed

### Network Configuration
- [ ] Container network properly configured
- [ ] Database accessible only from backend
- [ ] Frontend accessible from nginx proxy

## Deployment

### Initial Deployment
- [ ] Clone repository to VPS
- [ ] Copy `.env.production.example` to `.env`
- [ ] Fill in all required environment variables
- [ ] Run `docker compose up -d`
- [ ] Verify all containers are running: `docker compose ps`

### Post-Deployment
- [ ] Create admin user: `docker compose exec backend python scripts/seed_admin.py`
- [ ] Verify health endpoint: `curl http://localhost:8000/health`
- [ ] Test frontend is accessible
- [ ] Test login with admin credentials
- [ ] Test upload functionality
- [ ] Test chat functionality

## SSL/TLS Configuration

### Certificate Setup
- [ ] SSL certificate installed
- [ ] Private key installed
- [ ] Certificate chain configured
- [ ] HTTP to HTTPS redirect working
- [ ] SSL Labs test passes (grade A or better)

### Security Headers
- [ ] HSTS header configured
- [ ] CSP header configured
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set

## CI/CD Setup

### GitHub Secrets
- [ ] `DOCKERHUB_USERNAME` configured
- [ ] `DOCKERHUB_TOKEN` configured
- [ ] `VPS_HOST` configured
- [ ] `VPS_USER` configured
- [ ] `VPS_SSH_KEY` configured (private key)
- [ ] `TARGET_URL` configured
- [ ] `POSTGRES_PASSWORD` (if used in deployment)
- [ ] `JWT_SECRET` (if used in deployment)

### Workflow Configuration
- [ ] CI/CD pipeline runs on push to main
- [ ] Security scan configured
- [ ] Deployment webhook configured

## Security Verification

### Automated Checks
- [ ] GitHub Actions workflows passing
- [ ] Security scans running weekly
- [ ] No HIGH/CRITICAL vulnerabilities
- [ ] Dependencies up to date

### Manual Security Review
- [ ] No hardcoded secrets in code
- [ ] Environment variables not committed
- [ ] Database credentials secured
- [ ] API keys rotated if compromised

## Monitoring Setup

### Health Monitoring
- [ ] Health endpoint responding
- [ ] Container status monitoring
- [ ] Log aggregation configured
- [ ] Alerting configured

### Performance Monitoring
- [ ] Memory usage monitored
- [ ] CPU usage monitored
- [ ] Disk space monitored
- [ ] Network traffic monitored

## Documentation

### Deployed Documentation
- [ ] Deployment guide created
- [ ] Environment variables documented
- [ ] CI/CD pipeline documented
- [ ] Security scanner documented

### Runbooks
- [ ] Rollback procedure documented
- [ ] Disaster recovery documented
- [ ] Security incident response documented

## Final Verification

### Functionality Tests
- [ ] User registration works
- [ ] Login/logout works
- [ ] Material upload works
- [ ] AI chat works
- [ ] Quiz generation works
- [ ] Note generation works
- [ ] Exam paper generation works
- [ ] University info works

### Security Tests
- [ ] HTTPS enforced
- [ ] SQL injection prevented
- [ ] XSS protected
- [ ] CSRF tokens present
- [ ] Rate limiting working
- [ ] Authentication enforced

### Performance Tests
- [ ] Load time acceptable (< 3s)
- [ ] API response time acceptable (< 1s)
- [ ] Database queries optimized
- [ ] Caching working

## Post-Deployment

### First Week
- [ ] Monitor logs daily
- [ ] Check security scan results
- [ ] Verify backups working
- [ ] Test failover procedures

### Ongoing
- [ ] Weekly security scans
- [ ] Monthly dependency updates
- [ ] Quarterly security review
- [ ] Annual disaster recovery test

## Emergency Contacts

- [ ] VPS provider support contact
- [ ] Domain registrar contact
- [ ] SSL certificate provider contact
- [ ] Development team contact

---

**Deployment Date:** ___________________

**Deployed By:** ___________________

**Status:** ✅ Complete / ⚠️ In Progress / ❌ Not Started