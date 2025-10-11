// Copyright 2020,2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

// Progressive data loading for immediate response
const { getFreshSessionData } = require("./sessiondata");
const log = require("loglevel");

class ProgressiveLoader {
  static async loadWithFallback(handlerInput, alexaDevice) {
    const { attributesManager } = handlerInput;
    const attributes = attributesManager.getSessionAttributes();

    // If we have any cached data, use it immediately
    if (attributes.collections && attributes.collections.length > 0) {
      const shouldRefresh = this.shouldRefreshInBackground(attributes);
      
      // Trigger background refresh if needed
      if (shouldRefresh) {
        this.refreshInBackground(handlerInput, alexaDevice);
      }

      return this.buildQuickResponse(attributes, shouldRefresh);
    }

    // No cache - must fetch fresh data
    return getFreshSessionData(handlerInput, alexaDevice);
  }

  static buildQuickResponse(attributes, refreshing) {
    return {
      collections: attributes.collections,
      fromCache: true,
      refreshing,
    };
  }

  static shouldRefreshInBackground(attributes) {
    const age = Date.now() - (attributes.fetchedOnDate || 0);
    return age > 12 * 60 * 60 * 1000; // 12 hours
  }

  static async refreshInBackground(handlerInput, alexaDevice) {
    // Non-blocking background refresh
    setTimeout(async () => {
      try {
        await getFreshSessionData(handlerInput, alexaDevice);
      } catch (err) {
        log.error("Background refresh failed");
      }
    }, 100);
  }
}

module.exports = ProgressiveLoader;
