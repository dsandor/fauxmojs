'use strict';

const expect = require('chai').expect,
      FauxMo = require('../lib');

describe('fauxmo', () => {

  it('should create and instance of the FauMo class, using parameter', () => {
    const options = {
      ipAddress: '127.0.0.1',
      devices: [
        {
          port: 11000,
          name: 'test',
          handler: () => {}
        }
      ]
    };
    const fauxmo = new FauxMo(options);
    expect(fauxmo).to.be.defined;
  });

  it('should create and instance of the FauMo class, not using parameter', () => {
    const options = {
      ipAddress: '127.0.0.1'
    };
    const fauxmo = new FauxMo(options);
    expect(fauxmo).to.be.defined;
  });

  it('updateDevices should ignore invalid parameter', () => {
    const options = {
      ipAddress: '127.0.0.1'
    };
    const fauxmo = new FauxMo(options);
    fauxmo.updateDevices();
  });

  it('updateDevices should update devices', () => {
    const options = {
      ipAddress: '127.0.0.1'
    };
    const fauxmo = new FauxMo(options);
    const devicesCountPreUpdate = fauxmo.getNumberOfRegisteredDevices();
    fauxmo.updateDevices([
      {
        port: 11004,
        name: 'test%20123',
        handler: () => {}
      }
    ]).then(() => {
      const devicesCountPostUpdate = fauxmo.getNumberOfRegisteredDevices();
      expect(devicesCountPreUpdate).to.equal(0);
      expect(devicesCountPostUpdate).to.equal(1);
    });
  });

});
