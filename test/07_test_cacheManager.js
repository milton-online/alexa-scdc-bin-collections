// Copyright 2020,2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const should = require("should");
const CacheManager = require("../lambda/cacheManager");

describe("CacheManager", function () {
  describe("shouldRefreshCollections()", function () {
    it("should refresh when no collections", function () {
      CacheManager.shouldRefreshCollections({}).should.equal(true);
    });

    it("should refresh when no fetchedOnDate", function () {
      CacheManager.shouldRefreshCollections({
        collections: [{ date: "2025-01-20T00:00:00Z" }]
      }).should.equal(true);
    });

    it("should refresh when data is old", function () {
      const oldDate = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      CacheManager.shouldRefreshCollections({
        collections: [{ date: "2025-01-20T00:00:00Z" }],
        fetchedOnDate: oldDate
      }).should.equal(true);
    });

    it("should not refresh when data is fresh", function () {
      const recentDate = Date.now() - 1 * 60 * 60 * 1000; // 1 hour ago
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      CacheManager.shouldRefreshCollections({
        collections: [{ date: tomorrow.toISOString() }],
        fetchedOnDate: recentDate
      }).should.equal(false);
    });
  });

  describe("shouldRefreshPostcode()", function () {
    it("should refresh when no cache", function () {
      CacheManager.shouldRefreshPostcode({}).should.equal(true);
    });

    it("should refresh when cache is old", function () {
      const oldDate = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
      CacheManager.shouldRefreshPostcode({
        postcodeCache: {},
        postcodeCacheDate: oldDate
      }).should.equal(true);
    });

    it("should not refresh when cache is fresh", function () {
      const recentDate = Date.now() - 1 * 24 * 60 * 60 * 1000; // 1 day ago
      CacheManager.shouldRefreshPostcode({
        postcodeCache: {},
        postcodeCacheDate: recentDate
      }).should.equal(false);
    });
  });
});