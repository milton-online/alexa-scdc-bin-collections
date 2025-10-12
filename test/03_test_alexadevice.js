// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";

const should = require("should");
const sinon = require("sinon");
const AlexaDevice = require("../lambda/alexadevice");
const DataError = require("../lambda/errors/dataerror");
const {
  TEST_POSTCODE,
  TEST_POSTCODE_NO_SPACE,
} = require("../lambda/constants");


describe("AlexaDevice", function () {
  describe("constructor", function () {
    it("should create an instance", function () {
      const device = new AlexaDevice();
      device.should.be.instanceOf(AlexaDevice);
    });
  });

  describe("getConsentToken()", function () {
    it("should return consent token when present", function () {
      const requestEnvelope = {
        context: {
          System: {
            apiAccessToken: "test-token-123",
          },
        },
      };
      const token = AlexaDevice.getConsentToken(requestEnvelope);
      token.should.equal("test-token-123");
    });

    it("should throw DataError when consent token is missing", function () {
      const requestEnvelope = {
        context: {
          System: {},
        },
      };
      (() => {
        AlexaDevice.getConsentToken(requestEnvelope);
      }).should.throw(DataError);
    });
  });

  describe("callDirectiveService()", function () {
    it("should call directive service with correct parameters", function () {
      const enqueueStub = sinon.stub().resolves();
      const handlerInput = {
        requestEnvelope: {
          request: {
            requestId: "req-123",
          },
          context: {
            System: {
              apiEndpoint: "https://api.example.com",
              apiAccessToken: "token-456",
            },
          },
        },
        serviceClientFactory: {
          getDirectiveServiceClient: () => ({
            enqueue: enqueueStub,
          }),
        },
      };

      AlexaDevice.callDirectiveService(handlerInput, "Test message");

      enqueueStub.calledOnce.should.be.true();
      const directive = enqueueStub.firstCall.args[0];
      directive.header.requestId.should.equal("req-123");
      directive.directive.type.should.equal("VoicePlayer.Speak");
      directive.directive.speech.should.equal("Test message");
    });
  });

  describe("isSameLocationAsDevice()", function () {
    it("should return true for same address", function () {
      const device = new AlexaDevice();
      device.address = {
        addressLine1: "123 Main St",
        postalCode: TEST_POSTCODE,
      };

      const otherDevice = {
        address: {
          addressLine1: "123 main st",
          postalCode: TEST_POSTCODE.toLowerCase(),
        },
      };

      device.isSameLocationAsDevice(otherDevice).should.be.true();
    });

    it("should return false for different address", function () {
      const device = new AlexaDevice();
      device.address = {
        addressLine1: "123 Main St",
        postalCode: TEST_POSTCODE,
      };

      const otherDevice = {
        address: {
          addressLine1: "456 Other St",
          postalCode: TEST_POSTCODE,
        },
      };

      device.isSameLocationAsDevice(otherDevice).should.be.false();
    });

    it("should return false for different postcode", function () {
      const device = new AlexaDevice();
      device.address = {
        addressLine1: "123 Main St",
        postalCode: TEST_POSTCODE,
      };

      const otherDevice = {
        address: {
          addressLine1: "123 Main St",
          postalCode: "CB24 6ZX",
        },
      };

      device.isSameLocationAsDevice(otherDevice).should.be.false();
    });

    it("should return false when this device has no address", function () {
      const device = new AlexaDevice();
      const otherDevice = {
        address: {
          addressLine1: "123 Main St",
          postalCode: TEST_POSTCODE,
        },
      };

      device.isSameLocationAsDevice(otherDevice).should.be.false();
    });

    it("should return false when other device has no address", function () {
      const device = new AlexaDevice();
      device.address = {
        addressLine1: "123 Main St",
        postalCode: TEST_POSTCODE,
      };

      device.isSameLocationAsDevice({}).should.be.false();
    });

    it("should return false when addressLine1 is missing", function () {
      const device = new AlexaDevice();
      device.address = {
        addressLine1: "123 Main St",
        postalCode: TEST_POSTCODE,
      };

      const otherDevice = {
        address: {
          postalCode: TEST_POSTCODE,
        },
      };

      device.isSameLocationAsDevice(otherDevice).should.be.false();
    });

    it("should return false when postalCode is missing", function () {
      const device = new AlexaDevice();
      device.address = {
        addressLine1: "123 Main St",
        postalCode: TEST_POSTCODE,
      };

      const otherDevice = {
        address: {
          addressLine1: "123 Main St",
        },
      };

      device.isSameLocationAsDevice(otherDevice).should.be.false();
    });
  });

  describe("getPostcodeFromAddress()", function () {
    it("should format UK postcode correctly", function () {
      const device = new AlexaDevice();
      device.address = {
        countryCode: "GB",
        postalCode: TEST_POSTCODE,
      };

      device.getPostcodeFromAddress();
      device.postalcode.should.equal(TEST_POSTCODE_NO_SPACE);
    });

    it("should handle US test address", function () {
      const device = new AlexaDevice();
      device.address = {
        countryCode: "US",
        postalCode: "20146",
      };

      device.getPostcodeFromAddress();
      device.postalcode.should.equal(TEST_POSTCODE_NO_SPACE);
    });

    it("should throw DataError when postcode is null", function () {
      const device = new AlexaDevice();
      device.address = {
        postalCode: null,
      };

      (() => {
        device.getPostcodeFromAddress();
      }).should.throw(DataError);
    });

    it("should return this for chaining", function () {
      const device = new AlexaDevice();
      device.address = {
        countryCode: "GB",
        postalCode: TEST_POSTCODE,
      };

      const result = device.getPostcodeFromAddress();
      result.should.equal(device);
    });
  });

  describe("getAddressFromDevice()", function () {
    it("should fetch address successfully", async function () {
      const device = new AlexaDevice();
      const mockAddress = {
        addressLine1: "123 Main St",
        postalCode: TEST_POSTCODE,
      };

      const handlerInput = {
        requestEnvelope: {
          context: {
            System: {
              device: {
                deviceId: "device-123",
              },
            },
          },
        },
        serviceClientFactory: {
          getDeviceAddressServiceClient: () => ({
            getFullAddress: sinon.stub().resolves(mockAddress),
          }),
        },
      };

      const result = await device.getAddressFromDevice(handlerInput);
      result.should.equal(device);
      device.deviceId.should.equal("device-123");
      device.address.should.equal(mockAddress);
    });

    it("should throw DataError when address fetch fails", async function () {
      const device = new AlexaDevice();

      const handlerInput = {
        requestEnvelope: {
          context: {
            System: {
              device: {
                deviceId: "device-123",
              },
            },
          },
        },
        serviceClientFactory: {
          getDeviceAddressServiceClient: () => ({
            getFullAddress: sinon
              .stub()
              .rejects(new Error("Permission denied")),
          }),
        },
      };

      try {
        await device.getAddressFromDevice(handlerInput);
        should.fail("Should have thrown DataError");
      } catch (e) {
        e.should.be.instanceOf(DataError);
        e.message.should.equal("No address from device");
      }
    });
  });
});
