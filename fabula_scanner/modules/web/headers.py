from core.base import ScannerModule
from core.utils import make_request

class HeaderCheck(ScannerModule):
    name = "header_check"

    def scan(self):
        resp = make_request(self.target_url)
        if not resp:
            self.add_finding("info", "No response", "Could not fetch target.")
            return self.findings
        headers = resp.headers
        # Only report missing headers as INFO - they should be fixed but not block deployment
        # Real vulnerabilities (injection, exposed APIs, etc.) should block deployment
        required = {
            "Strict-Transport-Security": ("info", "HSTS missing", "Add HSTS header for HTTPS security."),
            "X-Content-Type-Options": ("info", "X-Content-Type-Options missing", "Add nosniff to prevent MIME-type sniffing."),
            "X-Frame-Options": ("info", "X-Frame-Options missing", "Add DENY or SAMEORIGIN to prevent clickjacking."),
            "Content-Security-Policy": ("info", "CSP missing", "Implement CSP to prevent XSS attacks."),
            "Referrer-Policy": ("info", "Referrer-Policy missing", "Add strict-origin-when-cross-origin for privacy.")
        }
        for h, (sev, msg, rem) in required.items():
            if h not in headers:
                self.add_finding(sev, msg, f"Header '{h}' is not set. {rem}")
        return self.findings
