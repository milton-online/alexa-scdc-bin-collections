// Copyright 2020 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

module.exports = class SpeakableDate extends Date {
  clone() {
    return new SpeakableDate(this);
  }

  addDays(days) {
    this.setDate(this.getDate() + days);
    return this;
  }

  setToMidnight() {
    this.setHours(0);
    this.setMinutes(0);
    this.setSeconds(0);
    this.setMilliseconds(0);
    return this;
  }

  isSameDateAs(somedate) {
    return (
      this.getDate() === somedate.getDate() &&
      this.getMonth() === somedate.getMonth() &&
      this.getFullYear() === somedate.getFullYear()
    );
  }

  isToday() {
    const today = new Date();
    return this.isSameDateAs(today);
  }

  isThisAfternoon() {
    return this.getHours() >= 12 && this.isToday();
  }

  isTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.isSameDateAs(tomorrow);
  }

  getDateSpeech() {
    if (this.isToday()) {
      return "today.";
    } else if (this.isTomorrow()) {
      return "tomorrow.";
    } else {
      return `on ${this.toDateString().slice(0, -4)}.`;
    }
  }
};
