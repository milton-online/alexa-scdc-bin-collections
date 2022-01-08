/* Copyright 2020-2022 Tim Cutts <tim@thecutts.org>

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

const Alexa = require("ask-sdk-core");
const process = require("process");
const log = require("loglevel");

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

("use strict");

if (process.env.NODE_ENV === "development") {
  log.setLevel("debug");
}

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
