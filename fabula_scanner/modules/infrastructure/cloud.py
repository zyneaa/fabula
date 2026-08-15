from core.base import ScannerModule

class CloudCheck(ScannerModule):
    name = "cloud_check"

    def scan(self):
        # Simple check for open S3 bucket or cloud metadata
        # For demo, just check for AWS metadata endpoint
        try:
            import requests
            r = requests.get("http://169.254.169.254/latest/meta-data/", timeout=2)
            if r.status_code == 200:
                self.add_finding("high", "AWS metadata accessible from target", "Instance metadata is exposed.", "Restrict access to metadata service with iptables.")
        except:
            pass
        return self.findings
