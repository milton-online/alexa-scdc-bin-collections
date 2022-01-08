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

module.exports = LaunchRequestHandler;
