'use strict';

const _ = require('lodash');
const Boom = require('boom');
const debug = require('debug')('deviceEndpoints');
const Hapi = require('hapi');
const q = require('q');

let hapiServer;

function stopServer(stopTimeoutMs) {
  if (!hapiServer) {
    return q();
  }
  const deferred = q.defer();
  try {
    const timeoutMs = stopTimeoutMs || 500;
    hapiServer.stop({ timeout: timeoutMs }, () => {
      debug('stopped hapiServer server');
      hapiServer = null;
      deferred.resolve();
    });
  } catch(err) {
    deferred.reject(err);
    debug('failed to close hapiServer server');
  }
  return deferred.promise;
}

module.exports.startVirtualDeviceEndpoints = function(state, getDeviceSetupFunction) {
  return stopServer()
    .then(() => {
      hapiServer = new Hapi.Server();

      _.forOwn(state.devices, (device, id) => {
        hapiServer.connection({ port: device.port, labels: [id] });
      });

      hapiServer.route({
        method: 'GET',
        path: '/{deviceId}/setup.xml',
        handler: (request, reply) => {
          if (!request.params.deviceId) {
            return Boom.badRequest();
          }

          debug('>> sending device setup response for device:', request.params.deviceId);
          const deviceSetup = getDeviceSetupFunction(state, request.params.deviceId);
          reply(deviceSetup);
        }
      });

      hapiServer.route({
        method: 'POST',
        path: '/upnp/control/basicevent1',
        handler: (request, reply) => {
          //get device entry, each device use a unique
          let portNumber = Number(request.raw.req.headers.host.split(':')[1]),
              device = _.find(state.devices, (d) => d.port === portNumber),
              action;

          if (!device) {
            return Boom.notFound();
          }

          if (!request.payload) {
            return Boom.badRequest();
          }

          const isSetAction = request.payload.indexOf('</u:SetBinaryState>') > 0;
          if (!isSetAction) {
            debug('GetBinaryState Query');
            action = 'status';
          } else {
            debug('!! Action received for device:\n', device, '\naction:\n', action);
            if (request.payload.indexOf('<BinaryState>1</BinaryState>') > 0) {
              action = 'on';
            } else if (request.payload.indexOf('<BinaryState>0</BinaryState>') > 0) {
              action = 'off';
            }
          }


          if (device.handler) {
            device.handler(action, device.name, (status) => {
              status = status === true ? "1" : "0";
              return reply(`<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
                            <s:Body>
                            <u:GetBinaryStateResponse xmlns:u="urn:Belkin:service:basicevent:1">
                            <BinaryState>${status}</BinaryState>
                            </u:GetBinaryStateResponse>
                            </s:Body>
                            </s:Envelope>`);
            });
          } else {
            debug('Warning, device has no handler:', device);
          }
          reply({ok: true});
        }
      });

      hapiServer.start((err) => {
        if (err) {
          return q.reject(err);
        }
        debug('Setup Server running.');
        return q();
      });
    });
};

module.exports.stopServer = stopServer;
