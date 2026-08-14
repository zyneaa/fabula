import os
import re
from core.base import ScannerModule

class SecretScanner(ScannerModule):
    name = "secret_scanner"

    def scan(self):
        # Only scan specific sensitive files and directories
        # Skip common directories that may contain false positives
        sensitive_files = ['.env', '.env.local', '.env.production', '.env.docker', 
                          'config.json', 'credentials.json', 'secrets.json']
        sensitive_patterns = [
            (r'(?i)jwt[_ ]?secret\s*=\s*["\']([^"\']+)', "JWT Secret"),
            (r'(?i)api[_ ]?key[_ ]?=\s*["\']([^"\']+)', "API Key"),
            (r'(?i)password[_ ]?=\s*["\']([^"\']+)', "Password"),
            (r'(?i)token[_ ]?=\s*["\']([^"\']+)', "Token"),
        ]
        
        found = []
        
        # Scan only specific files in the project root and app directory
        scan_dirs = ['.']
        
        for root in scan_dirs:
            for file in os.listdir(root) if os.path.isdir(root) else []:
                filepath = os.path.join(root, file)
                if os.path.isfile(filepath) and any(sens in file for sens in sensitive_files):
                    try:
                        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            for pattern, name in sensitive_patterns:
                                if re.search(pattern, content):
                                    severity = "critical" if '.env' in file else "high"
                                    found.append((name, filepath, severity))
                    except:
                        pass
        
        # Add findings with proper severity
        for name, filepath, severity in found:
            self.add_finding(
                severity, 
                f"Hardcoded {name} found in {filepath}", 
                f"File: {filepath}. {name} should be stored in environment variables, not in files.",
                "Move secrets to environment variables and use a secrets manager for production."
            )
        
        return self.findings
