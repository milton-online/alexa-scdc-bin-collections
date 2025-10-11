// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const Alexa = require("ask-sdk-core");
const { resolveToCanonicalSlotValue } = require("./slotResolver");
const log = require("loglevel");
const util = require("util");
const messages = require("../messages");

const SetLogLevelIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "SetLogLevelIntent"
    );
  },
  handle(handlerInput) {
    let { requestEnvelope, responseBuilder, attributesManager } = handlerInput;

    const logLevel = resolveToCanonicalSlotValue(
      requestEnvelope.request.intent.slots.logLevel
    );

    const attributes = attributesManager.getSessionAttributes();
    attributes.logLevel = logLevel;
    
    const validLevels = ["trace", "debug", "info", "warn", "error", "silent"];
    if (validLevels.includes(logLevel)) {
      log.setLevel(logLevel);
    }
    
    attributesManager.setSessionAttributes(attributes);

    return responseBuilder
      .speak(util.format(messages.LOGGING, logLevel))
      .withSimpleCard(
        "Bin Collections Log Level",
        util.format(messages.LOGGING_CARD, logLevel)
      )
      .getResponse();
  },
};

module.exports = SetLogLevelIntentHandler;
