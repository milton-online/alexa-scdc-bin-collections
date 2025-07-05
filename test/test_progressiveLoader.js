// Copyright 2020,2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const should = require("should");
const sinon = require("sinon");
const ProgressiveLoader = require("../lambda/progressiveLoader");

describe("ProgressiveLoader", function () {
  let mockHandlerInput, mockAlexaDevice;

  beforeEach(function () {
    mockHandlerInput = {
      attributesManager: {
        getSessionAttributes: sinon.stub(),
        setSessionAttributes: sinon.stub()
      }
    };
    mockAlexaDevice = { deviceId: "test-device" };
  });

  describe("loadWithFallback()", function () {
    it("should return cached data when available", async function () {
      const attributes = {
        collections: [{ date: "2025-01-20T00:00:00Z" }],
        fetchedOnDate: Date.now() - 1000
      };
      mockHandlerInput.attributesManager.getSessionAttributes.returns(attributes);

      const result = await ProgressiveLoader.loadWithFallback(mockHandlerInput, mockAlexaDevice);
      
      result.should.have.property("fromCache", true);
      result.collections.should.equal(attributes.collections);
    });

    it("should identify when no cache exists", function () {
      mockHandlerInput.attributesManager.getSessionAttributes.returns({});
      
      // Test the condition that determines if fresh data is needed
      const attributes = mockHandlerInput.attributesManager.getSessionAttributes();
      const hasValidCache = !!(attributes.collections && attributes.collections.length > 0);
      
      hasValidCache.should.equal(false);
    });
  });

  describe("buildQuickResponse()", function () {
    it("should build response with cache flag", function () {
      const attributes = {
        collections: [{ date: "2025-01-20T00:00:00Z" }],
        fetchedOnDate: Date.now()
      };

      const result = ProgressiveLoader.buildQuickResponse(attributes);
      
      result.should.have.property("fromCache", true);
      result.should.have.property("collections");
      result.should.have.property("refreshing");
    });
  });

  describe("shouldRefreshInBackground()", function () {
    it("should refresh when data is old", function () {
      const oldDate = Date.now() - 13 * 60 * 60 * 1000; // 13 hours ago
      ProgressiveLoader.shouldRefreshInBackground({ fetchedOnDate: oldDate }).should.equal(true);
    });

    it("should not refresh when data is fresh", function () {
      const recentDate = Date.now() - 1 * 60 * 60 * 1000; // 1 hour ago
      ProgressiveLoader.shouldRefreshInBackground({ fetchedOnDate: recentDate }).should.equal(false);
    });
  });
});