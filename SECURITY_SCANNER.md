# Fabula Security Scanner Configuration

## Overview

The Fabula Security Scanner is a comprehensive security testing framework that scans your application for vulnerabilities across multiple categories:

### Scanner Categories

| Category | Modules | Vulnerabilities Covered |
|----------|---------|----------------------|
| **Network** | Port Scanner | Open ports, services |
| **Web** | Headers, Dir Bruteforce, SQLi, XSS, CSRF, Path Traversal | Security headers, directory traversal, injection |
| **Recon** | DNS, SSL/TLS, WHOIS | Certificate expiry, DNS records |
| **Secrets** | Hardcoded Credentials | API keys, passwords in code |
| **Infrastructure** | Docker, Cloud | Docker API exposure, cloud metadata |

## Configuration

### Default Configuration

Location: `fabula_scanner/config/default.yaml`

```yaml
timeout: 5
dir_wordlist: /usr/share/seclists/Discovery/Web-Content/common.txt
nmap_args: -sS -sV -T4 -p 21,22,25,80,443,3306,5432,6379
nmap_timeout: 20
os_detection: false
nse_scripts: false

# Telegram Alerts
telegram:
  bot_token: "your-bot-token"
  chat_id: "your-chat-id"
  enabled: true
  alert_threshold: HIGH
  include_critical: true
  include_high: true
  include_medium: false
  include_low: false
  include_info: false
```

### Environment Variables

The scanner also reads from environment variables:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for alerts |
| `TARGET_URL` | Target URL to scan |

## Usage

### Command Line

```bash
# Basic scan
python fabula.py --target https://example.com

# Scan with custom config
python fabula.py --target https://example.com --config config/custom.yaml

# Scan with specific output format
python fabula.py --target https://example.com --format json
python fabula.py --target https://example.com --format html
python fabula.py --target https://example.com --format both

# Disable Telegram alerts
python fabula.py --target https://example.com --no-telegram

# Interactive mode
python fabula.py
```

### CI/CD Integration

The scanner is integrated into the GitHub Actions pipeline:

```yaml
- name: Run Fabula Security Scanner
  id: security_scan
  run: |
    cd fabula_scanner
    python fabula.py --target "$TARGET_URL" --output reports/ci-scan --format json
```

The scanner exits with code 1 if HIGH or CRITICAL vulnerabilities are found, blocking the deployment.

## Output Formats

### JSON Report

Location: `fabula_scanner/reports/report.json`

```json
{
  "target": "https://example.com",
  "timestamp": "2024-01-15T10:30:00",
  "summary": {
    "critical": 1,
    "high": 2,
    "medium": 3,
    "low": 5,
    "info": 10
  },
  "findings": [
    {
      "severity": "critical",
      "title": "SQL Injection",
      "description": "Potential SQL injection vulnerability",
      "remediation": "Use parameterized queries"
    }
  ]
}
```

### HTML Report

Location: `fabula_scanner/reports/report.html`

A Bootstrap-based dashboard with:
- Severity distribution summary cards
- Doughnut chart showing severity breakdown
- Detailed findings table
- Dark mode toggle
- Print/PDF export

## Adding Custom Scans

Create a new module in `fabula_scanner/modules/`:

```python
from core.base import ScannerModule

class CustomScan(ScannerModule):
    name = "custom_scan"
    
    def scan(self):
        # Your scan logic here
        # Add findings with:
        self.add_finding(
            severity="high",  # critical, high, medium, low, info
            title="Vulnerability Title",
            description="Description of the issue",
            remediation="How to fix it"
        )
        return self.findings
```

Update `fabula_scanner/core/engine.py` to include your module:

```python
from modules.custom.custom_scan import CustomScan

class ScanEngine:
    def __init__(self, target_url, config):
        # ... existing code ...
        self.modules = [
            # ... existing modules ...
            CustomScan(target_url, config),
        ]
```

## Severity Levels

| Level | Color | CI/CD Impact |
|-------|-------|-------------|
| CRITICAL | Red | Blocks deployment |
| HIGH | Orange | Blocks deployment |
| MEDIUM | Blue | Allowed |
| LOW | Grey | Allowed |
| INFO | Blue | Allowed |

## Telegram Integration

The scanner can send alerts to Telegram for immediate notification:

### Setup

1. Create a Telegram bot via @BotFather
2. Get your bot token
3. Get your chat ID from @userinfobot
4. Add to config or environment variables

### Alert Message

For HIGH/CRITICAL findings:

```
🔴 FABULA SECURITY SCANNER - ALERT

Target: https://example.com
Time: 2024-01-15 10:30:00

▸ CRITICAL: 1
▸ HIGH: 2
▸ MEDIUM: 3
▸ LOW: 5
▸ Total: 11
```

### Security Note

Never commit bot tokens to git. Use environment variables or GitHub secrets.

## Troubleshooting

### Common Issues

1. **Module not found**
   - Check the module is imported in `engine.py`
   - Verify the module file exists in the correct directory

2. **Telegram alerts not working**
   - Verify bot token and chat ID are correct
   - Check network connectivity to Telegram API
   - Ensure the bot is not blocked

3. **Port scan timeouts**
   - Increase `nmap_timeout` in config
   - Check firewall rules
   - Verify target is accessible

4. **HTML report generation fails**
   - Check Python has write permissions to reports directory
   - Verify all required Python packages are installed

## Best Practices

1. **Run scans in CI/CD**: Always run before deployment
2. **Weekly scans**: Schedule weekly scans for ongoing security
3. **Review findings**: Address HIGH/CRITICAL immediately
4. **False positives**: Review and mark false positives in code
5. **Update payloads**: Keep vulnerability payloads up to date

## Security Coverage

The scanner covers OWASP Top 10 vulnerabilities:

- [ ] A01:2021 - Broken Access Control
- [ ] A02:2021 - Cryptographic Failures
- [ ] A03:2021 - Injection
- [ ] A04:2021 - Insecure Design
- [ ] A05:2021 - Security Misconfiguration
- [ ] A06:2021 - Vulnerable Components
- [ ] A07:2021 - Identification Failures
- [ ] A08:2021 - Software and Data Integrity Failures
- [ ] A09:2021 - Security Logging Failures
- [ ] A10:2021 - Server-Side Request Forgery