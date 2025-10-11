// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const should = require("should");
const sinon = require("sinon");
const CancelAndStopIntentHandler = require("../lambda/intents/CancelAndStopIntentHandler");
const HelpIntentHandler = require("../lambda/intents/HelpIntentHandler");
const IntentReflectorHandler = require("../lambda/intents/IntentReflectorHandler");
const SessionEndedRequestHandler = require("../lambda/intents/SessionEndedRequestHandler");
const NoIntentHandler = require("../lambda/intents/NoIntentHandler");
const GetFreshDataIntentHandler = require("../lambda/intents/GetFreshDataIntentHandler");
const { resolveToCanonicalSlotValue } = require("../lambda/intents/slotResolver");

("use strict");

describe("Intent Handlers", function () {
  describe("CancelAndStopIntentHandler", function () {
    it("should handle AMAZON.CancelIntent", function () {
      const handlerInput = {
        requestEnvelope: {
          request: {
            type: "IntentRequest",
            intent: { name: "AMAZON.CancelIntent" },
          },
        },
        responseBuilder: {
          speak: sinon.stub().returnsThis(),
          getResponse: sinon.stub().returns({ response: "test" }),
        },
      };

      CancelAndStopIntentHandler.canHandle(handlerInput).should.be.true();
      const response = CancelAndStopIntentHandler.handle(handlerInput);
      handlerInput.responseBuilder.speak.calledOnce.should.be.true();
    });

    it("should handle AMAZON.StopIntent", function () {
      const handlerInput = {
        requestEnvelope: {
          request: {
            type: "IntentRequest",
            intent: { name: "AMAZON.StopIntent" },
          },
        },
        responseBuilder: {
          speak: sinon.stub().returnsThis(),
          getResponse: sinon.stub().returns({ response: "test" }),
        },
      };

      CancelAndStopIntentHandler.canHandle(handlerInput).should.be.true();
      CancelAndStopIntentHandler.handle(handlerInput);
      handlerInput.responseBuilder.speak.calledOnce.should.be.true();
    });
  });

  describe("HelpIntentHandler", function () {
    it("should handle AMAZON.HelpIntent", function () {
      const handlerInput = {
        requestEnvelope: {
          request: {
            type: "IntentRequest",
            intent: { name: "AMAZON.HelpIntent" },
          },
        },
        responseBuilder: {
          speak: sinon.stub().returnsThis(),
          reprompt: sinon.stub().returnsThis(),
          withSimpleCard: sinon.stub().returnsThis(),
          getResponse: sinon.stub().returns({ response: "test" }),
        },
      };

      HelpIntentHandler.canHandle(handlerInput).should.be.true();
      HelpIntentHandler.handle(handlerInput);
      handlerInput.responseBuilder.speak.calledOnce.should.be.true();
      handlerInput.responseBuilder.reprompt.calledOnce.should.be.true();
      handlerInput.responseBuilder.withSimpleCard.calledOnce.should.be.true();
    });
  });

  describe("IntentReflectorHandler", function () {
    it("should handle any IntentRequest", function () {
      const handlerInput = {
        requestEnvelope: {
          request: {
            type: "IntentRequest",
            intent: { name: "SomeIntent" },
          },
        },
        responseBuilder: {
          speak: sinon.stub().returnsThis(),
          getResponse: sinon.stub().returns({ response: "test" }),
        },
      };

      IntentReflectorHandler.canHandle(handlerInput).should.be.true();
      IntentReflectorHandler.handle(handlerInput);
      handlerInput.responseBuilder.speak.calledWith("You just triggered SomeIntent").should.be.true();
    });
  });

  describe("SessionEndedRequestHandler", function () {
    it("should handle SessionEndedRequest", function () {
      const handlerInput = {
        requestEnvelope: {
          request: {
            type: "SessionEndedRequest",
          },
        },
        responseBuilder: {
          getResponse: sinon.stub().returns({ response: "test" }),
        },
      };

      SessionEndedRequestHandler.canHandle(handlerInput).should.be.true();
      SessionEndedRequestHandler.handle(handlerInput);
      handlerInput.responseBuilder.getResponse.calledOnce.should.be.true();
    });
  });

  describe("NoIntentHandler", function () {
    it("should handle AMAZON.NoIntent with missedQuestion", function () {
      const handlerInput = {
        requestEnvelope: {
          request: {
            type: "IntentRequest",
            intent: { name: "AMAZON.NoIntent" },
          },
        },
        attributesManager: {
          getSessionAttributes: sinon.stub().returns({ missedQuestion: true }),
        },
        responseBuilder: {
          speak: sinon.stub().returnsThis(),
          withShouldEndSession: sinon.stub().returnsThis(),
          getResponse: sinon.stub().returns({ response: "test" }),
        },
      };

      NoIntentHandler.canHandle(handlerInput).should.be.true();
      NoIntentHandler.handle(handlerInput);
      handlerInput.responseBuilder.speak.calledOnce.should.be.true();
      handlerInput.responseBuilder.withShouldEndSession.calledWith(true).should.be.true();
    });

    it("should not handle AMAZON.NoIntent without missedQuestion", function () {
      const handlerInput = {
        requestEnvelope: {
          request: {
            type: "IntentRequest",
            intent: { name: "AMAZON.NoIntent" },
          },
        },
        attributesManager: {
          getSessionAttributes: sinon.stub().returns({ missedQuestion: false }),
        },
      };

      NoIntentHandler.canHandle(handlerInput).should.be.false();
    });
  });

  describe("GetFreshDataIntentHandler", function () {
    it("should handle GetFreshDataIntent", function () {
      const handlerInput = {
        requestEnvelope: {
          request: {
            type: "IntentRequest",
            intent: { name: "GetFreshDataIntent" },
          },
        },
      };

      GetFreshDataIntentHandler.canHandle(handlerInput).should.be.true();
    });
  });

  describe("slotResolver", function () {
    it("should resolve slot with successful match", function () {
      const slot = {
        value: "blue",
        resolutions: {
          resolutionsPerAuthority: [
            {
              status: { code: "ER_SUCCESS_MATCH" },
              values: [{ value: { name: "BLUE" } }],
            },
          ],
        },
      };

      const result = resolveToCanonicalSlotValue(slot);
      result.should.equal("BLUE");
    });

    it("should return slot value when no resolution", function () {
      const slot = {
        value: "blue",
      };

      const result = resolveToCanonicalSlotValue(slot);
      result.should.equal("blue");
    });

    it("should return slot value when resolution fails", function () {
      const slot = {
        value: "blue",
        resolutions: {
          resolutionsPerAuthority: [
            {
              status: { code: "ER_SUCCESS_NO_MATCH" },
            },
          ],
        },
      };

      const result = resolveToCanonicalSlotValue(slot);
      result.should.equal("blue");
    });
  });
});
