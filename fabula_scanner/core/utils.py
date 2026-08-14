import socket
import re
import requests
from urllib.parse import urlparse

requests.packages.urllib3.disable_warnings(requests.packages.urllib3.exceptions.InsecureRequestWarning)

def resolve_ip(domain):
    try:
        return socket.gethostbyname(domain)
    except:
        return None

def get_ip_from_url(url):
    domain = re.sub(r'^https?://', '', url).split('/')[0]
    return resolve_ip(domain)

def get_domain(url):
    return urlparse(url).netloc or urlparse(url).path.split('/')[0]

def get_base_url(url):
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"

def make_request(url, timeout=5, headers=None, allow_redirects=True):
    try:
        return requests.get(url, timeout=timeout, headers=headers or {},
                            verify=False, allow_redirects=allow_redirects)
    except:
        return None

def post_request(url, data=None, timeout=5, headers=None):
    try:
        return requests.post(url, data=data, timeout=timeout, headers=headers or {},
                             verify=False)
    except:
        return None

def safe_join(base, path):
    base = base.rstrip('/')
    if path.startswith('/'):
        path = path.lstrip('/')
    return f"{base}/{path}"

def get_status_code(url):
    resp = make_request(url)
    return resp.status_code if resp else None

def is_up(url):
    resp = make_request(url)
    return resp is not None
