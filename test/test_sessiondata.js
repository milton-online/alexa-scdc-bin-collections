// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const should = require("should");
const process = require("process");
const { Internal, attributesAreStale } = require("../lambda/sessiondata");
const BinCollection = require("../lambda/bincollection");
const SpeakableDate = require("../lambda/speakabledate");
const MockAlexaDevice = require("./mockalexadevice");

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

const mockalexadevice = new MockAlexaDevice(DEVICE_ID, testAddress);
mockalexadevice.getPostcodeFromAddress();
const mockOtherDevice = new MockAlexaDevice(OTHER_DEVICE, testAddress);
mockOtherDevice.getPostcodeFromAddress();

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
    it("getLocationListFromSearchResults()", function () {
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
      mockOtherDevice.getPostcodeFromAddress();
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
  });
});
