import requests
from concurrent.futures import ThreadPoolExecutor

from core.base import ScannerModule
from core.utils import safe_join


class DirBruteforce(ScannerModule):
    name = "dir_bruteforce"

    SENSITIVE_PATHS = {
        "/.env",
        "/.env.local",
        "/.env.production",
        "/.env.docker",
        "/.git/config",
        "/.git/HEAD",
        "/credentials.txt",
        "/config.php",
        "/wp-config.php",
        "/backup.sql",
    }

    SENSITIVE_MARKERS = (
        "db_name",
        "db_user",
        "db_password",
        "define('db_",
        'define("db_',
        "aws_access_key_id",
        "aws_secret_access_key",
        "-----begin private key-----",
    )

    def scan(self):
        wordlist = self.config.get("dir_wordlist", "payloads/directories.txt")
        try:
            with open(wordlist, encoding="utf-8") as handle:
                paths = [
                    line.strip()
                    for line in handle
                    if line.strip() and not line.strip().startswith("#")
                ]
        except OSError:
            paths = [
                "/admin",
                "/backup",
                "/.env",
                "/credentials.txt",
                "/wp-admin",
                "/phpmyadmin",
                "/config.php",
                "/robots.txt",
                "/.git/config",
            ]

        findings = []

        def check(path):
            url = safe_join(self.target_url, path)
            try:
                response = requests.get(
                    url,
                    timeout=3,
                    verify=False,
                    allow_redirects=False,
                )
                # A 403/401 means the server blocked the request. It must not
                # be reported as an exposed sensitive file.
                if response.status_code in {200, 401, 403}:
                    findings.append(
                        (path, response.status_code, response.text.lower())
                    )
            except requests.RequestException:
                pass

        with ThreadPoolExecutor(max_workers=20) as executor:
            list(executor.map(check, paths))

        for path, status_code, body in findings:
            if path in self.SENSITIVE_PATHS:
                if status_code in {401, 403}:
                    self.add_finding(
                        "info",
                        f"Sensitive path blocked: {path}",
                        f"The path returned HTTP {status_code}; no content was exposed.",
                        "No immediate action is required. Keep the path blocked.",
                    )
                elif 200 <= status_code < 300:
                    confirmed = any(marker in body for marker in self.SENSITIVE_MARKERS)
                    if confirmed:
                        self.add_finding(
                            "high",
                            f"EXPOSED SENSITIVE PATH: {path}",
                            f"The path returned HTTP {status_code} and contained sensitive-content markers.",
                            "Remove or restrict access to the exposed file immediately.",
                        )
                    else:
                        self.add_finding(
                            "info",
                            f"Sensitive path returned no confirmed secret: {path}",
                            f"The path returned HTTP {status_code}, but no sensitive-content markers were found.",
                            "Review the response manually if this path is unexpected.",
                        )
                continue

            if path.startswith("/."):
                self.add_finding(
                    "medium",
                    f"Hidden path discovered: {path}",
                    f"Status code {status_code}. Hidden paths may expose internal information.",
                    "Review whether this path should be accessible.",
                )
            elif path in {"/admin", "/admin.php", "/administrator", "/wp-admin"}:
                self.add_finding(
                    "medium",
                    f"Admin interface discovered: {path}",
                    f"Status code {status_code}. Admin paths should be protected.",
                    "Implement strong authentication and IP restrictions on admin paths.",
                )
            else:
                self.add_finding(
                    "info",
                    f"Path discovered: {path}",
                    f"Status code {status_code}.",
                    "Review whether this path is expected and necessary.",
                )

        return self.findings
