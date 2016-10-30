'use strict';

const expect = require('chai').expect,
      FauxMo = require('../lib');

describe('fauxmo', () => {
  it('should create and instance of the FauMo class.', () => {
    let options = {
      ipAddress: '127.0.0.1',
      devices: [
        {
          port: 11000,
          name: 'test',
          handler: () => {}
        }
      ]
    };

    let fauxmo = new FauxMo(options);

    expect(fauxmo).to.be.defined;
  });

  it('should throw if no options are passed.', () => {
    let threw = false;

    try {
      let fauxmo = new FauxMo();
    } catch (err) {
      threw = true;
    }

    expect(threw).to.be.true;
  });
});