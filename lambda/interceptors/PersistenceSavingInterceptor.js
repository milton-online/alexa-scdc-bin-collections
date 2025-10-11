// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const log = require("loglevel");

const PersistenceSavingInterceptor = {
  async process(handlerInput) {
    const { attributesManager } = handlerInput;
    const attributes = attributesManager.getSessionAttributes();
    
    if (!attributes.areDirty) {
      return;
    }
    
    log.debug("Saving attributes");
    
    if (process.env.MOCK_DEVICE !== "true") {
      await attributesManager.savePersistentAttributes();
    }
    
    attributes.areDirty = false;
    attributesManager.setSessionAttributes(attributes);
  },
};

module.exports = PersistenceSavingInterceptor;
