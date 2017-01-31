'use strict';

const http = require('http');
const aguid = require('aguid');
const expect = require('chai').expect;
const deviceEndpoint = require('../lib/deviceEndpoints');

describe('lib/deviceEndpoints.js', function() {

  const REQUEST_ANSWER = 'unit-test';

  beforeEach(function() {
    return deviceEndpoint.stopServer();
  });

  function waitUntilRestRequestSucceed(devicename, port, done) {
    const devicepath = aguid(devicename);
    const options = {
      host: 'localhost',
      port: port,
      path: '/'+devicepath+'/setup.xml',
      method: 'GET'
    };
    http.request(options, function(res) {
      expect(res.statusCode).to.equal(200);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        expect(chunk).to.equal(REQUEST_ANSWER);
        done();
      });
    }).end();
  }

  function getDeviceSetupFunction() {
    return REQUEST_ANSWER;
  }

  it('should start virtual device endpoint', function(done) {
    const state = {
      ipAddress: '127.0.0.1',
      devices: [
        {
          port: 11000,
          name: 'test',
          handler: () => {}
        }
      ]
    };

    deviceEndpoint.startVirtualDeviceEndpoints(state, getDeviceSetupFunction)
      .then(() => {
        waitUntilRestRequestSucceed('test', 11000, done);
      });
  });

  it('should restart virtual device endpoint', function(done) {
    const state1 = {
      ipAddress: '127.0.0.1',
      devices: [
        {
          port: 11000,
          name: 'test',
          handler: () => {}
        }
      ]
    };
    const state2 = {
      ipAddress: '127.0.0.1',
      devices: [
        {
          port: 11000,
          name: 'test1',
          handler: () => {}
        },
        {
          port: 11001,
          name: 'test2',
          handler: () => {}
        }
      ]
    };

    deviceEndpoint.startVirtualDeviceEndpoints(state1, getDeviceSetupFunction)
      .then(() => {
        return deviceEndpoint.startVirtualDeviceEndpoints(state2, getDeviceSetupFunction);
      }).then(() => {
      waitUntilRestRequestSucceed('test2', 11001, done);
    });

  });

});
