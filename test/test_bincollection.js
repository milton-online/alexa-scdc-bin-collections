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
const BinCollection = require("../lambda/bincollection.js");
const messages = require("../lambda/messages.js");

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
            slippedExample
                .getDateSpeech()
                .should.equal(`today.${messages.DID_YOU_MISS_IT}`);
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
            multipleExample
                .getColoursSpeech()
                .should.equal("green and blue bins");
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
