import shutil
import subprocess

import tldextract

from core.base import ScannerModule
from core.utils import get_domain


class WhoisScan(ScannerModule):
    name = "whois_scan"

    def scan(self):
        # Check if whois command exists
        if shutil.which("whois") is None:
            self.add_finding(
                "info",
                "WHOIS skipped",
                "whois command not installed on this system.",
            )
            return self.findings

        hostname = get_domain(self.target_url)

        # Remove port if present
        hostname = hostname.split(":", 1)[0]

        # Extract the registrable domain.
        # Example:
        # blog.terabox.com -> terabox.com
        # www.example.com -> example.com
        # api.example.co.uk -> example.co.uk
        extracted = tldextract.extract(hostname)
        domain = extracted.top_domain_under_public_suffix

        if not domain:
            self.add_finding(
                "info",
                "WHOIS skipped",
                f"Could not determine registrable domain from {hostname}.",
            )
            return self.findings

        try:
            result = subprocess.run(
                ["whois", domain],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )

            if result.returncode != 0:
                error = result.stderr.strip() or "No error message returned."

                self.add_finding(
                    "info",
                    "WHOIS error",
                    f"WHOIS lookup failed for {domain} "
                    f"with code {result.returncode}: {error[:300]}",
                )
                return self.findings

            output = result.stdout.strip()

            self.add_finding(
                "info",
                "WHOIS info",
                output[:500] + "..." if output else "No WHOIS data returned.",
            )

        except subprocess.TimeoutExpired:
            self.add_finding(
                "info",
                "WHOIS timed out",
                "WHOIS lookup timed out after 5 seconds.",
            )

        except Exception as e:
            self.add_finding(
                "info",
                "WHOIS error",
                str(e),
            )

        return self.findings