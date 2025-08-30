// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const log = require("loglevel");

const PersistenceSavingInterceptor = {
  process(handlerInput) {
    const { attributesManager } = handlerInput;
    return new Promise((resolve, reject) => {
      const attributes = attributesManager.getSessionAttributes();

      if (!attributes.areDirty) {
        resolve();
        return;
      }

      const cleanupAttributes = () => {
        attributes.areDirty = false;
        attributesManager.setSessionAttributes(attributes);
        resolve();
      };

      log.debug("Saving attributes");
      if (process.env.MOCK_DEVICE === "true") {
        cleanupAttributes();
      } else {
        attributesManager
          .savePersistentAttributes()
          .then(cleanupAttributes())
          .catch((error) => {
            reject(error);
          });
      }
    });
  },
};

module.exports = PersistenceSavingInterceptor;
