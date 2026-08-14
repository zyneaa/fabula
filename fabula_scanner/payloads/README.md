# Payloads Directory

This directory contains wordlists and payloads used by the security scanner.

## Available Payloads

### directories.txt
Common directory paths for directory brute force scanning.

**Includes:**
- Admin panels (/admin, /wp-admin, etc.)
- Backup files (/backup.sql, etc.)
- Sensitive files (/.env, /.git/config, etc.)
- Docker files (docker-compose.yml, etc.)
- Cloud metadata paths (.aws, .azure, etc.)

**Usage:**
```yaml
# config/default.yaml
dir_wordlist: payloads/directories.txt
```

## Custom Wordlists

To use a custom wordlist:

1. Place your wordlist in this directory
2. Update `config/default.yaml`:
```yaml
dir_wordlist: payloads/your-wordlist.txt
```

Or use the CLI:
```bash
python fabula.py --target https://example.com --wordlist payloads/custom.txt
```

## Popular Wordlists

For more comprehensive scanning, consider downloading:
- **SecLists**: https://github.com/danielmiessler/SecLists
- **ffuf wordlists**: https://github.com/ffuf/ffuf/tree/master/data

Example with SecLists:
```bash
# Download SecLists
git clone https://github.com/danielmiessler/SecLists.git

# Update config
dir_wordlist: /path/to/SecLists/Discovery/Web-Content/common.txt
```