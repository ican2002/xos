import json
from xosapi.orm import ORMWrapper, register_convenience_wrapper

class ORMWrapperVRouterTenant(ORMWrapper):
    @property
    def gateway_ip(self):
        if not self.address_pool:
            return None
        return self.address_pool.gateway_ip

    @property
    def gateway_mac(self):
        if not self.address_pool:
            return None
        return self.address_pool.gateway_mac

    @property
    def cidr(self):
        if not self.address_pool:
            return None
        return self.address_pool.cidr

    @property
    def netbits(self):
        # return number of bits in the network portion of the cidr
        if self.cidr:
            parts = self.cidr.split("/")
            if len(parts) == 2:
                return int(parts[1].strip())
        return None


register_convenience_wrapper("VRouterTenant", ORMWrapperVRouterTenant)
