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
  addressLine1: "241 The Made Up Street",
  addressLine2: null,
  addressLine3: null,
  city: "Some town",
  stateOrRegion: null,
  districtOrCounty: null,
  countryCode: "GB",
  postalCode: "CB24 6ZD",
};

const testPostcodeSearchResults = [
  {
    id: "100090161613",
    houseNumber: "241",
    street: "The Made Up Street",
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
  currentBinType: "DOMESTIC",
};

describe("sessiondata", function () {
  let results;
  let locationList;
  describe("getPostcodeSearchFromSCDCWeb()", function () {
    this.slow(5000);
    it("fetching results - might fail if SCDC web is down", async function () {
      results = await Internal().getPostcodeSearchFromSCDCWeb("CB246ZD");
      results.length.should.be.greaterThan(0);
      results[0].should.have.property("id");
    });
  });
  describe("getPostcodeFromAddress()", function () {
    it("withspace", function () {
      Internal().getPostcodeFromAddress(testAddress).should.equal("CB246ZD");
    });
  });
  describe("Fetching collections", function () {
    it("getLocationListFromSearchResults()", function () {
      locationList = Internal().getLocationListFromSearchResults(
        testPostcodeSearchResults,
        testAddress
      );
      locationList[0].should.equal("100090161613");
    });
    it.skip("getCollectionsFromLocationList()", async function () {
      let r = await Internal().getCollectionsFromLocationList(locationList);
      r.collections.length.should.be.greaterThan(0);
    });
  });
  describe("attributesAreStale()", function () {
    it("Data fetched yesterday, collection today", function () {
      attributesAreStale(testAttributes, DEVICE_ID).should.be.true;
    });
    testAttributes.collections[0].date = today.addDays(-7).toISOString();
    it("data fetched yesterday, collection in the past", function () {
      attributesAreStale(testAttributes, DEVICE_ID).should.be.true;
    });
    testAttributes.collections[0].date = tomorrow.toISOString();
    it("data fetched yesterday, collection tomorrow", function () {
      attributesAreStale(testAttributes, DEVICE_ID).should.be.false;
    });
    it("Data fresh but for different device", function () {
      attributesAreStale(testAttributes, OTHER_DEVICE).should.be.true;
    });
    testAttributes.fetchedOnDate = amonthago;
    it("Data more than a week old", function () {
      attributesAreStale(testAttributes, DEVICE_ID).should.be.true;
    });
    testAttributes.missedQuestion = true;
    it("Old data with missed question flag set", function () {
      attributesAreStale(testAttributes, DEVICE_ID).should.be.true;
    });
  });
});
