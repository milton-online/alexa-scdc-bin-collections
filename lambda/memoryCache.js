// Copyright 2020,2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

// In-memory cache for frequently accessed data
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
  }

  set(key, value, ttl = 300000) {
    // 5 min default TTL
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

// Global instance for Lambda container reuse
const globalCache = new MemoryCache();

module.exports = globalCache;
