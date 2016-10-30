'use strict';

const os     = require('os'),
      ifaces = os.networkInterfaces();

class IpHelper {
  static getIpAddresses() {
    let ipAddress;

    Object.keys(ifaces).forEach(function (ifname) {
      ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
          return;
        }

        if (!ipAddress) {
          ipAddress = iface.address;
        }
      });
    });

    return ipAddress;
  }
}

module.exports = IpHelper;