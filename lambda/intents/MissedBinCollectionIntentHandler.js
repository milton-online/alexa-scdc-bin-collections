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
const messages = require("../messages");
const BinCollection = require("../bincollection");
const { getNextCollectionOfType } = require("../searchcollections");

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

module.exports = MissedBinCollectionIntentHandler;
