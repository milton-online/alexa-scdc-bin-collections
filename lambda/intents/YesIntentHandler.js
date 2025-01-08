// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const Alexa = require("ask-sdk-core");
const messages = require("../messages");
const MissedBinCollectionIntentHandler = require("./MissedBinCollectionIntentHandler");

const YesIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent"
    );
  },
  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    if (attributes.missedQuestion) {
      return MissedBinCollectionIntentHandler.handle(handlerInput);
    } else {
      return handlerInput.responseBuilder
        .speak(messages.NO_QUESTION)
        .getResponse();
    }
  },
};

module.exports = YesIntentHandler;
