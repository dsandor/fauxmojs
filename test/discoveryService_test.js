'use strict';

const expect = require('chai').expect;
const discoveryService = require('../lib/discoveryService');
const q = require('q');

describe('lib/discoveryService.js', function() {

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
