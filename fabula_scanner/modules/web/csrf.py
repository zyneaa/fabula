from core.base import ScannerModule
from core.utils import make_request
import re

class CSRFCheck(ScannerModule):
    name = "csrf_check"

    def scan(self):
        resp = make_request(self.target_url)
        if not resp:
            self.add_finding("info", "No response", "Could not fetch target URL.")
            return self.findings
        
        # Check for anti-CSRF token in forms
        forms = re.findall(r'<form[^>]*>', resp.text)
        if forms:
            has_token = False
            for form in forms:
                if 'csrf' in form.lower() or '_token' in form.lower() or 'nonce' in form.lower():
                    has_token = True
                    break
            if not has_token:
                self.add_finding("info", "No CSRF tokens found in forms", f"Found {len(forms)} form(s) without CSRF tokens.", "Implement anti-CSRF tokens (Synchronizer Token Pattern) for all state-changing requests.")
        else:
            self.add_finding("info", "No forms found", "No HTML forms detected on the page.")
        return self.findings
