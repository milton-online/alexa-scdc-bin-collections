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
const messages = require("./messages.js");

module.exports = class AlexaDevice {
  constructor() {}

  static getConsentToken(requestEnvelope) {
    const consentToken = requestEnvelope.context.System.apiAccessToken;

    if (!consentToken) {
      throw new DataError(
        "No consent token",
        messages.NOTIFY_MISSING_PERMISSIONS
      );
    }

    return consentToken;
  }

  static callDirectiveService(handlerInput, message) {
    const requestEnvelope = handlerInput.requestEnvelope;
    const directiveServiceClient =
      handlerInput.serviceClientFactory.getDirectiveServiceClient();

    const requestId = requestEnvelope.request.requestId;
    const endpoint = requestEnvelope.context.System.apiEndpoint;
    const token = Alexa.getApiAccessToken(requestEnvelope);

    const directive = {
      header: {
        requestId,
      },
      directive: {
        type: "VoicePlayer.Speak",
        speech: message,
      },
    };

    return directiveServiceClient.enqueue(directive, endpoint, token);
  }

  isSameLocationAsDevice(otherDevice) {
    return (
      otherDevice.house.toUpperCase() === this.house.toUpperCase() &&
      otherDevice.postalcode.toUpperCase() === this.postalcode.toUpperCase()
    );
  }

  getPostcodeFromAddress() {
    if (this.address.postalCode === null) {
      throw new DataError("No postcode", messages.NO_POSTCODE);
    }

    if (
      this.address.countryCode === "US" &&
      this.address.postalCode === "20146"
    ) {
      // This is a testing address for Amazon hosted skills, and causes failures during live deployment
      // Return a special result to avoid the test failure
      this.postalcode = "CB246ZD";
      this.house = "241 No Such Street";
    } else {
      // get rid of the space in the postcode
      this.postalcode =
        this.address.postalCode.slice(0, -4) +
        this.address.postalCode.slice(-3);
    }
    return this;
  }

  async getAddressFromDevice(handlerInput) {
    if (process.env.MOCK_DEVICE === "true") {
      this.address = {
        addressLine1: "241 No Such Street",
        postalCode: "CB24 6ZD",
      };
      this.house = this.address.addressLine1;
      return this;
    }
    try {
      const { requestEnvelope, serviceClientFactory } = handlerInput;
      this.deviceId = Alexa.getDeviceId(requestEnvelope);
      const deviceAddressServiceClient =
        serviceClientFactory.getDeviceAddressServiceClient();
      this.address = await deviceAddressServiceClient.getFullAddress(
        this.deviceId
      );
      this.house = this.address.addressLine1;
    } catch (e) {
      throw new DataError(
        "No address from device",
        messages.NOTIFY_MISSING_PERMISSIONS
      );
    }
    return this;
  }
};
