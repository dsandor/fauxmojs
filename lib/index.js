'use strict';

/*
    This module implements SSDP udp discovery services.
 */
const dgram       = require('dgram'),
      udpServer   = dgram.createSocket('udp4'),
      Hapi        = require('hapi'),
      hapiServer  = new Hapi.Server(),
      debug       = require('debug')('ssdp-server'),
      _           = require('lodash'),
      async       = require('async'),
      Boom        = require('boom'),
      aguid       = require('aguid'),
      IpHelper    = require('./ip-helper');

class FauxMo {
  constructor(options) {
    this.bootId = 1;
    this.ipAddress = options.ipAddress || IpHelper.getIpAddresses();

    debug('using ip address:', this.ipAddress);

    if (!options.devices) {
      throw new Error('At least one device must be configured.');
    }

    this.init(options.devices);
  }

  init(deviceOptions) {
    this.devices = {};

    deviceOptions.reduce((prev, device) => {
      let deviceId = aguid(device.name);

      prev[deviceId] = Object.assign(device, {id: deviceId});

      return prev;
    }, this.devices);

    this.startDiscoveryServer();
    this.startVirtualDeviceEndpoints();

    hapiServer.start((err) => {

      if (err) {
        throw err;
      }
      debug('Setup Server running.');
    });
  }

  startDiscoveryServer() {
    udpServer.on('error', (err) => {
      debug(`server error:\n${err.stack}`);
      udpServer.close();
    });

    udpServer.on('message', (msg, rinfo) => {
      debug(`<< server got: ${msg} from ${rinfo.address}:${rinfo.port}`);

      if (msg.indexOf('ssdp:discover') > 0) {
        async.eachSeries(this.getDiscoveryResponses(), (response, cb) => {
          debug('sending device response.');
          udpServer.send(response, rinfo.port, rinfo.address, () => {
            debug('>> sent response ssdp discovery response');
            cb();
          });
        }, (err) => {
          debug('complete sending all responses. ', err ? `Received error: ${err}` : 'Success');
        });
      }
    });

    udpServer.on('listening', () => {
      var address = udpServer.address();
      debug(`server listening ${address.address}:${address.port}`);
      udpServer.addMembership('239.255.255.250');
    });

    debug('binding to port 1900 for ssdp discovery');
    udpServer.bind(1900);
  }

  startVirtualDeviceEndpoints() {
    _.forOwn(this.devices, (device, id) => {
      hapiServer.connection({port: device.port, labels: [id]});
    });

    hapiServer.route({
      method: 'GET',
      path: '/{deviceId}/setup.xml',
      handler: (request, reply) => {
        if (!request.params.deviceId) {
          return Bang.badRequest();
        }

        debug('>> sending device setup response for device:', request.params.deviceId);
        reply(this.getDeviceSetup(request.params.deviceId));
      }
    });

    hapiServer.route({
      method: 'POST',
      path: '/upnp/control/basicevent1',
      handler: (request, reply) => {
        let portNumber = Number(request.raw.req.headers.host.split(':')[1]),
            device = _.find(this.devices, (d) => d.port === portNumber),
            action;

        if (!device) {
          return Bang.notFound();
        }

        if (!request.payload) {
          return Bang.badRequest();
        }

        if (request.payload.indexOf('<BinaryState>1</BinaryState>') > 0) {
          action = 'on';
        } else if (request.payload.indexOf('<BinaryState>0</BinaryState>') > 0) {
          action = 'off';
        }

        debug('!! Action received for device:\n', device, '\naction:\n', action);

        if (device.handler) {
          device.handler(action);
        } else {
          debug('Warning, device has no handler:', device);
        }

        reply({ok: true});
      }
    });
  }

  getDeviceSetup(deviceId) {
    this.bootId ++;

    let response = `<?xml version="1.0"?><root>`;

    if (!deviceId) {
      debug('rendering all device setup info..');

      _.forOwn(this.devices, (v, k) => {
        response += `<device>
              <deviceType>urn:Fauxmo:device:controllee:1</deviceType>
              <friendlyName>${v.name}</friendlyName>
              <manufacturer>Belkin International Inc.</manufacturer>
              <modelName>Emulated Socket</modelName>
              <modelNumber>3.1415</modelNumber>
              <UDN>uuid:Socket-1_0-${k}</UDN>
           </device>`;
      });
    } else {
      debug('rendering device setup for deviceId:', deviceId);

      if (!this.devices[deviceId]) {
        debug('WARNING: Device config requested for a device that is no longer valid:', deviceId);
        return Boom.badRequest();
      }

      response += `<device>
              <deviceType>urn:Fauxmo:device:controllee:1</deviceType>
              <friendlyName>${this.devices[deviceId].name}</friendlyName>
              <manufacturer>Belkin International Inc.</manufacturer>
              <modelName>Emulated Socket</modelName>
              <modelNumber>3.1415</modelNumber>
              <UDN>uuid:Socket-1_0-${deviceId}</UDN>
           </device>`;
    }
    response += '</root>';

    return response;
  }

  getDiscoveryResponses() {
    let responses = [];

    _.forOwn(this.devices, (v, k) => {
      let responseString = `HTTP/1.1 200 OK
CACHE-CONTROL: max-age=86400
DATE: 2016-10-29
EXT:
LOCATION: http://${this.ipAddress}:${v.port}/${k}/setup.xml
OPT: "http://schemas.upnp.org/upnp/1/0/"; ns=01
01-NLS: ${this.bootId}
SERVER: Unspecified, UPnP/1.0, Unspecified
ST: urn:Belkin:device:**
USN: uuid:Socket-1_0-${k}::urn:Belkin:device:**\r\n\r\n`;

      debug('>> sending response string: ', responseString);
      responses.push(Buffer.from(responseString));
    });
    return responses;
  }
}

module.exports = FauxMo;