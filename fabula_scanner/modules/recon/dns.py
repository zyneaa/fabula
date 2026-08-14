import dns.resolver
from core.base import ScannerModule
from core.utils import get_domain

class DNSRecon(ScannerModule):
    name = "dns_recon"

    def scan(self):
        domain = get_domain(self.target_url)
        record_types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA']
        for rec in record_types:
            try:
                answers = dns.resolver.resolve(domain, rec)
                for rdata in answers:
                    self.add_finding("info", f"DNS {rec} record", str(rdata))
            except:
                pass
        return self.findings
