// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const Alexa = require("ask-sdk-core");
const messages = require("../messages");
const DataError = require("../errors/dataerror");
const { getFreshAttributes } = require("../sessiondata");

const GetFreshDataIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "GetFreshDataIntent"
    );
  },
  async handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    if (!attributes.alexaDevice) {
      throw new Error("No device information available");
    }

    try {
      await getFreshAttributes(handlerInput, attributes.alexaDevice);
      return handlerInput.responseBuilder
        .speak(messages.GOT_FRESH_DATA)
        .withShouldEndSession(false)
        .getResponse();
    } catch (error) {
      if (error instanceof DataError || error.name === "DataError") {
        return handlerInput.responseBuilder
          .speak(error.speech)
          .getResponse();
      }
      throw error;
    }
  },
};

module.exports = GetFreshDataIntentHandler;
