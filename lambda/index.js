// Copyright 2020-2026 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2026 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";

const log = require("loglevel");
const Alexa = require("ask-sdk-core");
const getPersistenceAdapter = require("./persistenceAdapter");

log.setLevel(process.env.LOG_LEVEL || "info");

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

let skill;

exports.handler = async (event, context) => {
  log.info(`Request: ${JSON.stringify(event)}`);

  if (!skill) {
    skill = Alexa.SkillBuilders.custom()
      .withPersistenceAdapter(getPersistenceAdapter())
      .withApiClient(new Alexa.DefaultApiClient())
      .addRequestHandlers(...handlers)
      .addRequestInterceptors(LoadBinCollectionsInterceptor)
      .addResponseInterceptors(PersistenceSavingInterceptor)
      .addErrorHandlers(ErrorHandler)
      .create();
  }

  const response = await skill.invoke(event, context);
  log.info(`Response: ${JSON.stringify(response)}`);

  return response;
};
