'use strict';

const FauxMo = require('../lib');

let fauxMo = new FauxMo(
  {
    devices: [
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
    ]
  });

console.log('started..');