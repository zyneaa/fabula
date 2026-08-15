import hashlib
import re
import socket
from urllib.parse import urlparse

import requests

requests.packages.urllib3.disable_warnings(
    requests.packages.urllib3.exceptions.InsecureRequestWarning
)


def resolve_ip(domain):
    try:
        return socket.gethostbyname(domain)
    except OSError:
        return None


def get_ip_from_url(url):
    domain = re.sub(r"^https?://", "", url).split("/")[0]
    return resolve_ip(domain)


def get_domain(url):
    return urlparse(url).netloc or urlparse(url).path.split("/")[0]


def get_base_url(url):
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


def make_request(url, timeout=5, headers=None, allow_redirects=True):
    try:
        return requests.get(
            url,
            timeout=timeout,
            headers=headers or {},
            verify=False,
            allow_redirects=allow_redirects,
        )
    except requests.RequestException:
        return None


def post_request(url, data=None, timeout=5, headers=None):
    try:
        return requests.post(
            url,
            data=data,
            timeout=timeout,
            headers=headers or {},
            verify=False,
        )
    except requests.RequestException:
        return None


def safe_join(base, path):
    base = base.rstrip("/")
    if path.startswith("/"):
        path = path.lstrip("/")
    return f"{base}/{path}"


def get_status_code(url):
    response = make_request(url)
    return response.status_code if response else None


def is_up(url):
    return make_request(url) is not None


def response_signature(response):
    """Return a stable signature for comparing fallback responses."""
    if response is None:
        return None
    body = response.content or b""
    return (
        response.status_code,
        response.headers.get("Content-Type", "").split(";", 1)[0].lower(),
        len(body),
        hashlib.sha256(body).hexdigest(),
    )


def looks_like_spa_fallback(response, root_response=None):
    """Detect a React/Vite-style index.html returned for an unknown path."""
    if response is None or response.status_code != 200:
        return False

    if root_response is not None:
        if response_signature(response) == response_signature(root_response):
            return True

    content_type = response.headers.get("Content-Type", "").lower()
    body = (response.text or "").lstrip().lower()
    is_html = "text/html" in content_type or body.startswith("<!doctype html") or body.startswith("<html")
    if not is_html:
        return False

    return bool(
        re.search(r"<div[^>]+id=[\"'](?:root|app)[\"']", body)
        or "vite" in body
        or "react" in body
    )
