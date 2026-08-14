import subprocess
import shutil
from core.base import ScannerModule
from core.utils import get_domain

class WhoisScan(ScannerModule):
    name = "whois_scan"

    def scan(self):
        # Check if whois command exists
        if shutil.which('whois') is None:
            self.add_finding("info", "WHOIS skipped", "whois command not installed on this system.")
            return self.findings

        domain = get_domain(self.target_url)
        try:
            out = subprocess.check_output(["whois", domain], stderr=subprocess.DEVNULL, timeout=5)
            self.add_finding("info", "WHOIS info", out[:500].decode() + "...")
        except subprocess.TimeoutExpired:
            self.add_finding("info", "WHOIS timed out", "WHOIS lookup timed out after 5 seconds.")
        except subprocess.CalledProcessError as e:
            self.add_finding("info", "WHOIS error", f"WHOIS command failed with code {e.returncode}.")
        except Exception as e:
            self.add_finding("info", "WHOIS error", str(e))
        return self.findings
