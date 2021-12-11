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
const log = require("loglevel");
const { getFreshSessionData, attributesAreStale } = require("./sessiondata.js");

async function getFreshAttributes(handlerInput) {
    log.info("Fetching new persistent data");
    const attributesManager = handlerInput.attributesManager;
    const attributes = await getFreshSessionData(handlerInput);
    if (attributes.logLevel) {
        log.setLevel(attributes.logLevel);
    } else {
        attributes.logLevel = "error";
        log.setLevel("error");
    }

    attributesManager.setSessionAttributes(attributes);
    attributesManager.setPersistentAttributes(attributes);
}

module.exports = {
    getFreshAttributes: getFreshAttributes,
    PersistenceSavingInterceptor: {
        process(handlerInput) {
            const { attributesManager } = handlerInput;
            return new Promise((resolve, reject) => {
                const attributes = attributesManager.getSessionAttributes();
                if (attributes.areDirty) {
                    log.debug("Saving attributes");
                    attributesManager
                        .savePersistentAttributes()
                        .then(() => {
                            attributes.areDirty = false;
                            attributesManager.setSessionAttributes(attributes);
                            resolve();
                        })
                        .catch((error) => {
                            reject(error);
                        });
                } else {
                    resolve();
                }
            });
        },
    },
    LoadBinCollectionsInterceptor: {
        async process(handlerInput) {
            const { requestEnvelope, attributesManager } = handlerInput;
            // In normal operation there wouldn't be session attributes here, but during testing there are
            let attributes = attributesManager.getSessionAttributes();
            if (!attributes.deviceId) {
                attributes =
                    (await attributesManager.getPersistentAttributes()) || {};
                attributes.missedQuestion = false;
                attributesManager.setSessionAttributes(attributes);
            }

            const deviceId = Alexa.getDeviceId(requestEnvelope);

            if (attributesAreStale(attributes, deviceId)) {
                await getFreshAttributes(handlerInput);
            }
        },
    },
};
