// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";

const Alexa = require("ask-sdk-core");
const getPersistenceAdapter = require("./persistenceAdapter");

const handlers = [
  "LaunchRequestHandler",
  "YesIntentHandler",
  "NoIntentHandler",
  "NextColourBinIntentHandler",
  "MissedBinCollectionIntentHandler",
  "WhichBinTodayIntentHandler",
  "GetFreshDataIntentHandler",
  "SetLogLevelIntentHandler",
  "WhoPutTheBinsOutIntentHandler",
  "HelpIntentHandler",
  "CancelAndStopIntentHandler",
  "SessionEndedRequestHandler",
  "IntentReflectorHandler",
].map((name) => require(`./intents/${name}`));

const LoadBinCollectionsInterceptor = require("./interceptors/LoadBinCollectionsInterceptor");
const PersistenceSavingInterceptor = require("./interceptors/PersistenceSavingInterceptor");
const ErrorHandler = require("./errors/ErrorHandler");

exports.handler = Alexa.SkillBuilders.custom()
  .withPersistenceAdapter(getPersistenceAdapter())
  .withApiClient(new Alexa.DefaultApiClient())
  .addRequestHandlers(...handlers)
  .addRequestInterceptors(LoadBinCollectionsInterceptor)
  .addResponseInterceptors(PersistenceSavingInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();
