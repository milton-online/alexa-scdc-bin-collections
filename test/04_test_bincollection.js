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

  /**
   * Property-based tests for _formatColoursSpeech() via getColoursSpeech()
   *
   * Validates: Requirements 1.4
   *
   * These tests generate arrays of bin type strings of varying lengths (1–8)
   * using all ordered combinations of the 4 valid bin types, and assert that
   * the Oxford-comma-free list format holds for every generated input.
   */
  describe("_formatColoursSpeech() — property-based tests", function () {
    const ALL_BIN_TYPES = ["RECYCLE", "DOMESTIC", "ORGANIC", "FOOD"];

    // Map each bin type key to its colour string (mirrors binTypes in bincollection.js)
    const COLOUR_FOR = {
      RECYCLE: "blue",
      DOMESTIC: "black",
      ORGANIC: "green",
      FOOD: "food caddy",
    };

    /**
     * Generate all ordered permutations of `arr` up to length `maxLen`.
     * Returns arrays of length 1 through maxLen, without repeating elements
     * within a single array (each bin type appears at most once per collection).
     */
    function generatePermutations(arr, maxLen) {
      const results = [];

      function build(current, remaining) {
        if (current.length > 0) {
          results.push(current.slice());
        }
        if (current.length === maxLen) return;
        for (let i = 0; i < remaining.length; i++) {
          current.push(remaining[i]);
          build(current, remaining.filter((_, j) => j !== i));
          current.pop();
        }
      }

      build([], arr);
      return results;
    }

    // All permutations of 1–4 bin types (4! = 24 permutations of length 4,
    // plus shorter ones — 64 total test cases)
    const allInputs = generatePermutations(ALL_BIN_TYPES, ALL_BIN_TYPES.length);

    // -------------------------------------------------------------------------
    // Property 1: length === 1 → "<colour> bin" (singular, no "and")
    // -------------------------------------------------------------------------
    describe("Property 1: single bin type → '<colour> bin'", function () {
      const singleInputs = allInputs.filter((a) => a.length === 1);

      singleInputs.forEach((roundTypes) => {
        it(`roundTypes=${JSON.stringify(roundTypes)}`, function () {
          const collection = new BinCollection({ roundTypes });
          const result = collection.getColoursSpeech();
          const expectedColour = COLOUR_FOR[roundTypes[0]];

          result.should.equal(`${expectedColour} bin`);
          result.should.not.containEql(" and ");
        });
      });
    });

    // -------------------------------------------------------------------------
    // Property 2: length === 2 → "<colour1> and <colour2> bins" (no comma)
    // -------------------------------------------------------------------------
    describe("Property 2: two bin types → '<colour1> and <colour2> bins'", function () {
      const pairInputs = allInputs.filter((a) => a.length === 2);

      pairInputs.forEach((roundTypes) => {
        it(`roundTypes=${JSON.stringify(roundTypes)}`, function () {
          const collection = new BinCollection({ roundTypes });
          const result = collection.getColoursSpeech();
          const c0 = COLOUR_FOR[roundTypes[0]];
          const c1 = COLOUR_FOR[roundTypes[1]];

          result.should.equal(`${c0} and ${c1} bins`);
          result.should.not.containEql(",");
        });
      });
    });

    // -------------------------------------------------------------------------
    // Property 3: length >= 3 → comma-separated list with " and " before last,
    //             no Oxford comma, ends with "bins"
    // -------------------------------------------------------------------------
    describe("Property 3: three+ bin types → Oxford-comma-free list ending 'bins'", function () {
      const multiInputs = allInputs.filter((a) => a.length >= 3);

      multiInputs.forEach((roundTypes) => {
        it(`roundTypes=${JSON.stringify(roundTypes)}`, function () {
          const collection = new BinCollection({ roundTypes });
          const result = collection.getColoursSpeech();
          const colours = roundTypes.map((k) => COLOUR_FOR[k]);
          const lastColour = colours[colours.length - 1];
          const otherColours = colours.slice(0, -1);

          // Ends with "bins"
          result.should.endWith("bins");

          // Last two items joined with " and " (no Oxford comma)
          result.should.containEql(` and ${lastColour} bins`);
          result.should.not.containEql(`, and `);

          // All items except the last are comma-separated in order
          const expectedPrefix = otherColours.join(", ");
          result.should.startWith(expectedPrefix);
        });
      });
    });

    // -------------------------------------------------------------------------
    // Property 4: any length >= 1 → result ends with "bin" or "bins"
    // -------------------------------------------------------------------------
    describe("Property 4: any input → result ends with 'bin' or 'bins'", function () {
      allInputs.forEach((roundTypes) => {
        it(`roundTypes=${JSON.stringify(roundTypes)}`, function () {
          const collection = new BinCollection({ roundTypes });
          const result = collection.getColoursSpeech();

          (result.endsWith("bin") || result.endsWith("bins")).should.equal(
            true,
            `Expected "${result}" to end with "bin" or "bins"`
          );
        });
      });
    });

    // -------------------------------------------------------------------------
    // Property 5: any length >= 1 → every input colour appears in the output
    // -------------------------------------------------------------------------
    describe("Property 5: any input → every colour from input appears in output", function () {
      allInputs.forEach((roundTypes) => {
        it(`roundTypes=${JSON.stringify(roundTypes)}`, function () {
          const collection = new BinCollection({ roundTypes });
          const result = collection.getColoursSpeech();

          roundTypes.forEach((binType) => {
            const colour = COLOUR_FOR[binType];
            result.should.containEql(
              colour,
              `Expected "${result}" to contain colour "${colour}" for bin type "${binType}"`
            );
          });
        });
      });
    });
  });
});
