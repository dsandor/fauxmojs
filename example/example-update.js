'use strict';

const FauxMo = require('../lib');

const devices = [
    {
      name: 'office light',
      port: 11000,
      handler: (action) => {
        console.log('office light action:', action);
      }
    },
    {
      name: 'office fan',
      port: 11001,
      handler: (action) => {
        console.log('office fan action:', action);
      }
    }
  ];

let fauxMo = new FauxMo();
console.log('started..');

fauxMo.updateDevices(devices);
console.log('updated..');

setInterval(() => {
  console.log('jo');
}, 1000);
