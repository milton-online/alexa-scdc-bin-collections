// Copyright 2020,2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const should = require("should");
const BinCollection = require("../lambda/bincollection");
const messages = require("../lambda/messages");

("use strict");

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
      slippedExample.date.setTime(Date.now() + 86400000);
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
  });
});
