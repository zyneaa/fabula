from core.base import ScannerModule
from core.utils import get_ip_from_url

class DockerCheck(ScannerModule):
    name = "docker_check"

    def scan(self):
        ip = self.config.get('vps_ip') or get_ip_from_url(self.target_url)
        if not ip:
            return self.findings
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            if sock.connect_ex((ip, 2375)) == 0:
                self.add_finding("high", "Docker daemon exposed on port 2375", "Docker API is accessible without TLS.", "Enable TLS and authentication, restrict access. This is a HIGH severity issue and should be fixed before production.")
            elif sock.connect_ex((ip, 2376)) == 0:
                self.add_finding("info", "Docker daemon with TLS on port 2376", "Docker API is accessible with TLS - good security practice.")
            sock.close()
        except:
            pass
        return self.findings
