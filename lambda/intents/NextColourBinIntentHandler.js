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
const BinCollection = require("../bincollection");
const { getNextCollectionOfType } = require("../searchcollections");
const { resolveToCanonicalSlotValue } = require("./slotResolver");

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

module.exports = NextColourBinIntentHandler;
