// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const should = require("should");
const SpeakableDate = require("../lambda/speakabledate");
const { MILLISECONDS_PER_DAY } = require("../lambda/constants");
const jan31_a = new SpeakableDate("2020-01-31T00:00:00Z");
const jan31_b = new SpeakableDate("2020-01-31T00:00:00Z");
const feb1 = new SpeakableDate("2020-02-01T00:00:00Z");
const feb1midday = new SpeakableDate("2020-02-01T12:03:45Z");
const today = new SpeakableDate();
today.setHours(6);
const this_afternoon = new SpeakableDate();
this_afternoon.setHours(12, 3);
const tomorrow = new SpeakableDate();
tomorrow.setTime(today.getTime() + MILLISECONDS_PER_DAY);

describe("SpeakableDate", function () {
  describe("isSameDateAs()", function () {
    it("jan31_a == jan31_b", function () {
      jan31_a.isSameDateAs(jan31_b).should.equal(true);
    });
    it("jan31 != feb1", function () {
      jan31_a.isSameDateAs(feb1).should.equal(false);
    });
  });
  describe("clone()", function () {
    it("clone == jan31_a", function () {
      const clone = jan31_a.clone();
      clone.isSameDateAs(jan31_a).should.equal(true);
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
  describe("isThisAfternoon()", function () {
    it("12:03 is the afternoon", function () {
      this_afternoon.isThisAfternoon().should.equal(true);
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
