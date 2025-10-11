// Copyright 2020,2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

module.exports = class SpeakableDate extends Date {
  clone() {
    return new SpeakableDate(this);
  }

  // amazonq-ignore-next-line
  addDays(days) {
    this.setDate(this.getDate() + days);
    return this;
  }

  setToMidnight() {
    return this.setHours(0, 0, 0, 0), this;
  }

  isSameDateAs(somedate) {
    return (
      this.getDate() === somedate.getDate() &&
      this.getMonth() === somedate.getMonth() &&
      this.getFullYear() === somedate.getFullYear()
    );
  }

  isToday() {
    return this.isSameDateAs(new Date());
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
    }
    if (this.isTomorrow()) {
      return "tomorrow.";
    }
    return `on ${this.toDateString().slice(0, -4)}.`;
  }
};
