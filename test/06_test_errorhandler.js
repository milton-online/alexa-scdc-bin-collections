// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";

const should = require("should");
const sinon = require("sinon");
const ErrorHandler = require("../lambda/errors/ErrorHandler");
const DataError = require("../lambda/errors/dataerror");
const messages = require("../lambda/messages");
const log = require("loglevel");


describe("ErrorHandler", function () {
  let logErrorStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(log, "error");
  });

  afterEach(function () {
    logErrorStub.restore();
  });

  describe("canHandle()", function () {
    it("should always return true", function () {
      ErrorHandler.canHandle().should.be.true();
    });
  });

  describe("handle()", function () {
    it("should handle DataError with custom speech", function () {
      const mockResponse = { response: "test" };
      const handlerInput = {
        responseBuilder: {
          speak: sinon.stub().returnsThis(),
          getResponse: sinon.stub().returns(mockResponse),
        },
      };

      const error = new DataError("Test error", "Custom error message");
      const result = ErrorHandler.handle(handlerInput, error);

      handlerInput.responseBuilder.speak.calledWith("Custom error message").should.be.true();
      result.should.equal(mockResponse);
      logErrorStub.calledOnce.should.be.true();
    });

    it("should handle DataError with missing permissions", function () {
      const mockResponse = { response: "test" };
      const handlerInput = {
        responseBuilder: {
          speak: sinon.stub().returnsThis(),
          withAskForPermissionsConsentCard: sinon.stub().returnsThis(),
          getResponse: sinon.stub().returns(mockResponse),
        },
      };

      const error = new DataError("No permissions", messages.NOTIFY_MISSING_PERMISSIONS);
      const result = ErrorHandler.handle(handlerInput, error);

      handlerInput.responseBuilder.speak.calledWith(messages.NOTIFY_MISSING_PERMISSIONS).should.be.true();
      handlerInput.responseBuilder.withAskForPermissionsConsentCard.calledOnce.should.be.true();
      result.should.equal(mockResponse);
    });

    it("should handle generic Error", function () {
      const mockResponse = { response: "test" };
      const handlerInput = {
        responseBuilder: {
          speak: sinon.stub().returnsThis(),
          getResponse: sinon.stub().returns(mockResponse),
        },
      };

      const error = new Error("Generic error");
      const result = ErrorHandler.handle(handlerInput, error);

      handlerInput.responseBuilder.speak.calledWith(messages.ERROR).should.be.true();
      result.should.equal(mockResponse);
      logErrorStub.calledOnce.should.be.true();
    });
  });
});
