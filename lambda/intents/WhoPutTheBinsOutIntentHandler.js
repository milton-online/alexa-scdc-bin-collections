// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const Alexa = require("ask-sdk-core");
const messages = require("../messages");

const WhoPutTheBinsOutIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "WhoPutTheBinsOutIntent"
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak(messages.WHOWHOWHO).getResponse();
  },
};

module.exports = WhoPutTheBinsOutIntentHandler;
