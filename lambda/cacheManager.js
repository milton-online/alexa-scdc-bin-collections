// Copyright 2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const { CACHE_TTL } = require("./constants");

class CacheManager {
  static shouldRefreshCollections(attributes) {
    if (!attributes.collections || !attributes.fetchedOnDate) return true;

    const now = Date.now();
    const age = now - attributes.fetchedOnDate;

    // Refresh if older than TTL or first collection is in the past
    if (age > CACHE_TTL.COLLECTIONS) return true;

    if (attributes.collections.length === 0) return true;

    const firstCollection = new Date(attributes.collections[0].date);
    return firstCollection.getTime() < new Date().setHours(0, 0, 0, 0);
  }

  static shouldRefreshPostcode(attributes) {
    return (
      !attributes.postcodeCache ||
      Date.now() - attributes.postcodeCacheDate > CACHE_TTL.POSTCODE_LOOKUP
    );
  }
}

module.exports = CacheManager;
