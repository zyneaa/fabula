import sys
from colorama import Fore, Style, init
init(autoreset=True)

from modules.recon.dns import DNSRecon
from modules.recon.ssl import SSLScan
from modules.recon.whois import WhoisScan
from modules.network.port import PortScan
from modules.web.headers import HeaderCheck
from modules.web.dir_bruteforce import DirBruteforce
from modules.web.sqli import SQLiTest
from modules.web.xss import XSSTest
from modules.web.csrf import CSRFCheck
from modules.web.path_traversal import PathTraversal
from modules.secrets.hardcoded import SecretScanner
from modules.infrastructure.docker import DockerCheck
from modules.infrastructure.docker_compose import DockerComposeCheck
from modules.infrastructure.cloud import CloudCheck

class ScanEngine:
    def __init__(self, target_url, config):
        self.target_url = target_url
        self.config = config
        self.results = {
            "target": target_url,
            "findings": [],
            "summary": {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        }
        self.modules = [
            DNSRecon(target_url, config),
            SSLScan(target_url, config),
            WhoisScan(target_url, config),
            PortScan(target_url, config),
            HeaderCheck(target_url, config),
            DirBruteforce(target_url, config),
            SQLiTest(target_url, config),
            XSSTest(target_url, config),
            CSRFCheck(target_url, config),
            PathTraversal(target_url, config),
            SecretScanner(target_url, config),
            DockerCheck(target_url, config),
            DockerComposeCheck(target_url, config),  # NEW: Check for exposed docker-compose.yml with credentials
            CloudCheck(target_url, config),
        ]

    def run(self):
        print(f"{Fore.CYAN}[*] Starting scan for {self.target_url}")
        for module in self.modules:
            print(f"{Fore.YELLOW}[*] Running: {module.name}")
            try:
                findings = module.scan()
                self.results["findings"].extend(findings)
                for f in findings:
                    sev = f.get("severity", "info")
                    if sev in self.results["summary"]:
                        self.results["summary"][sev] += 1
            except Exception as e:
                print(f"{Fore.RED}[!] Module {module.name} failed: {e}")
        return self.results
