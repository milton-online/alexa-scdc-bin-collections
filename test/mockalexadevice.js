// Copyright 2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const AlexaDevice = require("../lambda/alexadevice");

module.exports = class MockAlexaDevice extends AlexaDevice {
  constructor(deviceId, address) {
    super();
    this.deviceId = deviceId;
    this.address = address;
  }
};
