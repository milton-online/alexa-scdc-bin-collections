// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";

const Alexa = require("ask-sdk-core");

const LaunchRequestHandler = require("./intents/LaunchRequestHandler");
const NextColourBinIntentHandler = require("./intents/NextColourBinIntentHandler");
const SetLogLevelIntentHandler = require("./intents/SetLogLevelIntentHandler");
const MissedBinCollectionIntentHandler = require("./intents/MissedBinCollectionIntentHandler");
const WhichBinTodayIntentHandler = require("./intents/WhichBinTodayIntentHandler");
const GetFreshDataIntentHandler = require("./intents/GetFreshDataIntentHandler");
const WhoPutTheBinsOutIntentHandler = require("./intents/WhoPutTheBinsOutIntentHandler");
const CancelAndStopIntentHandler = require("./intents/CancelAndStopIntentHandler");
const SessionEndedRequestHandler = require("./intents/SessionEndedRequestHandler");
const HelpIntentHandler = require("./intents/HelpIntentHandler");
const IntentReflectorHandler = require("./intents/IntentReflectorHandler");
const YesIntentHandler = require("./intents/YesIntentHandler");
const NoIntentHandler = require("./intents/NoIntentHandler");

const LoadBinCollectionsInterceptor = require("./interceptors/LoadBinCollectionsInterceptor");
const PersistenceSavingInterceptor = require("./interceptors/PersistenceSavingInterceptor");

const ErrorHandler = require("./errors/ErrorHandler");

const getPersistenceAdapter = require("./persistenceAdapter");

exports.handler = Alexa.SkillBuilders.custom()
  .withPersistenceAdapter(getPersistenceAdapter())
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
  .addRequestInterceptors(LoadBinCollectionsInterceptor)
  .addResponseInterceptors(PersistenceSavingInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();
