// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const Alexa = require("ask-sdk-core");
const { getNextCollection } = require("../searchcollections");

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest" ||
      (Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "NextBinCollectionIntent")
    );
  },
  handle(handlerInput) {
    let { responseBuilder, attributesManager } = handlerInput;

    const attributes = attributesManager.getSessionAttributes();

    attributes.lastReportedBinTime = 0;
    const collection = getNextCollection(attributes);
    if (!collection) {
      throw new Error("No upcoming collections found");
    }
    attributes.currentBinType = collection.roundTypes[0];
    attributes.lastReportedBinTime = collection.date.getTime();

    const speakOutput = `Your next collection is the ${collection.getColoursSpeech()}, ${collection.getDateSpeech()}`;

    const oldQuestionState = attributes.missedQuestion;

    if (collection.isThisAfternoon()) {
      responseBuilder = responseBuilder.withShouldEndSession(false);
      attributes.missedQuestion = true;
    } else {
      attributes.missedQuestion = false;
    }

    attributes.areDirty =
      attributes.areDirty || attributes.missedQuestion !== oldQuestionState;

    attributesManager.setSessionAttributes(attributes);

    return responseBuilder
      .speak(speakOutput)
      .withStandardCard(
        "Next collection",
        speakOutput,
        collection.getSmallImageUrl(),
        collection.getLargeImageUrl()
      )
      .getResponse();
  },
};

module.exports = LaunchRequestHandler;
