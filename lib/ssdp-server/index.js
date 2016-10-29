'use strict';

/*
    This module implements SSDP udp discovery services.
 */
const dgram       = require('dgram'),
      udpServer   = dgram.createSocket('udp4'),
      Hapi        = require('hapi'),
      hapiServer  = new Hapi.Server(),
      debug       = require('debug')('ssdp-server'),
      uuid        = require('uuid'),
      _           = require('lodash'),
      async       = require('async'),
      Boom        = require('boom');

class SSDPServer {
  constructor(options) {
    this.bootId = 1;
    this.deviceNames = options.devices;
    this.setupServicePort = options.setupServicePort || 5555;
    this.ipAddress = options.ipAddress; // TODO: Discover an actual IP address for this device if none provided.

    this.init();
  }

  init() {
    this.devices = {};

    this.deviceNames.reduce((prev, deviceName) => {
      let deviceId = uuid.v4(); // TODO: Persist these uuids so that we do not duplicate devices on the alexa.

      prev[deviceId] = {id: deviceId, name: deviceName};
      return prev;
    }, this.devices);

    this.startDiscoveryServer();
    this.startSetupServer();
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

  startSetupServer() {
    hapiServer.connection({port: this.setupServicePort});

    hapiServer.route({
      method: 'GET',
      path: '/{deviceId}/setup.xml',
      handler: function (request, reply) {
        let deviceId = request.params.deviceId;
        debug('>> sending device setup response for device:', deviceId);
        reply(this.getDeviceSetup(deviceId) );
      }.bind(this)
    });

    hapiServer.start((err) => {

      if (err) {
        throw err;
      }
      debug('Setup Server running at: ' + hapiServer.info.uri);
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
LOCATION: http://${this.ipAddress}:${this.setupServicePort}/${k}/setup.xml
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

module.exports = SSDPServer;