import socket
import ssl
import datetime
from urllib.parse import urlparse
from core.base import ScannerModule
from core.utils import get_domain

class SSLScan(ScannerModule):
    name = "ssl_scan"

    def scan(self):
        # Only run if target uses HTTPS
        parsed = urlparse(self.target_url)
        if parsed.scheme.lower() != 'https':
            # Add an info finding that we skipped SSL
            self.add_finding("info", "SSL scan skipped", "Target does not use HTTPS.")
            return self.findings

        domain = get_domain(self.target_url)
        try:
            ctx = ssl.create_default_context()
            with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
                s.connect((domain, 443))
                cert = s.getpeercert()
                if cert:
                    expiry = datetime.datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    days_left = (expiry - datetime.datetime.now()).days
                    if days_left < 30:
                        self.add_finding("high", "SSL certificate expires soon", f"Expires in {days_left} days", "Renew certificate immediately.")
                    else:
                        self.add_finding("info", "SSL certificate valid", f"Expires in {days_left} days")
        except Exception as e:
            self.add_finding("info", "SSL scan failed", str(e))
        return self.findings
