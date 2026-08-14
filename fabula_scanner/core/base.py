from abc import ABC, abstractmethod

class ScannerModule(ABC):
    name = "base_module"

    def __init__(self, target_url, config=None):
        self.target_url = target_url
        self.config = config or {}
        self.findings = []

    @abstractmethod
    def scan(self):
        pass

    def add_finding(self, severity, title, description, remediation=""):
        finding = {
            "severity": severity,
            "title": title,
            "description": description,
            "remediation": remediation
        }
        self.findings.append(finding)
        # Print live feedback (optional)
        print(f"[{severity.upper()}] {title} - {description[:60]}...")
        return finding
