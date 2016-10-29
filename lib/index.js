'use strict';

const SSDPServer = require('./ssdp-server');

let ssdpServer = new SSDPServer(
  {
    ipAddress: '192.168.1.230', // This is the IP address of the fake wemo hub we are running, so this device.
    devices: ['office', 'office two', 'office three', 'office four']
  });

console.log('started..');