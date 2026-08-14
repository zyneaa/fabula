import re
from core.base import ScannerModule
from core.utils import safe_join, make_request

class DockerComposeCheck(ScannerModule):
    name = "docker_compose_exposed_check"

    def scan(self):
        """
        Check for exposed docker-compose.yml files that may contain credentials
        """
        # Common paths where docker-compose.yml might be exposed
        paths = [
            '/docker-compose.yml',
            '/docker-compose.yaml',
            '/compose.yml',
            '/compose.yaml',
            '/.docker-compose.yml',
            '/.docker-compose.yaml',
            '/docker/compose.yml',
            '/docker/compose.yaml',
            '/config/docker-compose.yml',
            '/config/docker-compose.yaml',
        ]
        
        credential_patterns = [
            (r'POSTGRES_PASSWORD\s*=\s*["\']?([^"\'\s]+)', 'PostgreSQL Password'),
            (r'MYSQL_ROOT_PASSWORD\s*=\s*["\']?([^"\'\s]+)', 'MySQL Root Password'),
            (r'MONGO_INITDB_ROOT_PASSWORD\s*=\s*["\']?([^"\'\s]+)', 'MongoDB Root Password'),
            (r'REDIS_PASSWORD\s*=\s*["\']?([^"\'\s]+)', 'Redis Password'),
            (r'DB_PASSWORD\s*=\s*["\']?([^"\'\s]+)', 'Database Password'),
            (r'PASSWORD\s*=\s*["\']?([^"\'\s]+)', 'Generic Password'),
            (r'API_KEY\s*=\s*["\']?([^"\'\s]+)', 'API Key'),
            (r'SECRET_KEY\s*=\s*["\']?([^"\'\s]+)', 'Secret Key'),
            (r'JWT_SECRET\s*=\s*["\']?([^"\'\s]+)', 'JWT Secret'),
            (r'AWS_ACCESS_KEY_ID', 'AWS Access Key'),
            (r'AWS_SECRET_ACCESS_KEY', 'AWS Secret Key'),
        ]
        
        for path in paths:
            url = safe_join(self.target_url, path)
            try:
                resp = make_request(url)
                if resp and resp.status_code == 200:
                    content = resp.text
                    found_credentials = []
                    
                    for pattern, cred_type in credential_patterns:
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        if matches:
                            found_credentials.append((cred_type, matches[0][:10] + '...'))  # Show partial match
                    
                    if found_credentials:
                        self.add_finding(
                            "critical",
                            f"EXPOSED DOCKER-COMPOSE.YML with credentials: {path}",
                            f"Found {len(found_credentials)} credentials in {path}. Credentials exposed to the public!",
                            "Remove the file from public access immediately and move all credentials to environment variables or a secrets manager."
                        )
                    else:
                        # File exists but no obvious credentials - still report as info
                        self.add_finding(
                            "high",
                            f"EXPOSED DOCKER-COMPOSE.YML: {path}",
                            f"docker-compose.yml is publicly accessible. May contain sensitive configuration.",
                            "Restrict access to docker-compose.yml files - use .gitignore and ensure they are not in web-accessible directories."
                        )
                        
            except:
                pass
        
        return self.findings