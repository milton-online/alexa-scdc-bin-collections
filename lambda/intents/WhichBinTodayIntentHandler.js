// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const Alexa = require("ask-sdk-core");
const { getNextCollection } = require("../searchcollections");

function updateAttributes(attributes, collection) {
  attributes.lastReportedBinTime = collection.date.getTime();
  attributes.currentBinType = collection.roundTypes[0];
  attributes.missedQuestion = false;
}

function buildTodayResponse(collection, responseBuilder) {
  const speech = `Today's bin collection is the ${collection.getColoursSpeech()}`;
  const smallImageUrl = collection.getSmallImageUrl();
  const largeImageUrl = collection.getLargeImageUrl();
  
  if (smallImageUrl && largeImageUrl) {
    return responseBuilder.withStandardCard(
      "Collection today",
      speech,
      smallImageUrl,
      largeImageUrl
    );
  }
  return responseBuilder;
}

function buildTomorrowResponse(collection, responseBuilder) {
  const speech = `There is no bin collection due today.  But there is tomorrow.  It's the ${collection.getColoursSpeech()}`;
  return responseBuilder.withStandardCard("Collection tomorrow", speech);
}

function buildNoCollectionResponse(responseBuilder) {
  const speech = "There is no bin collection due today.";
  return responseBuilder.withSimpleCard("No collection today", speech);
}

function buildResponse(collection, responseBuilder) {
  if (collection.isToday()) {
    const speech = `Today's bin collection is the ${collection.getColoursSpeech()}`;
    return { speech, builder: buildTodayResponse(collection, responseBuilder) };
  }
  
  if (collection.isTomorrow()) {
    const speech = `There is no bin collection due today.  But there is tomorrow.  It's the ${collection.getColoursSpeech()}`;
    return { speech, builder: buildTomorrowResponse(collection, responseBuilder) };
  }
  
  const speech = "There is no bin collection due today.";
  return { speech, builder: buildNoCollectionResponse(responseBuilder) };
}

const WhichBinTodayIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "WhichBinTodayIntent"
    );
  },
  handle(handlerInput) {
    const { responseBuilder, attributesManager } = handlerInput;
    const attributes = attributesManager.getSessionAttributes();
    
    attributes.lastReportedBinTime = 0;
    const collection = getNextCollection(attributes);
    if (!collection) {
      throw new Error("No upcoming collections found");
    }
    
    updateAttributes(attributes, collection);
    attributesManager.setSessionAttributes(attributes);
    
    const { speech, builder } = buildResponse(collection, responseBuilder);
    return builder.speak(speech).getResponse();
  },
};

module.exports = WhichBinTodayIntentHandler;
