/* Copyright 2020-2021 Tim Cutts <tim@thecutts.org>

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
const DataError = require("./dataerror.js");
const { messages } = require("./messages.js");

exports.getAddressFromDevice = async function (handlerInput) {
  try {
    const { requestEnvelope, serviceClientFactory } = handlerInput;
    const deviceId = Alexa.getDeviceId(requestEnvelope);
    const deviceAddressServiceClient =
      serviceClientFactory.getDeviceAddressServiceClient();
    const address = await deviceAddressServiceClient.getFullAddress(deviceId);

    return address;
  } catch (e) {
    throw new DataError(
      "No address from device",
      messages.NOTIFY_MISSING_PERMISSIONS
    );
  }
};
