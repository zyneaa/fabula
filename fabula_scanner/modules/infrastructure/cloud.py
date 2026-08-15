from core.base import ScannerModule


class CloudCheck(ScannerModule):
    name = "cloud_check"

    def scan(self):
        provider = str(self.config.get("cloud_provider", "unknown")).lower()
        metadata_enabled = bool(self.config.get("cloud_metadata_check", False))

        # AWS instance metadata is not applicable to Vultr. Do not probe the
        # AWS link-local endpoint unless the deployment explicitly enables it.
        if provider != "aws" or not metadata_enabled:
            self.add_finding(
                "info",
                "Cloud metadata check skipped",
                f"Cloud provider is configured as '{provider}', so the AWS metadata check was not run.",
                "Enable this check only for an AWS deployment that requires it.",
            )
            return self.findings

        try:
            import requests

            response = requests.get(
                "http://169.254.169.254/latest/meta-data/",
                timeout=2,
            )
            if response.status_code == 200:
                self.add_finding(
                    "high",
                    "AWS metadata accessible from target",
                    "AWS instance metadata responded successfully.",
                    "Restrict access to the AWS metadata service.",
                )
        except requests.RequestException:
            pass

        return self.findings
