// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const Alexa = require("ask-sdk-core");
const messages = require("../messages");
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

    await getFreshAttributes(handlerInput, attributes.alexaDevice);

    return handlerInput.responseBuilder
      .speak(messages.GOT_FRESH_DATA)
      .withShouldEndSession(false)
      .getResponse();
  },
};

module.exports = GetFreshDataIntentHandler;
