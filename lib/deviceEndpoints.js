'use strict';

const _ = require('lodash');
const Boom = require('boom');
const debug = require('debug')('deviceEndpoints');
const Hapi = require('hapi');
const q = require('q');
const xmlResponse = require('./xml-response');

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
      let lastKnownDeviceStates = new Map();

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

          if (request.payload.indexOf('</u:GetBinaryState>') > 0) {
            let state = lastKnownDeviceStates.get(device.id) || 0;
            if (_.isFunction(device.getStateHandler)) {
              let newState = device.getStateHandler({ name: device.name, 
                port: device.port, id: device.id });
              //handler can return undefined to force usage of the cached state
              if (newState !== undefined) {
                //accept a string ('on', 'off') or integer (0, 1) as result
                state = newState === 1 || newState === 'on' ? 1 : 0;
              }
            }

            debug('?? State requested for device:', device.name, '- state:', state);
            return reply(xmlResponse({ getOrSet: 'get', state }));
          }

          const isSetAction = request.payload.indexOf('</u:SetBinaryState>') > 0;
          if (!isSetAction) {
            debug('SetBinaryState Query ignored');
            return reply({ok: true});
          }

          if (request.payload.indexOf('<BinaryState>1</BinaryState>') > 0) {
            action = 'on';
            lastKnownDeviceStates.set(device.id, 1);
          } else if (request.payload.indexOf('<BinaryState>0</BinaryState>') > 0) {
            action = 'off';
            lastKnownDeviceStates.set(device.id, 0);
          }

          debug('!! Action received for device:\n', device, '\naction:\n', action);

          if (device.handler) {
            device.handler(action, device.name);
          } else {
            debug('Warning, device has no handler:', device);
          }

          reply(xmlResponse({ getOrSet: 'set', state }))
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
