// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const Alexa = require("ask-sdk-core");
const BinCollection = require("../bincollection");
const { getNextCollectionOfType } = require("../searchcollections");
const { resolveToCanonicalSlotValue } = require("./slotResolver");

const NextColourBinIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "NextColourBinIntent"
    );
  },
  handle(handlerInput) {
    let { requestEnvelope, responseBuilder, attributesManager } = handlerInput;

    const binType = resolveToCanonicalSlotValue(
      requestEnvelope.request.intent.slots.binType
    );

    const attributes = attributesManager.getSessionAttributes();

    attributes.lastReportedBinTime = 0;
    const collection = getNextCollectionOfType(attributes, binType);
    if (!collection) {
      throw new Error(`No upcoming ${binType} collections found`);
    }
    attributes.currentBinType = binType;
    attributes.lastReportedBinTime = collection.date.getTime();
    attributes.lastIntent = requestEnvelope.request.intent;

    if (collection.isToday()) {
      responseBuilder = responseBuilder.withShouldEndSession(false);
      attributes.missedQuestion = true;
    } else {
      attributes.missedQuestion = false;
    }

    attributesManager.setSessionAttributes(attributes);

    const speakOutput = [
      "Your next",
      BinCollection.getColourForBinType(binType),
      BinCollection.getNameForBinType(binType),
      "collection is",
      collection.getDateSpeech(),
    ].join(" ");

    return responseBuilder.speak(speakOutput).getResponse();
  },
};

module.exports = NextColourBinIntentHandler;
