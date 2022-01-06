/* Copyright 2020-2021 Tim Cutts <tim@thecutts.org>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
//const { performance } = require("perf_hooks");

const AWS = require("aws-sdk");
const Alexa = require("ask-sdk-core");
const ddbAdapter = require("ask-sdk-dynamodb-persistence-adapter");
const process = require("process");
const log = require("loglevel");
const util = require("util");
const BinCollection = require("./bincollection.js");
const DataError = require("./dataerror.js");
const interceptors = require("./interceptors.js");
const messages = require("./messages.js");
const {
  getNextCollection,
  getNextCollectionOfType,
} = require("./searchcollections.js");

("use strict");

const PERMISSIONS = ["read::alexa:device:all:address"];

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
    attributes.currentBinType = collection.roundTypes[0];
    attributes.lastReportedBinTime = collection.date.getTime();

    const speakOutput = `Your next collection is the ${collection.getColoursSpeech()}, ${collection.getDateSpeech()}`;

    const oldQuestionState = attributes.missedQuestion;

    if (collection.isToday()) {
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

function resolveToCanonicalSlotValue(slot) {
  const resolutions = slot.resolutions;
  const hasResolutionDataOnSlot =
    resolutions &&
    resolutions.resolutionsPerAuthority &&
    resolutions.resolutionsPerAuthority.length > 0;
  const resolution = hasResolutionDataOnSlot
    ? slot.resolutions.resolutionsPerAuthority[0]
    : null;

  if (resolution && resolution.status.code === "ER_SUCCESS_MATCH") {
    return resolution.values[0].value.name;
  } else {
    return slot.value;
  }
}

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
    log.setLevel(logLevel);
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

const WhichBinTodayIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "WhichBinTodayIntent"
    );
  },
  handle(handlerInput) {
    let { responseBuilder, attributesManager } = handlerInput;

    const attributes = attributesManager.getSessionAttributes();
    attributes.lastReportedBinTime = 0;
    const collection = getNextCollection(attributes);
    attributes.currentBinType = collection.roundTypes[0];
    attributes.lastReportedBinTime = collection.date.getTime();
    attributes.missedQuestion = false;

    let speakOutput;

    if (collection.isToday()) {
      speakOutput =
        "Today's bin collection is the " + collection.getColoursSpeech();
      responseBuilder = responseBuilder.withStandardCard(
        "Collection today",
        speakOutput,
        collection.getSmallImageUrl(),
        collection.getLargeImageUrl()
      );
    } else {
      speakOutput = "There is no bin collection due today.";
      if (collection.isTomorrow()) {
        speakOutput +=
          "  But there is tomorrow.  It's the " + collection.getColoursSpeech();
        responseBuilder = responseBuilder.withStandardCard(
          "Collection tomorrow",
          speakOutput
        );
      } else {
        responseBuilder = responseBuilder.withSimpleCard(
          "No collection today",
          speakOutput
        );
      }
    }

    attributesManager.setSessionAttributes(attributes);

    return responseBuilder.speak(speakOutput).getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.HelpIntent"
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(`${messages.HELP} ${messages.HELP_REPROMPT}`)
      .reprompt(messages.HELP_REPROMPT)
      .withSimpleCard(messages.HELPCARD_TITLE, messages.HELP)
      .getResponse();
  },
};

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

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.CancelIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.StopIntent")
    );
  },
  handle(handlerInput) {
    const speakOutput = "Goodbye!";
    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      "SessionEndedRequest"
    );
  },
  handle(handlerInput) {
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse();
  },
};

const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
    );
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const speakOutput = `You just triggered ${intentName}`;

    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, e) {
    // Errors which reach here we always want logged, so use console rather than log
    console.error(`~~~~~ Error handled: ${e.stack}`);
    let r = handlerInput.responseBuilder;
    if (e instanceof DataError) {
      r = r.speak(e.speech);
      if (e.speech === messages.NOTIFY_MISSING_PERMISSIONS) {
        r = r.withAskForPermissionsConsentCard(PERMISSIONS);
      }
    } else {
      r = r.speak(messages.ERROR);
    }
    return r.getResponse();
  },
};

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

const GetFreshDataIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "GetFreshDataIntent"
    );
  },
  async handle(handlerInput) {
    await interceptors.getFreshAttributes(handlerInput);

    return handlerInput.responseBuilder
      .speak(messages.GOT_FRESH_DATA)
      .withShouldEndSession(false)
      .getResponse();
  },
};

function getLocalDynamoDBClient(options) {
  AWS.config.update({
    region: "eu-west-1",
    endpoint: `http://localhost:${options.port}`,
  });

  return new AWS.DynamoDB();
}

function getPersistenceAdapter(tableName, createTable, dynamoDBClient) {
  let options = {
    tableName: tableName,
    createTable: createTable,
    partitionKeyGenerator: (requestEnvelope) => {
      const userId = Alexa.getUserId(requestEnvelope);
      return userId.substr(userId.lastIndexOf(".") + 1);
    },
  };
  //if a DynamoDB client is specified, this adapter will use it. e.g. the one that will connect to our local instance
  if (dynamoDBClient) {
    options.dynamoDBClient = dynamoDBClient;
  }

  return new ddbAdapter.DynamoDbPersistenceAdapter(options);
}

let persistenceAdapter;
if (process.env.NODE_ENV === "development") {
  log.setLevel("debug");
}
if (process.env.DYNAMODB_LOCAL === "true") {
  const dynamoDBClient = getLocalDynamoDBClient({ port: 8000 });
  persistenceAdapter = getPersistenceAdapter(
    "test-bins-table",
    true,
    dynamoDBClient
  );
} else {
  persistenceAdapter = new ddbAdapter.DynamoDbPersistenceAdapter({
    tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
    createTable: false,
    dynamoDBClient: new AWS.DynamoDB({
      apiVersion: "latest",
      region: process.env.DYNAMODB_PERSISTENCE_REGION,
    }),
  });
}

exports.handler = Alexa.SkillBuilders.custom()
  .withPersistenceAdapter(persistenceAdapter)
  .withApiClient(new Alexa.DefaultApiClient())
  .addRequestHandlers(
    LaunchRequestHandler,
    YesIntentHandler,
    NoIntentHandler,
    NextColourBinIntentHandler,
    MissedBinCollectionIntentHandler,
    WhichBinTodayIntentHandler,
    GetFreshDataIntentHandler,
    SetLogLevelIntentHandler,
    WhoPutTheBinsOutIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler
  )
  .addRequestInterceptors(interceptors.LoadBinCollectionsInterceptor)
  .addResponseInterceptors(interceptors.PersistenceSavingInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();
