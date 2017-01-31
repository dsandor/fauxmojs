'use strict';

const _ = require('lodash');
const dgram = require('dgram');
const async = require('async');
const debug = require('debug')('discoveryService');
const Boom = require('boom');
const q = require('q');

let udpServer;

function getDiscoveryResponses(state) {
  let responses = [];
  _.forOwn(state.devices, (v, k) => {
    let responseString = `HTTP/1.1 200 OK
CACHE-CONTROL: max-age=86400
DATE: 2016-10-29
EXT:
LOCATION: http://${state.ipAddress}:${v.port}/${k}/setup.xml
OPT: "http://schemas.upnp.org/upnp/1/0/"; ns=01
01-NLS: ${state.bootId}
SERVER: Unspecified, UPnP/1.0, Unspecified
ST: urn:Belkin:device:**
USN: uuid:Socket-1_0-${k}::urn:Belkin:device:**\r\n\r\n`;

    debug('>> sending response string: ', responseString);
    responses.push(Buffer.from(responseString));
  });
  return responses;
}


module.exports.getDeviceSetup = function(state, deviceId) {
  state.bootId++;
  let response = `<?xml version="1.0"?><root>`;

  if (!deviceId) {
    debug('rendering all device setup info..');

    _.forOwn(state.devices, (v, k) => {
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

    if (!state.devices[deviceId]) {
      debug('WARNING: Device config requested for a device that is no longer valid:', deviceId);
      return Boom.badRequest();
    }

    response += `<device>
            <deviceType>urn:Fauxmo:device:controllee:1</deviceType>
            <friendlyName>${state.devices[deviceId].name}</friendlyName>
            <manufacturer>Belkin International Inc.</manufacturer>
            <modelName>Emulated Socket</modelName>
            <modelNumber>3.1415</modelNumber>
            <UDN>uuid:Socket-1_0-${deviceId}</UDN>
         </device>`;
  }
  response += '</root>';

  return response;
};

function stopDiscoveryServer() {
  if (!udpServer) {
    debug('not running');
    return q();
  }

  const deferred = q.defer();
  debug('try to stop udpServer');
  try {
    udpServer.close(() => {
      debug('udp server stopped');
      deferred.resolve();
    });
  } catch(err) {
    debug('failed to close udp server: %s', err.message);
    //ignore this error
    deferred.resolve();
  }
  return deferred.promise;
}

module.exports.startDiscoveryServer = function(state) {
  const deferred = q.defer();
  stopDiscoveryServer()
    .then(() => {
      udpServer = dgram.createSocket('udp4');

      udpServer.on('error', (err) => {
        debug(`server error:\n${err.stack}`);
        throw err;
      });

      udpServer.on('message', (msg, rinfo) => {
        debug(`<< server got: ${msg} from ${rinfo.address}:${rinfo.port}`);

        if (msg.indexOf('ssdp:discover') > 0) {
          async.eachSeries(getDiscoveryResponses(state), (response, cb) => {
            debug('sending device response.', { address: rinfo.address });
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
        try {
          const address = udpServer.address();
          debug(`server listening ${address.address}:${address.port}`);
          udpServer.addMembership('239.255.255.250');
          deferred.resolve();
        } catch (err) {
          debug('udp server error: %s', err.message);
          deferred.reject(err);
        }
      });

      debug('binding to port 1900 for ssdp discovery');
      try {
        udpServer.bind(1900);
      } catch (err) {
        debug('error binding udp server: %s', err.message);
        deferred.reject(err);
      }
    });

  return deferred.promise;
};

module.exports.stopDiscoveryServer = stopDiscoveryServer;
