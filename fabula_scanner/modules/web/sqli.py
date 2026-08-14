from core.base import ScannerModule
from core.utils import make_request, safe_join

class SQLiTest(ScannerModule):
    name = "sqli_test"

    def scan(self):
        # Only run if the URL appears to have query parameters
        if '?' not in self.target_url:
            # No query parameters found, skip SQLi test
            self.add_finding("info", "No query parameters", "Target URL has no query parameters to test for SQL injection.")
            return self.findings
        
        test_payloads = ["' OR '1'='1", "' AND SLEEP(5)--", "1' AND 1=1--"]
        for payload in test_payloads:
            url = safe_join(self.target_url, f"?id={payload}")
            try:
                import requests
                import time
                start = time.time()
                r = requests.get(url, timeout=10, verify=False)
                elapsed = time.time() - start
                if elapsed > 4:
                    self.add_finding("critical", "Potential SQL Injection (time-based)", f"Payload: {payload} caused {elapsed:.1f}s delay.", "Use parameterized queries (prepared statements) for all database interactions.")
                    break
                if "error" in r.text.lower() or "mysql" in r.text.lower() or "sql syntax" in r.text.lower():
                    self.add_finding("critical", "Potential SQL Injection (error-based)", f"Payload: {payload} caused error in response.", "Use parameterized queries (prepared statements) for all database interactions.")
                    break
            except:
                pass
        return self.findings
