from core.base import ScannerModule
from core.utils import safe_join

class PathTraversal(ScannerModule):
    name = "path_traversal"

    def scan(self):
        # Only test if the URL accepts file parameters
        if '?file=' not in self.target_url and '?path=' not in self.target_url:
            self.add_finding("info", "No file parameter found", "Target URL doesn't have a file parameter to test for path traversal.")
            return self.findings
            
        payloads = ["../../../etc/passwd", "..\\..\\..\\windows\\win.ini", "%2e%2e%2f%2e%2e%2fetc/passwd"]
        for p in payloads:
            url = safe_join(self.target_url, f"?file={p}")
            try:
                import requests
                r = requests.get(url, timeout=5, verify=False)
                if "root:" in r.text or "[extensions]" in r.text:
                    self.add_finding("critical", "Path Traversal detected", f"Payload: {p} successfully accessed system file.", "Validate and sanitize user input, use allowlist for file paths, use absolute paths.")
                    break
            except:
                pass
        return self.findings
