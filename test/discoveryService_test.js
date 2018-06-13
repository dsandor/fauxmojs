'use strict';

const expect = require('chai').expect;
const discoveryService = require('../lib/discoveryService');
const q = require('q');

describe('lib/discoveryService.js', function() {
  const deviceId = 123;
  const state = {
    devices: {
      123: {
        name: 'name of 123'
      }
    }
  };

  beforeEach(function() {
    return discoveryService.stopDiscoveryServer();
  });

  it('should start/stop discoveryService', function(done) {
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

    discoveryService.startDiscoveryServer(state)
      .then(() => {
        return discoveryService.stopDiscoveryServer();
      }).then(done)
      .catch((err) => {
        done(err);
      });
  });

  it('getDeviceSetup should use correct line endings, single device', function() {
    const result = discoveryService.getDeviceSetup(state, deviceId);
    const containsCorrectLineEnding1 = result.startsWith('<?xml version="1.0"?><root>\r\n<device>\r\n');
    const containsCorrectLineEnding2 = result.includes('<friendlyName>name of 123</friendlyName>\r\n');
    expect(containsCorrectLineEnding1).to.equal(true);
    expect(containsCorrectLineEnding2).to.equal(true);
  });

  it('getDeviceSetup should use correct line endings, all devices', function() {
    const result = discoveryService.getDeviceSetup(state);
    const containsCorrectLineEnding = result.startsWith('<?xml version="1.0"?><root>\r\n<device>\r\n');
    expect(containsCorrectLineEnding).to.equal(true);
  });

  it('multiple stop calls should be ignored', function(done) {
    q.all([discoveryService.stopDiscoveryServer(),discoveryService.stopDiscoveryServer(),discoveryService.stopDiscoveryServer()])
      .then(() => {
        discoveryService.startDiscoveryServer({});
      })
      .then(() => {
        return discoveryService.stopDiscoveryServer();
      }).then(done);
  });



});
