// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const Alexa = require("ask-sdk-core");
const messages = require("../messages");
const BinCollection = require("../bincollection");
const { getNextCollectionOfType } = require("../searchcollections");

const MissedBinCollectionIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "MissedBinCollectionIntent"
    );
  },
  handle(handlerInput) {
    const { attributesManager } = handlerInput;

    const attributes = attributesManager.getSessionAttributes();

    const collection = getNextCollectionOfType(
      attributes,
      attributes.currentBinType
    );

    if (!collection) {
      return handlerInput.responseBuilder.speak(messages.NO_MORE).getResponse();
    }

    attributes.lastReportedBinTime = collection.date.getTime();
    attributes.missedQuestion = false;
    attributesManager.setSessionAttributes(attributes);

    const binType = BinCollection.getBinType(attributes.currentBinType);

    const speakOutput =
      `The next ${binType.colour} ${binType.name} collection ` +
      `will be ${collection.getDateSpeech()}`;

    return handlerInput.responseBuilder
      .withStandardCard(
        `Next ${binType.name} collection`,
        speakOutput,
        collection.getSmallImageUrl(),
        collection.getLargeImageUrl()
      )
      .speak(`OK then.  ${speakOutput}`)
      .getResponse();
  },
};

module.exports = MissedBinCollectionIntentHandler;
