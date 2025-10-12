// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";

const should = require("should");
const sinon = require("sinon");
const ProgressiveLoader = require("../lambda/progressiveLoader");


describe("ProgressiveLoader", function () {
  let clock;

  beforeEach(function () {
    clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    clock.restore();
  });

  describe("loadWithFallback()", function () {
    it("should return cached data when available", async function () {
      const handlerInput = {
        attributesManager: {
          getSessionAttributes: sinon.stub().returns({
            collections: [{ date: "2025-01-01" }],
            fetchedOnDate: Date.now(),
          }),
        },
      };
      const alexaDevice = { deviceId: "test-device" };

      const result = await ProgressiveLoader.loadWithFallback(handlerInput, alexaDevice);
      
      result.should.have.property("collections");
      result.should.have.property("fromCache", true);
      result.collections.length.should.equal(1);
    });

    it("should trigger background refresh for old data", async function () {
      const oldDate = Date.now() - 13 * 60 * 60 * 1000; // 13 hours ago
      const handlerInput = {
        attributesManager: {
          getSessionAttributes: sinon.stub().returns({
            collections: [{ date: "2025-01-01" }],
            fetchedOnDate: oldDate,
          }),
        },
      };
      const alexaDevice = { deviceId: "test-device" };

      const result = await ProgressiveLoader.loadWithFallback(handlerInput, alexaDevice);
      
      result.should.have.property("refreshing", true);
    });

    it("should not trigger background refresh for fresh data", async function () {
      const recentDate = Date.now() - 1 * 60 * 60 * 1000; // 1 hour ago
      const handlerInput = {
        attributesManager: {
          getSessionAttributes: sinon.stub().returns({
            collections: [{ date: "2025-01-01" }],
            fetchedOnDate: recentDate,
          }),
        },
      };
      const alexaDevice = { deviceId: "test-device" };

      const result = await ProgressiveLoader.loadWithFallback(handlerInput, alexaDevice);
      
      result.should.have.property("refreshing", false);
    });
  });

  describe("buildQuickResponse()", function () {
    it("should build response with cache flag", function () {
      const attributes = {
        collections: [{ date: "2025-01-01" }],
        fetchedOnDate: Date.now(),
      };

      const result = ProgressiveLoader.buildQuickResponse(attributes);
      
      result.should.have.property("collections");
      result.should.have.property("fromCache", true);
      result.should.have.property("refreshing");
    });
  });

  describe("shouldRefreshInBackground()", function () {
    it("should return true for old data", function () {
      const oldDate = Date.now() - 13 * 60 * 60 * 1000; // 13 hours ago
      const attributes = { fetchedOnDate: oldDate };

      ProgressiveLoader.shouldRefreshInBackground(attributes).should.be.true();
    });

    it("should return false for fresh data", function () {
      const recentDate = Date.now() - 1 * 60 * 60 * 1000; // 1 hour ago
      const attributes = { fetchedOnDate: recentDate };

      ProgressiveLoader.shouldRefreshInBackground(attributes).should.be.false();
    });
  });

  describe("refreshInBackground()", function () {
    it("should schedule background refresh", async function () {
      const handlerInput = { test: "input" };
      const alexaDevice = { deviceId: "test-device" };

      await ProgressiveLoader.refreshInBackground(handlerInput, alexaDevice);
      
      // Verify setTimeout was called
      clock.countTimers().should.be.greaterThan(0);
    });
  });
});
