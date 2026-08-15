import re

from core.base import ScannerModule
from core.utils import looks_like_spa_fallback, make_request, safe_join


class DockerComposeCheck(ScannerModule):
    name = "docker_compose_exposed_check"

    PATHS = (
        "/docker-compose.yml",
        "/docker-compose.yaml",
        "/compose.yml",
        "/compose.yaml",
        "/.docker-compose.yml",
        "/.docker-compose.yaml",
        "/docker/compose.yml",
        "/docker/compose.yaml",
        "/config/docker-compose.yml",
        "/config/docker-compose.yaml",
    )

    CREDENTIAL_PATTERNS = (
        (r"POSTGRES_PASSWORD\s*[:=]\s*[\"']?([^\"'\s]+)", "PostgreSQL Password"),
        (r"MYSQL_ROOT_PASSWORD\s*[:=]\s*[\"']?([^\"'\s]+)", "MySQL Root Password"),
        (r"MONGO_INITDB_ROOT_PASSWORD\s*[:=]\s*[\"']?([^\"'\s]+)", "MongoDB Root Password"),
        (r"REDIS_PASSWORD\s*[:=]\s*[\"']?([^\"'\s]+)", "Redis Password"),
        (r"DB_PASSWORD\s*[:=]\s*[\"']?([^\"'\s]+)", "Database Password"),
        (r"JWT_SECRET\s*[:=]\s*[\"']?([^\"'\s]+)", "JWT Secret"),
        (r"AWS_ACCESS_KEY_ID\s*[:=]", "AWS Access Key"),
        (r"AWS_SECRET_ACCESS_KEY\s*[:=]", "AWS Secret Key"),
    )

    @staticmethod
    def _looks_like_compose(content):
        text = content.lower()
        markers = (
            "services:",
            "postgres:",
            "dockerfile:",
            "depends_on:",
            "networks:",
        )
        return sum(marker in text for marker in markers) >= 2

    @staticmethod
    def _is_placeholder(value):
        normalized = value.strip().strip("\"'").lower()
        return (
            normalized.startswith("${")
            or normalized in {"", "null", "none", "changeme", "your-secret-here"}
            or normalized.startswith("your-")
        )

    def scan(self):
        root_response = make_request(self.target_url, allow_redirects=False)

        for path in self.PATHS:
            response = make_request(
                safe_join(self.target_url, path),
                allow_redirects=False,
            )
            if response is None or response.status_code in {401, 403, 404}:
                continue
            if response.status_code != 200:
                continue

            content = response.text or ""
            if looks_like_spa_fallback(response, root_response):
                continue
            if not self._looks_like_compose(content):
                continue

            found_credentials = []
            for pattern, credential_type in self.CREDENTIAL_PATTERNS:
                for match in re.finditer(pattern, content, re.IGNORECASE):
                    value = match.group(1) if match.lastindex else "present"
                    if not self._is_placeholder(value):
                        found_credentials.append(credential_type)
                        break

            if found_credentials:
                self.add_finding(
                    "critical",
                    f"EXPOSED DOCKER COMPOSE WITH CREDENTIALS: {path}",
                    f"Found {len(found_credentials)} credential type(s) in an accessible Compose file.",
                    "Remove the file from public access immediately and rotate every exposed credential.",
                )
            else:
                self.add_finding(
                    "high",
                    f"EXPOSED DOCKER COMPOSE FILE: {path}",
                    "A real Docker Compose document is publicly accessible.",
                    "Restrict access to Compose files and keep secrets outside web-accessible directories.",
                )

        return self.findings
