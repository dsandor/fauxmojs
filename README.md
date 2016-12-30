[![Build Status](https://travis-ci.org/dsandor/fauxmojs.svg?branch=master)](https://travis-ci.org/dsandor/fauxmojs)
[![npm version](https://badge.fury.io/js/fauxmojs.svg)](https://badge.fury.io/js/fauxmojs)

# fauxmojs
Fake WeMo device ported to NodeJS.  Allows Alexa to make api calls.

Based on the work of [makermusings](https://github.com/makermusings/fauxmo) and [n8henrie](https://github.com/n8henrie/fauxmo) but written from scratch for NodeJS.


## What does it do?
This service will setup the required UDP listener and HTTP listeners that support the SSDP that Amazon Echo (Alexa) uses in order to discover Belkin WeMo smart switches.

With this module you can hook up your own NodeJS code to run in response to an Alexa command such as:  "Alexa, turn office light on".  In this statement `office light` is the device name and `on` is the action.

## Install

`npm install fauxmojs`

## How do I use it?

Usage is simple.  The heavy lifting is handled by this library so that all you need to do is create a new FauxMo class and pass in some options.

Below is a fully working example of two virtual devices.  To use the first device through Alexa simply run the example and say **"Alexa, turn office light on"**.

```
'use strict';

const FauxMo = require('fauxmojs');

let fauxMo = new FauxMo(
  {
    ipAddress: '192.168.1.230',
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
```
#### OPTIONS

`ipAddress` - this is the ip address of the computer running FauxMo.

`devices` - an array of device definitions (see below).

The device object needs the following properties:

`name` - the name of the device, this is the name you will use when asking Alexa to control the device.  E.g. if your name is `office light` you will say 'Alexa, turn **office light** on'.

`port` - each fake device needs to have a unique port.  The amazon echo does not send back the device id in the action requests so the device is determined by the port number.  FauxMo listens for actions on each device port.

`handler` - a function that will be called when the echo is attempting to perform the action.  This function takes an 'action' parameter which, when called, will be `on` or `off`.
