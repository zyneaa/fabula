import requests
from concurrent.futures import ThreadPoolExecutor
from core.base import ScannerModule
from core.utils import safe_join

class DirBruteforce(ScannerModule):
    name = "dir_bruteforce"

    def scan(self):
        wordlist = self.config.get('dir_wordlist', 'payloads/directories.txt')
        try:
            with open(wordlist) as f:
                paths = [line.strip() for line in f if line.strip() and not line.strip().startswith('#')]
        except:
            paths = ['/admin','/backup','/.env','/credentials.txt','/wp-admin','/phpmyadmin','/config.php','/robots.txt','/.git/config']
        found = []
        def check(path):
            url = safe_join(self.target_url, path)
            try:
                r = requests.get(url, timeout=3, verify=False)
                if r.status_code == 200:
                    found.append((path, r.status_code))
                elif r.status_code in (403, 401):
                    found.append((path, r.status_code))
            except:
                pass
        with ThreadPoolExecutor(max_workers=20) as ex:
            ex.map(check, paths)
        for path, code in found:
            # Only flag truly sensitive paths as high/critical
            sensitive_paths = ['/.env','/.env.local','/.env.production','/.env.docker','/.git/config','/.git/HEAD','/credentials.txt','/config.php','/wp-config.php','/backup.sql']
            
            if path in sensitive_paths:
                sev = "high"
                self.add_finding(sev, f"DISCOVERED SENSITIVE PATH: {path}", f"Status code {code}. This path exposes sensitive configuration or data.", "Remove or restrict access to sensitive files immediately!")
            elif path.startswith('/.'):
                sev = "medium"
                self.add_finding(sev, f"Hidden path discovered: {path}", f"Status code {code}. Hidden paths may expose internal information.", "Review if this path should be accessible.")
            elif path in ['/admin','/admin.php','/administrator','/wp-admin']:
                sev = "medium"
                self.add_finding(sev, f"Admin interface discovered: {path}", f"Status code {code}. Admin paths should be protected.", "Implement strong authentication and IP restrictions on admin paths.")
            else:
                sev = "info"
                self.add_finding(sev, f"Path discovered: {path}", f"Status code {code}.", "Review if this path is expected and necessary.")
        return self.findings
