// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const should = require("should");
const process = require("process");
const { Internal, attributesAreStale, getFreshSessionData, getFreshAttributes } = require("../lambda/sessiondata");
const BinCollection = require("../lambda/bincollection");
const SpeakableDate = require("../lambda/speakabledate");
const sinon = require("sinon");
const AlexaDevice = require("../lambda/alexadevice");
const DataError = require("../lambda/errors/dataerror");

("use strict");

const today = new SpeakableDate().setToMidnight();
const tomorrow = new SpeakableDate().addDays(1);
const MILLISCONDS_PER_DAY = 86400000;
const yesterday = Date.now() - MILLISCONDS_PER_DAY;
const sixdaysago = Date.now() - MILLISCONDS_PER_DAY * 6;
const amonthago = Date.now() - MILLISCONDS_PER_DAY * 30;
const DEVICE_ID =
  "amzn1.ask.device.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
const OTHER_DEVICE =
  "amzn1.ask.device.1111111111111111111111111111111100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

const testAddress = {
  addressLine1: "241 No Such Street",
  addressLine2: null,
  addressLine3: null,
  city: "Some town",
  stateOrRegion: null,
  districtOrCounty: null,
  countryCode: "GB",
  postalCode: "CB24 6ZD",
};

const mockalexadevice = sinon.createStubInstance(AlexaDevice);
mockalexadevice.deviceId = DEVICE_ID;
mockalexadevice.address = testAddress;
mockalexadevice.postalcode = "CB246ZD";
mockalexadevice.getPostcodeFromAddress.returns(mockalexadevice);
mockalexadevice.isSameLocationAsDevice.returns(true);

const mockOtherDevice = sinon.createStubInstance(AlexaDevice);
mockOtherDevice.deviceId = OTHER_DEVICE;
mockOtherDevice.address = testAddress;
mockOtherDevice.postalcode = "CB246ZD";
mockOtherDevice.getPostcodeFromAddress.returns(mockOtherDevice);
mockOtherDevice.isSameLocationAsDevice.returns(true);

const testPostcodeSearchResults = [
  {
    id: "100090161613",
    houseNumber: "241",
    street: "No Such Street",
    town: "Sometown",
    postCode: "CB246ZD",
  },
];

const testAttributes = {
  collections: [
    {
      date: today.toISOString(),
      roundTypes: ["DOMESTIC"],
      slippedCollection: false,
    },
    {
      date: today.clone().addDays(7).toISOString(),
      roundTypes: ["RECYCLE", "DOMESTIC"],
      slippedCollection: true,
    },
  ],
  lastReportedBinTime: 0,
  missedQuestion: false,
  deviceId: DEVICE_ID,
  fetchedOnDate: yesterday,
  alexaDevice: mockalexadevice,
  currentBinType: "DOMESTIC",
};

describe("sessiondata", function () {
  let results;
  let locationList;
  describe("getPostcodeSearchFromSCDCWeb()", function () {
    this.slow(5000);
    it("fetching results - might fail if SCDC web is down", async function () {
      results = await Internal.getPostcodeSearchFromSCDCWeb("CB246ZD");
      results.length.should.be.greaterThan(0);
      results[0].should.have.property("id");
    });
  });
  describe("getLocationListFromSearchResults()", function () {
    it("should handle address without addressLine1", function () {
      const results = Internal.getLocationListFromSearchResults(
        testPostcodeSearchResults,
        {}
      );
      results.should.be.an.Array();
      results.length.should.equal(1);
    });
    it("should put matched address first", function () {
      const searchResults = [
        { id: "100090161612", houseNumber: "240" },
        { id: "100090161613", houseNumber: "241" },
        { id: "100090161614", houseNumber: "242" },
      ];
      const results = Internal.getLocationListFromSearchResults(
        searchResults,
        testAddress
      );
      results[0].should.equal("100090161613");
    });
  });
  describe("mockalexadevice.isSameLocationAsDevice()", function () {
    it("otherdevice and mockdevice are same address", function () {
      mockalexadevice.isSameLocationAsDevice(mockOtherDevice).should.be.true;
    });
  });
  describe("alexaDevice.getPostcodeFromAddress()", function () {
    it("withspace", function () {
      mockalexadevice.postalcode.should.equal("CB246ZD");
    });
  });
  describe("Fetching collections", function () {
    it("getLocationListFromSearchResults() with matched address", function () {
      locationList = Internal.getLocationListFromSearchResults(
        testPostcodeSearchResults,
        mockalexadevice.address
      );
      locationList[0].should.equal("100090161613");
    });
    // Debugging comms with the SCDC API only makes sense during interactive
    // coding, and shouldn't be attempted in other contexts
    if (process.env.DEBUG_SCDC === "1") {
      it("getCollectionsFromLocationList()", async function () {
        let r = await Internal.getCollectionsFromLocationList(locationList);
        r.collections.length.should.be.greaterThan(0);
        //const bc = new BinCollection(r.collections[0]);
        //if (!bc.slippedCollection) {
        //  bc.date.getDay().should.equal(5); // Friday
        //}
      });
    }
  });
  describe("attributesAreStale()", function () {
    it("Data fetched yesterday, collection today", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.true;
    });
    testAttributes.collections[0].date = today
      .clone()
      .addDays(-7)
      .toISOString();
    it("data fetched yesterday, collection in the past", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.true;
    });
    testAttributes.collections[0].date = tomorrow.toISOString();
    it("data fetched yesterday, collection tomorrow", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.false;
    });
    it("Data fresh but for different device, same address", function () {
      attributesAreStale(testAttributes, mockOtherDevice).should.be.false;
    });
    it("Data fresh but from device with different postcode", function () {
      mockOtherDevice.address.postalCode = "CB24 6ZX";
      mockOtherDevice.postalcode = "CB246ZX";
      mockOtherDevice.postalcode.should.equal("CB246ZX");
      attributesAreStale(testAttributes, mockOtherDevice).should.be.true;
    });
    testAttributes.fetchedOnDate = amonthago;
    it("Data more than a week old", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.true;
    });
    testAttributes.fetchedOnDate = sixdaysago;
    it("Data six days old", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.false;
    });
    testAttributes.missedQuestion = true;
    it("Old data with missed question flag set", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.true;
    });
    it("should return true when no collections", function () {
      const attrs = { ...testAttributes };
      delete attrs.collections;
      attributesAreStale(attrs, mockalexadevice).should.be.true;
    });
    it("should handle undefined alexaDevice", function () {
      const attrs = {
        ...testAttributes,
        collections: [{ date: tomorrow.toISOString() }],
        fetchedOnDate: Date.now(),
        alexaDevice: undefined,
      };
      attributesAreStale(attrs, mockalexadevice).should.be.true;
    });
  });
  describe("getFreshSessionData()", function () {
    it("should fetch fresh session data successfully", async function () {
      const mockDevice = new AlexaDevice();
      mockDevice.deviceId = "device-123";
      mockDevice.postalcode = "CB246ZD";
      mockDevice.address = {
        addressLine1: "241 No Such Street",
        postalCode: "CB24 6ZD",
      };

      const handlerInput = {
        requestEnvelope: {
          request: { requestId: "req-123" },
          context: {
            System: {
              apiEndpoint: "https://api.example.com",
              apiAccessToken: "token-123",
              device: { deviceId: "device-123" },
            },
          },
        },
        serviceClientFactory: {
          getDirectiveServiceClient: () => ({
            enqueue: sinon.stub().resolves(),
          }),
        },
      };

      this.timeout(10000);
      try {
        const data = await getFreshSessionData(handlerInput, mockDevice);
        data.should.have.property("collections");
        data.should.have.property("deviceId");
        data.deviceId.should.equal("device-123");
        data.should.have.property("fetchedOnDate");
        data.should.have.property("alexaDevice");
      } catch (e) {
        if (e instanceof DataError) {
          console.log("SCDC API unavailable, skipping test");
        } else {
          throw e;
        }
      }
    });
  });
  describe("getFreshAttributes()", function () {
    it("should set attributes correctly", async function () {
      const mockDevice = new AlexaDevice();
      mockDevice.deviceId = "device-456";
      mockDevice.postalcode = "CB246ZD";
      mockDevice.address = {
        addressLine1: "241 No Such Street",
        postalCode: "CB24 6ZD",
      };

      const handlerInput = {
        requestEnvelope: {
          request: { requestId: "req-456" },
          context: {
            System: {
              apiEndpoint: "https://api.example.com",
              apiAccessToken: "token-456",
              device: { deviceId: "device-456" },
            },
          },
        },
        serviceClientFactory: {
          getDirectiveServiceClient: () => ({
            enqueue: sinon.stub().resolves(),
          }),
        },
        attributesManager: {
          setSessionAttributes: sinon.stub(),
          setPersistentAttributes: sinon.stub(),
        },
      };

      this.timeout(10000);
      try {
        await getFreshAttributes(handlerInput, mockDevice);
        handlerInput.attributesManager.setSessionAttributes.calledOnce.should.be.true();
        handlerInput.attributesManager.setPersistentAttributes.calledOnce.should.be.true();
      } catch (e) {
        if (e instanceof DataError) {
          console.log("SCDC API unavailable, skipping test");
        } else {
          throw e;
        }
      }
    });
  });
});
