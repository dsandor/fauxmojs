'use strict';

const debug       = require('debug')('ssdp-server'),
      aguid       = require('aguid'),
      discoveryService = require('./discoveryService'),
      deviceEndpoints = require('./deviceEndpoints'),
      IpHelper    = require('./ip-helper'),
      q           = require('q');

class FauxMo {
  constructor(options = {}) {
    this.bootId = 1;
    this.ipAddress = options.ipAddress || IpHelper.getIpAddresses();
    this.devices = {};

    debug('using ip address:', this.ipAddress);
    if (!options.devices) {
      debug('no devices configured');
    }

    this.updateDevices(options.devices);
  }

  stopServer(stopTimeoutMs) {
    return q.all([
      discoveryService.stopDiscoveryServer(),
      deviceEndpoints.stopServer(stopTimeoutMs)
    ]);
  }

  getNumberOfRegisteredDevices() {
    return Object.keys(this.devices).length;
  }

  static deviceBuilder(devices) {
    const result = {};
    devices.reduce((prev, device) => {
      //TODO device.name must be uniqe!
      let deviceId = aguid(device.name);
      prev[deviceId] = Object.assign(device, {id: deviceId});
      return prev;
    }, result);
    return result;
  }

  updateDevices(devices) {
    if (!Array.isArray(devices) || devices.length === 0) {
      debug('empty devices array');
      return;
    }
    this.devices = FauxMo.deviceBuilder(devices);
    const state = { devices: this.devices, ipAddress: this.ipAddress, bootId: this.bootId };
    return q.all([
      discoveryService.startDiscoveryServer(state),
      deviceEndpoints.startVirtualDeviceEndpoints(state, discoveryService.getDeviceSetup)
    ]);
  }

}

module.exports = FauxMo;
