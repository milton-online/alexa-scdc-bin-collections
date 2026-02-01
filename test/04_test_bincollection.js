// Copyright 2020-2026 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2020-2026 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";

const should = require("should");
const BinCollection = require("../lambda/bincollection");
const messages = require("../lambda/messages");
const { ONE_DAY } = require("../lambda/constants");


const slippedExample = new BinCollection({
  date: "2020-01-19T00:00:00Z",
  roundTypes: ["ORGANIC"],
  slippedCollection: true,
});

const testdate = new Date("2020-01-19T00:00:00Z");

describe("BinCollection", function () {
  it("constructor", function () {
    slippedExample.date.isSameDateAs(testdate).should.equal(true);
    slippedExample.roundTypes[0].should.equal("ORGANIC");
    slippedExample.slippedCollection.should.equal(true);
  });
  describe("getDateSpeech()", function () {
    it("slipped collection", function () {
      slippedExample
        .getDateSpeech()
        .should.equal(`on Sun Jan 19 .${messages.SLIPPED_COLLECTION}`);
    });
    it("today", function () {
      slippedExample.date.setTime(Date.now());
      slippedExample.slippedCollection = false;
      slippedExample.getDateSpeech().should.startWith(`today.`);
    });
    it("tomorrow", function () {
      slippedExample.date.setTime(Date.now() + ONE_DAY);
      slippedExample.slippedCollection = false;
      slippedExample
        .getDateSpeech()
        .should.equal("tomorrow.  Better get that bin out!");
    });
  });
  describe("getColoursSpeech()", function () {
    it("one bin", function () {
      slippedExample.getColoursSpeech().should.equal("green bin");
    });
    const multipleExample = new BinCollection({
      roundTypes: ["ORGANIC", "RECYCLE"],
    });
    it("two bins", function () {
      multipleExample.getColoursSpeech().should.equal("green and blue bins");
    });
    const tripleExample = new BinCollection({
      roundTypes: ["ORGANIC", "RECYCLE", "DOMESTIC"],
    });
    it("three bins", function () {
      tripleExample
        .getColoursSpeech()
        .should.equal("green, blue and black bins");
    });
    const foodExample = new BinCollection({
      roundTypes: ["FOOD"],
    });
    it("food bin", function () {
      foodExample.getColoursSpeech().should.equal("food caddy bin");
    });
    const fourBinsExample = new BinCollection({
      roundTypes: ["ORGANIC", "RECYCLE", "DOMESTIC", "FOOD"],
    });
    it("four bins", function () {
      fourBinsExample
        .getColoursSpeech()
        .should.equal("green, blue, black and food caddy bins");
    });
  });

  describe("error handling", function () {
    it("should throw error for unknown bin type", function () {
      (() => {
        BinCollection.getBinType("UNKNOWN");
      }).should.throw(Error, { name: "DataError", message: "Unknown bin type: UNKNOWN" });
    });

    it("should throw error when getting colour for unknown bin type", function () {
      const badCollection = new BinCollection({
        date: "2020-01-19T00:00:00Z",
        roundTypes: ["INVALID_TYPE"],
        slippedCollection: false,
      });
      (() => {
        badCollection.getColour();
      }).should.throw(Error, { name: "DataError", message: "Unknown bin type: INVALID_TYPE" });
    });
  });

  describe("image URLs", function () {
    const binTypes = ["RECYCLE", "DOMESTIC", "ORGANIC", "FOOD"];

    binTypes.forEach((binType) => {
      it(`should have valid HTTPS URLs for ${binType}`, function () {
        const collection = new BinCollection({
          date: "2025-01-01T00:00:00Z",
          roundTypes: [binType],
        });

        const smallUrl = collection.getSmallImageUrl();
        const largeUrl = collection.getLargeImageUrl();

        smallUrl.should.startWith("https://");
        largeUrl.should.startWith("https://");
      });
    });
  });
});
