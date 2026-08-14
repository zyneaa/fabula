# Fabula CI/CD Pipeline

This directory contains the GitHub Actions workflows for automated building, testing, security scanning, and deployment.

## Workflows

### 1. `ci-cd.yml` - Main CI/CD Pipeline

The primary workflow that runs on every push to `main` or `master` branch.

#### Stages:

1. **Build and Test**
   - Runs Python tests with pytest
   - Lints code with Ruff
   - Builds and tests Docker container locally
   - Ensures the health endpoint responds correctly

2. **Security Scan**
   - Runs the Fabula Security Scanner against the target URL
   - Only CRITICAL vulnerabilities block deployment (HIGH/MEDIUM are informational)
   - Generates JSON and HTML reports for review
   - Uploads scan reports as artifacts

3. **Build and Push Docker Images**
   - Pushes images to Docker Hub (fabula/fabula)
   - Also pushes to GitHub Container Registry (ghcr.io)
   - Tags images with both `latest` and git commit SHA

4. **Deploy to VPS**
   - SSHs into the configured VPS
   - Pulls latest code from repository
   - Stops current containers gracefully
   - Pulls and starts new Docker images
   - Runs database migrations
   - Performs health check on new deployment

#### Required Secrets:

Configure these in GitHub Settings > Secrets and variables > Actions:

| Secret | Description | Example |
|--------|-------------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub username | `fabula` |
| `DOCKERHUB_TOKEN` | Docker Hub access token | `ghp_xxx` |
| `VPS_HOST` | VPS IP address or hostname | `123.456.78.90` |
| `VPS_USER` | SSH username on VPS | `ubuntu` |
| `VPS_SSH_KEY` | SSH private key for VPS access | `-----BEGIN RSA PRIVATE KEY-----...` |
| `TARGET_URL` | URL to scan and deploy to | `https://fabula.example.com` |
| `POSTGRES_PASSWORD` | Database password for production | `super-secret-password` |
| `JWT_SECRET` | Secret for JWT token generation | `change-me-in-production` |

#### Optional Secrets:

| Secret | Description |
|--------|-------------|
| `OPENROUTER_API_KEY` | API key for LLM services |

---

### 2. `security-scan.yml` - Weekly Security Scans

Runs automatically every Sunday at midnight to perform security scans.

#### Features:

- Scheduled security scanning
- Manual trigger option
- Severity classification (Critical/High/Clean)
- Weekly report generation

#### Required Secrets:

| Secret | Description |
|--------|-------------|
| `TARGET_URL` | URL to scan weekly |

---

### 3. `docker-image-cleanup.yml` - Monthly Cleanup

Runs monthly to clean up old Docker images.

---

## Running Workflows Manually

1. Go to your GitHub repository
2. Click on the **Actions** tab
3. Select the workflow from the sidebar
4. Click **Run workflow** and choose the branch

---

## Checking Workflow Status

1. Go to the **Actions** tab
2. Click on a specific workflow run
3. View the logs for each job
4. Download artifacts (scan reports) if needed

---

## Troubleshooting

### Deployment Fails

1. Check SSH key permissions: `chmod 600 ~/.ssh/deploy_key`
2. Verify VPS is accessible: `ssh user@host`
3. Check Docker Hub credentials are correct
4. Review the detailed logs for specific errors

### Security Scan Blocks Deployment

1. Review the scan report artifact
2. Fix the HIGH/CRITICAL vulnerabilities
3. Commit and push fixes
4. Re-run the workflow

### Docker Push Fails

1. Verify Docker Hub credentials in GitHub secrets
2. Check repository name format
3. Ensure you have push permissions

---

## Deployment Process

When a new commit is pushed to `main`:

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Build     │────>│  Test &      │────>│  Security    │────>│   Deploy     │
│   Docker    │     │  Lint        │     │   Scan       │     │    to VPS    │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Zero-Downtime Strategy

1. Docker Compose pulls the new images
2. Starts the new containers
3. Runs health checks
4. Switches traffic only after successful health check

---

## Monitoring

### Health Check Endpoint

The backend exposes `/health` endpoint that returns:

```json
{
  "status": "ok"
}
```

### Logging

View deployment logs on the VPS:

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Security Reports

Download scan reports from GitHub Actions artifacts:
- JSON format for automation parsing
- HTML format for human review with charts

---

## Best Practices

1. **Never commit secrets** - Always use GitHub secrets
2. **Run security scans regularly** - Keep weekly scheduled scans
3. **Review scan reports** - Address findings promptly
4. **Monitor deployment logs** - Catch issues early
5. **Use semantic versioning** - Tag releases for rollbacks

---

## Rollback Procedure

If a deployment fails:

```bash
# SSH to VPS
ssh ubuntu@your-vps-ip

# Go to fabula directory
cd ~/fabula

# Stop current deployment
docker compose down

# Re-deploy previous version
docker compose pull
docker compose up -d
```

---

## Integration with Fabula Security Scanner

The pipeline integrates with your custom security scanner:

```yaml
- name: Run Fabula Security Scanner
  run: |
    cd fabula_scanner
    python fabula.py --target "$TARGET_URL" --output reports/ci-scan --format json
```

The scanner:
- Scans for 13 vulnerability types across 5 categories
- Exits with code 1 if HIGH/CRITICAL findings exist
- Generates reports in JSON and HTML formats
- Sends Telegram alerts (configured in scanner config)

---

## Customization

### Change Scan Target

Modify the `TARGET_URL` secret or update the scanner command in `ci-cd.yml`:

```yaml
python fabula.py --target "http://localhost:8000" --format json
```

### Add Additional Tests

Add more test steps in the `build-and-test` job:

```yaml
- name: Run integration tests
  run: |
    pytest tests/integration/ -v
```

### Modify Deployment Strategy

Update the `deploy` job to use different strategies:

```yaml
# Blue-green deployment
# Canaries
# Progressive delivery
```