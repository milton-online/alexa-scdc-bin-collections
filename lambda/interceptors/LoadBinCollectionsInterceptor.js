// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const AlexaDevice = require("../alexadevice");
const { attributesAreStale, getFreshAttributes } = require("../sessiondata");

const LoadBinCollectionsInterceptor = {
  async process(handlerInput) {
    const { attributesManager } = handlerInput;
    // In normal operation there wouldn't be session attributes here, but during testing there are
    let attributes = attributesManager.getSessionAttributes();
    if (!attributes.deviceId) {
      attributes = (await attributesManager.getPersistentAttributes()) || {};
      attributes.missedQuestion = false;
      attributesManager.setSessionAttributes(attributes);
    }

    const thisDevice = new AlexaDevice();
    await thisDevice.getAddressFromDevice(handlerInput);
    thisDevice.getPostcodeFromAddress();

    if (attributesAreStale(attributes, thisDevice)) {
      await getFreshAttributes(handlerInput, thisDevice);
    }
  },
};

module.exports = LoadBinCollectionsInterceptor;
