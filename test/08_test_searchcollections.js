// Copyright 2020,2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const should = require("should");
const {
  getNextCollection,
  getNextCollectionOfType,
} = require("../lambda/searchcollections");
const SpeakableDate = require("../lambda/speakabledate");
const { ONE_DAY } = require("../lambda/constants");

const today = new SpeakableDate().setToMidnight().getTime();
const yesterday = Date.now() - ONE_DAY;

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
