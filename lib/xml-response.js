'use strict';

module.exports = function xmlResponse({ getOrSet, state }) {
  const type = getOrSet.toLowerCase() === 'get' ? 'Get' : 'Set';
  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${type}BinaryStateResponse xmlns:u="urn:Belkin:service:basicevent:1">
      <BinaryState>${state}</BinaryState>
    </u:${type}BinaryStateResponse>
  </s:Body>
</s:Envelope>`;
}
