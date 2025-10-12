// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";

const should = require("should");
const nock = require("nock");
const {
  Internal,
  attributesAreStale,
  getFreshSessionData,
  getFreshAttributes,
} = require("../lambda/sessiondata");
const SpeakableDate = require("../lambda/speakabledate");
const {
  ONE_DAY,
  TEST_DEVICE_ID,
  TEST_OTHER_DEVICE_ID,
} = require("../lambda/constants");
const sinon = require("sinon");
const AlexaDevice = require("../lambda/alexadevice");

const today = new SpeakableDate().setToMidnight();
const tomorrow = new SpeakableDate().addDays(1);
const yesterday = Date.now() - ONE_DAY;
const sixdaysago = Date.now() - ONE_DAY * 6;
const amonthago = Date.now() - ONE_DAY * 30;
const DEVICE_ID = TEST_DEVICE_ID;
const OTHER_DEVICE = TEST_OTHER_DEVICE_ID;

const testAddress = {
  addressLine1: "42 Fake Street",
  addressLine2: null,
  addressLine3: null,
  city: "Testville",
  stateOrRegion: null,
  districtOrCounty: null,
  countryCode: "GB",
  postalCode: "TE5 7PC",
};

const TEST_POSTCODE_MOCK = "TE57PC";

const mockalexadevice = sinon.createStubInstance(AlexaDevice);
mockalexadevice.deviceId = DEVICE_ID;
mockalexadevice.address = testAddress;
mockalexadevice.postalcode = TEST_POSTCODE_MOCK;
mockalexadevice.getPostcodeFromAddress.returns(mockalexadevice);
mockalexadevice.isSameLocationAsDevice.returns(true);

const mockOtherDevice = sinon.createStubInstance(AlexaDevice);
mockOtherDevice.deviceId = OTHER_DEVICE;
mockOtherDevice.address = testAddress;
mockOtherDevice.postalcode = TEST_POSTCODE_MOCK;
mockOtherDevice.getPostcodeFromAddress.returns(mockOtherDevice);
mockOtherDevice.isSameLocationAsDevice.returns(true);

const testPostcodeSearchResults = [
  {
    id: "100090161613",
    houseNumber: "42",
    street: "Fake Street",
    town: "Testville",
    postCode: TEST_POSTCODE_MOCK,
  },
];

const mockCollectionsResponse = {
  collections: [
    {
      date: new SpeakableDate().addDays(1).toISOString(),
      roundTypes: ["DOMESTIC"],
      slippedCollection: false,
    },
    {
      date: new SpeakableDate().addDays(8).toISOString(),
      roundTypes: ["RECYCLE"],
      slippedCollection: false,
    },
  ],
};

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
    afterEach(() => nock.cleanAll());

    it("fetching results", async function () {
      nock("https://servicelayer3c.azure-api.net")
        .get(`/wastecalendar/address/search/?postCode=${TEST_POSTCODE_MOCK}`)
        .reply(200, testPostcodeSearchResults);

      results = await Internal.getPostcodeSearchFromSCDCWeb(TEST_POSTCODE_MOCK);
      results.length.should.be.greaterThan(0);
      results[0].should.have.property("id");
    });

    it("should throw DataError when postcode not found", async function () {
      nock("https://servicelayer3c.azure-api.net")
        .get("/wastecalendar/address/search/?postCode=XX99XX")
        .reply(200, []);

      await Internal.getPostcodeSearchFromSCDCWeb(
        "XX99XX"
      ).should.be.rejectedWith({
        name: "DataError",
        message: "SCDC returned no locations for postcode starting XX",
      });
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
        { id: "100090161612", houseNumber: "41" },
        { id: "100090161613", houseNumber: "42" },
        { id: "100090161614", houseNumber: "43" },
      ];
      const results = Internal.getLocationListFromSearchResults(
        searchResults,
        testAddress
      );
      results[0].should.equal("100090161613");
    });
    it("should handle house name without number", function () {
      const searchResults = [
        { id: "100090161612", houseNumber: "41" },
        { id: "100090161613", houseNumber: "42" },
        { id: "100090161614", houseNumber: "43" },
      ];
      const houseNameAddress = {
        addressLine1: "Rose Cottage",
        postalCode: "TE5 7PC",
      };
      const results = Internal.getLocationListFromSearchResults(
        searchResults,
        houseNameAddress
      );
      results.should.be.an.Array();
      results.length.should.equal(3);
      results[0].should.equal("100090161612");
    });
  });
  describe("mockalexadevice.isSameLocationAsDevice()", function () {
    it("otherdevice and mockdevice are same address", function () {
      mockalexadevice.isSameLocationAsDevice(mockOtherDevice).should.be.true;
    });
  });
  describe("alexaDevice.getPostcodeFromAddress()", function () {
    it("withspace", function () {
      mockalexadevice.postalcode.should.equal(TEST_POSTCODE_MOCK);
    });
  });
  describe("Fetching collections", function () {
    afterEach(() => nock.cleanAll());

    it("getLocationListFromSearchResults() with matched address", function () {
      locationList = Internal.getLocationListFromSearchResults(
        testPostcodeSearchResults,
        mockalexadevice.address
      );
      locationList[0].should.equal("100090161613");
    });

    it("getCollectionsFromLocationList()", async function () {
      nock("https://servicelayer3c.azure-api.net")
        .get(/\/wastecalendar\/collection\/search\/.*\?numberOfCollections=12/)
        .reply(200, mockCollectionsResponse);

      const r = await Internal.getCollectionsFromLocationList(locationList);
      r.collections.length.should.be.greaterThan(0);
    });
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
      mockOtherDevice.address.postalCode = "TE5 8AB";
      mockOtherDevice.postalcode = "TE58AB";
      mockOtherDevice.postalcode.should.equal("TE58AB");
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
    it("should return true when all collections are in the past", function () {
      const attrs = {
        ...testAttributes,
        collections: [
          {
            date: today.clone().addDays(-7).toISOString(),
            roundTypes: ["DOMESTIC"],
          },
          {
            date: today.clone().addDays(-1).toISOString(),
            roundTypes: ["RECYCLE"],
          },
        ],
        fetchedOnDate: yesterday,
        alexaDevice: mockalexadevice,
        deviceId: DEVICE_ID,
      };
      attributesAreStale(attrs, mockalexadevice).should.be.true;
    });
    it("should return false when first collection is past but later ones are future", function () {
      const attrs = {
        ...testAttributes,
        collections: [
          {
            date: today.clone().addDays(-1).toISOString(),
            roundTypes: ["DOMESTIC"],
          },
          { date: tomorrow.toISOString(), roundTypes: ["RECYCLE"] },
        ],
        fetchedOnDate: yesterday,
        alexaDevice: mockalexadevice,
        deviceId: DEVICE_ID,
      };
      attributesAreStale(attrs, mockalexadevice).should.be.false;
    });
    it("should return true when device ID differs", function () {
      const attrs = {
        ...testAttributes,
        collections: [
          { date: tomorrow.toISOString(), roundTypes: ["DOMESTIC"] },
        ],
        fetchedOnDate: yesterday,
        alexaDevice: mockalexadevice,
        deviceId: OTHER_DEVICE,
      };
      attributesAreStale(attrs, mockalexadevice).should.be.true;
    });
    it("should return true when data is exactly 7 days old", function () {
      const sevendaysago = Date.now() - ONE_DAY * 7;
      const attrs = {
        ...testAttributes,
        collections: [
          { date: tomorrow.toISOString(), roundTypes: ["DOMESTIC"] },
        ],
        fetchedOnDate: sevendaysago,
        alexaDevice: mockalexadevice,
        deviceId: DEVICE_ID,
      };
      attributesAreStale(attrs, mockalexadevice).should.be.true;
    });
  });
  describe("getFreshSessionData()", function () {
    afterEach(() => nock.cleanAll());

    it("should fetch fresh session data successfully", async function () {
      const mockDevice = new AlexaDevice();
      mockDevice.deviceId = "device-123";
      mockDevice.postalcode = TEST_POSTCODE_MOCK;
      mockDevice.address = {
        addressLine1: "42 Fake Street",
        postalCode: "TE5 7PC",
      };

      nock("https://servicelayer3c.azure-api.net")
        .get(`/wastecalendar/address/search/?postCode=${TEST_POSTCODE_MOCK}`)
        .reply(200, testPostcodeSearchResults);

      nock("https://servicelayer3c.azure-api.net")
        .get(/\/wastecalendar\/collection\/search\/.*\?numberOfCollections=12/)
        .reply(200, mockCollectionsResponse);

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

      const data = await getFreshSessionData(handlerInput, mockDevice);
      data.should.have.property("collections");
      data.should.have.property("deviceId");
      data.deviceId.should.equal("device-123");
      data.should.have.property("fetchedOnDate");
      data.should.have.property("alexaDevice");
    });
  });
  describe("getFreshAttributes()", function () {
    afterEach(() => nock.cleanAll());

    it("should set attributes correctly", async function () {
      const mockDevice = new AlexaDevice();
      mockDevice.deviceId = "device-456";
      mockDevice.postalcode = TEST_POSTCODE_MOCK;
      mockDevice.address = {
        addressLine1: "42 Fake Street",
        postalCode: "TE5 7PC",
      };

      nock("https://servicelayer3c.azure-api.net")
        .get(`/wastecalendar/address/search/?postCode=${TEST_POSTCODE_MOCK}`)
        .reply(200, testPostcodeSearchResults);

      nock("https://servicelayer3c.azure-api.net")
        .get(/\/wastecalendar\/collection\/search\/.*\?numberOfCollections=12/)
        .reply(200, mockCollectionsResponse);

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

      await getFreshAttributes(handlerInput, mockDevice);
      handlerInput.attributesManager.setSessionAttributes.calledOnce.should.be.true();
      handlerInput.attributesManager.setPersistentAttributes.calledOnce.should.be.true();
    });
  });
});
