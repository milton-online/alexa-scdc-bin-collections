/* Copyright 2020 Tim Cutts <tim@thecutts.org>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

const should = require("should");
const { Internal, attributesAreStale } = require("../lambda/sessiondata.js");
const SpeakableDate = require("../lambda/speakabledate.js");
const MockAlexaDevice = require("./mockalexadevice.js");

("use strict");

const today = new SpeakableDate().setToMidnight();
const tomorrow = new SpeakableDate().addDays(1);
const yesterday = Date.now() - 86400000;
const amonthago = Date.now() - 86400000 * 30;
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
      date: today.addDays(7).toISOString(),
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
    it.skip("getCollectionsFromLocationList()", async function () {
      let r = await Internal.getCollectionsFromLocationList(locationList);
      r.collections.length.should.be.greaterThan(0);
    });
  });
  describe("attributesAreStale()", function () {
    it("Data fetched yesterday, collection today", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.true;
    });
    testAttributes.collections[0].date = today.addDays(-7).toISOString();
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
    testAttributes.missedQuestion = true;
    it("Old data with missed question flag set", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.true;
    });
  });
});
