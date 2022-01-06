const AlexaDevice = require("../lambda/alexadevice");

module.exports = class MockAlexaDevice extends AlexaDevice {
  constructor(deviceId, address) {
    super();
    this.deviceId = deviceId;
    this.address = address;
    this.house = this.address.addressLine1;
  }
};
