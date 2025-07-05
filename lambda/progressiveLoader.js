// Copyright 2020,2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

// Progressive data loading for immediate response
const { getFreshSessionData } = require("./sessiondata");

class ProgressiveLoader {
  static async loadWithFallback(handlerInput, alexaDevice) {
    const { attributesManager } = handlerInput;
    const attributes = attributesManager.getSessionAttributes();

    // If we have any cached data, use it immediately
    if (attributes.collections && attributes.collections.length > 0) {
      // Return cached data first
      const cachedResponse = this.buildQuickResponse(attributes);

      // Trigger background refresh if needed
      if (this.shouldRefreshInBackground(attributes)) {
        this.refreshInBackground(handlerInput, alexaDevice);
      }

      return cachedResponse;
    }

    // No cache - must fetch fresh data
    return getFreshSessionData(handlerInput, alexaDevice);
  }

  static buildQuickResponse(attributes) {
    return {
      collections: attributes.collections,
      fromCache: true,
      refreshing: this.shouldRefreshInBackground(attributes),
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
        console.log("Background refresh failed:", err.message);
      }
    }, 100);
  }
}

module.exports = ProgressiveLoader;
