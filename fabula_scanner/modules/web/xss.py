from core.base import ScannerModule
from core.utils import safe_join, make_request

class XSSTest(ScannerModule):
    name = "xss_test"

    def scan(self):
        # Only test if the URL accepts query parameters
        if '?' not in self.target_url:
            self.add_finding("info", "No query parameters", "Target URL has no query parameters to test for XSS.")
            return self.findings
            
        payloads = ["<script>alert('XSS')</script>", '"><script>alert(1)</script>', '<img src=x onerror=alert(1)>']
        for p in payloads:
            url = safe_join(self.target_url, f"?q={p}")
            resp = make_request(url)
            if resp and p in resp.text:
                self.add_finding("high", "Reflected XSS detected", f"Payload '{p}' echoed back in response.", "Escape/encode all user input before rendering. Use Content Security Policy (CSP) headers.")
                break
        return self.findings
