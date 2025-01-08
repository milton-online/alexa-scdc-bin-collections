// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const Alexa = require("ask-sdk-core");
const messages = require("../messages");

const NoIntentHandler = {
  canHandle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent" &&
      attributes.missedQuestion === true
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(messages.BYE_THEN)
      .withShouldEndSession(true)
      .getResponse();
  },
};

module.exports = NoIntentHandler;
