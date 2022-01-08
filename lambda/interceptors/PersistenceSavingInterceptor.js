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

const log = require("loglevel");

const PersistenceSavingInterceptor = {
  process(handlerInput) {
    const { attributesManager } = handlerInput;
    return new Promise((resolve, reject) => {
      const attributes = attributesManager.getSessionAttributes();
      if (attributes.areDirty) {
        log.debug("Saving attributes");
        if (process.env.MOCK_DEVICE === "true") {
          attributes.areDirty = false;
          attributesManager.setSessionAttributes(attributes);
          resolve();
        } else {
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
        }
      } else {
        resolve();
      }
    });
  },
};

module.exports = PersistenceSavingInterceptor;
