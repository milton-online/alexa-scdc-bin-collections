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

const AlexaDevice = require("../alexadevice");
const { attributesAreStale, getFreshAttributes } = require("../sessiondata");

const LoadBinCollectionsInterceptor = {
  async process(handlerInput) {
    const { attributesManager } = handlerInput;
    // In normal operation there wouldn't be session attributes here, but during testing there are
    let attributes = attributesManager.getSessionAttributes();
    if (!attributes.deviceId) {
      attributes = (await attributesManager.getPersistentAttributes()) || {};
      attributes.missedQuestion = false;
      attributesManager.setSessionAttributes(attributes);
    }

    const thisDevice = new AlexaDevice();
    await thisDevice.getAddressFromDevice(handlerInput);
    thisDevice.getPostcodeFromAddress();

    if (attributesAreStale(attributes, thisDevice)) {
      await getFreshAttributes(handlerInput, thisDevice);
    }
  },
};

module.exports = LoadBinCollectionsInterceptor;
