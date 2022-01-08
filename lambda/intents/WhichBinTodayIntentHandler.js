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
const { getNextCollection } = require("../searchcollections");

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

module.exports = WhichBinTodayIntentHandler;
