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
const { getFreshAttributes } = require("../sessiondata");

const GetFreshDataIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "GetFreshDataIntent"
    );
  },
  async handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    await getFreshAttributes(handlerInput, attributes.alexaDevice);

    return handlerInput.responseBuilder
      .speak(messages.GOT_FRESH_DATA)
      .withShouldEndSession(false)
      .getResponse();
  },
};

module.exports = GetFreshDataIntentHandler;
