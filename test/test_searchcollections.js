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

require("should");
const {
  getNextCollection,
  getNextCollectionOfType,
} = require("../lambda/searchcollections.js");
const SpeakableDate = require("../lambda/speakabledate.js");

const today = new SpeakableDate().setToMidnight().getTime();
const yesterday = Date.now() - 86400000;

const datedAttributes = {
  collections: [
    {
      date: "1971-09-18T00:00:00Z",
      roundTypes: ["DOMESTIC"],
      slippedCollection: false,
      ordinal: "zeroth",
    },
    {
      date: "2501-09-18T00:00:00Z",
      roundTypes: ["DOMESTIC"],
      slippedCollection: false,
      ordinal: "first",
    },
    {
      date: "2501-09-24T00:00:00Z",
      roundTypes: ["RECYCLE", "ORGANIC"],
      slippedCollection: true,
      ordinal: "second",
    },
    {
      date: "2501-09-27T00:00:00Z",
      roundTypes: ["DOMESTIC"],
      slippedCollection: false,
      ordinal: "third",
    },
  ],
  lastReportedBinTime: 0,
  fetchedOnDate: yesterday,
  currentBinType: null,
  midnightToday: today,
};

const datedAttributes2 = {
  collections: [
    {
      date: "1971-09-18T00:00:00Z",
      roundTypes: ["DOMESTIC"],
      slippedCollection: false,
      ordinal: "zeroth",
    },
    {
      date: "2501-09-18T00:00:00Z",
      roundTypes: ["DOMESTIC"],
      slippedCollection: false,
      ordinal: "first",
    },
    {
      date: "2501-09-24T00:00:00Z",
      roundTypes: ["RECYCLE", "ORGANIC"],
      slippedCollection: true,
      ordinal: "second",
    },
    {
      date: "2501-09-27T00:00:00Z",
      roundTypes: ["DOMESTIC"],
      slippedCollection: false,
      ordinal: "third",
    },
  ],
  lastReportedBinTime: 0,
  fetchedOnDate: yesterday,
  currentBinType: null,
  midnightToday: today,
};

describe("searchcollections", function () {
  describe("getNextCollection()", function () {
    it("returnsFirst", function () {
      let c = getNextCollection(datedAttributes);
      c.ordinal.should.equal("first");
      datedAttributes.lastReportedBinTime = new SpeakableDate(c.date).getTime();
    });
    it("returnsSecond", function () {
      let c = getNextCollection(datedAttributes);
      c.ordinal.should.equal("second");
      datedAttributes.lastReportedBinTime = 0;
    });
  });
  describe("getNextCollectionOfType()", function () {
    it("returnsFirst", function () {
      let c = getNextCollectionOfType(datedAttributes2, "DOMESTIC");
      c.ordinal.should.equal("first");
      datedAttributes2.lastReportedBinTime = new SpeakableDate(
        c.date
      ).getTime();
    });
    it("returnsThird", function () {
      let c = getNextCollectionOfType(datedAttributes2, "DOMESTIC");
      c.ordinal.should.equal("third");
    });
  });
});
