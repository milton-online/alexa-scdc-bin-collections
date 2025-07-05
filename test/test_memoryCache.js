// Copyright 2020,2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const should = require("should");
const memoryCache = require("../lambda/memoryCache");

describe("MemoryCache", function () {
  beforeEach(function () {
    memoryCache.clear();
  });

  describe("set() and get()", function () {
    it("should store and retrieve values", function () {
      memoryCache.set("test-key", "test-value");
      memoryCache.get("test-key").should.equal("test-value");
    });

    it("should return null for non-existent keys", function () {
      should(memoryCache.get("non-existent")).be.null();
    });

    it("should expire values after TTL", function (done) {
      memoryCache.set("expire-key", "expire-value", 50); // 50ms TTL
      
      setTimeout(() => {
        should(memoryCache.get("expire-key")).be.null();
        done();
      }, 60);
    });

    it("should not expire values before TTL", function () {
      memoryCache.set("valid-key", "valid-value", 1000); // 1s TTL
      memoryCache.get("valid-key").should.equal("valid-value");
    });
  });

  describe("cache size management", function () {
    it("should evict oldest entries when max size reached", function () {
      // Set max size to a small number for testing
      const originalMaxSize = memoryCache.maxSize;
      memoryCache.maxSize = 2;

      memoryCache.set("key1", "value1");
      memoryCache.set("key2", "value2");
      memoryCache.set("key3", "value3"); // Should evict key1

      should(memoryCache.get("key1")).be.null();
      memoryCache.get("key2").should.equal("value2");
      memoryCache.get("key3").should.equal("value3");

      // Restore original max size
      memoryCache.maxSize = originalMaxSize;
    });
  });

  describe("clear()", function () {
    it("should remove all cached values", function () {
      memoryCache.set("key1", "value1");
      memoryCache.set("key2", "value2");
      
      memoryCache.clear();
      
      should(memoryCache.get("key1")).be.null();
      should(memoryCache.get("key2")).be.null();
    });
  });
});