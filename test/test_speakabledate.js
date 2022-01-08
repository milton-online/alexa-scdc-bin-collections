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
const SpeakableDate = require("../lambda/speakabledate");
const jan31_a = new SpeakableDate("2020-01-31T00:00:00Z");
const jan31_b = new SpeakableDate("2020-01-31T00:00:00Z");
const feb1 = new SpeakableDate("2020-02-01T00:00:00Z");
const feb1midday = new SpeakableDate("2020-02-01T12:03:45Z");
const today = new SpeakableDate();
const tomorrow = new SpeakableDate();
tomorrow.setTime(today.getTime() + 86400000);

describe("SpeakableDate", function () {
  describe("isSameDateAs()", function () {
    it("jan31_a == jan31_b", function () {
      jan31_a.isSameDateAs(jan31_b).should.equal(true);
    });
    it("jan31 != feb1", function () {
      jan31_a.isSameDateAs(feb1).should.equal(false);
    });
  });
  describe("setToMidnight()", function () {
    it("correctly sets midnight", function () {
      feb1.getTime().should.equal(feb1midday.setToMidnight().getTime());
    });
  });
  describe("isToday() and isTomorrow()", function () {
    it("today is today", function () {
      today.isToday().should.equal(true);
    });
    it("today is not tomorrow", function () {
      today.isTomorrow().should.equal(false);
    });
    it("tomorrow is tomorrow", function () {
      tomorrow.isTomorrow().should.equal(true);
    });
    it("tomorrow is not today", function () {
      tomorrow.isToday().should.equal(false);
    });
  });
  describe("getDateSpeech()", function () {
    it("tomorrow", function () {
      tomorrow.getDateSpeech().should.equal("tomorrow.");
    });
    it("today", function () {
      today.getDateSpeech().should.equal("today.");
    });
    it("2020-01-31T00:00:00Z", function () {
      jan31_a.getDateSpeech().should.equal("on Fri Jan 31 .");
    });
  });
  describe("addDays()", function () {
    it("2020-01-31T00:00:00Z + 1 day", function () {
      jan31_a.addDays(1).getDateSpeech().should.equal("on Sat Feb 01 .");
    });
    it("2020-02-01T00:00:00Z - 1 day", function () {
      feb1.addDays(-1).getDateSpeech().should.equal("on Fri Jan 31 .");
    });
  });
});
