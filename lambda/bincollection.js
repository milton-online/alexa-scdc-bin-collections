// Copyright 2020,2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const SpeakableDate = require("./speakabledate");
const messages = require("./messages");
const { IMAGES_BASE_URL } = require("./constants");

const binTypes = {
  RECYCLE: {
    colour: "blue",
    name: "recycling",
    smallUrl: `${IMAGES_BASE_URL}blue_small.png`,
    largeUrl: `${IMAGES_BASE_URL}blue_large.png`,
  },
  DOMESTIC: {
    colour: "black",
    name: "landfill",
    smallUrl: `${IMAGES_BASE_URL}black_small.png`,
    largeUrl: `${IMAGES_BASE_URL}black_large.png`,
  },
  ORGANIC: {
    colour: "green",
    name: "compostable",
    smallUrl: `${IMAGES_BASE_URL}green_small.png`,
    largeUrl: `${IMAGES_BASE_URL}green_large.png`,
  },
};

module.exports = class BinCollection {
  static getBinType(binType) {
    if (!binTypes[binType]) {
      throw new Error(`Unknown bin type: ${binType}`);
    }
    return binTypes[binType];
  }

  static getColourForBinType(binType) {
    const type = this.getBinType(binType);
    return type.colour;
  }

  static getNameForBinType(binType) {
    const type = this.getBinType(binType);
    return type.name;
  }

  constructor(jsondata) {
    this.slippedCollection = false;
    // { date: '2020-01-19T00:00:00Z', roundTypes: [ 'ORGANIC' ], slippedCollection: true }
    Object.assign(this, jsondata);
    this.date = new SpeakableDate(this.date);
  }

  getDateSpeech() {
    let speech = this.date.getDateSpeech();
    if (this.slippedCollection) {
      speech += messages.SLIPPED_COLLECTION;
    }
    if (this.isTomorrow()) {
      speech += "  Better get ";
      speech +=
        this.roundTypes.length > 1 ? "those bins out!" : "that bin out!";
    } else if (this.isThisAfternoon()) {
      speech += messages.DID_YOU_MISS_IT;
    }
    return speech;
  }

  isToday() {
    return this.date.isToday();
  }

  isThisAfternoon() {
    return this.date.isThisAfternoon();
  }

  isTomorrow() {
    return this.date.isTomorrow();
  }

  _getFirstBinType() {
    if (!this._cachedFirstType) {
      this._cachedFirstType = BinCollection.getBinType(this.roundTypes[0]);
    }
    return this._cachedFirstType;
  }

  getSmallImageUrl() {
    return this._getFirstBinType().smallUrl;
  }

  getLargeImageUrl() {
    return this._getFirstBinType().largeUrl;
  }

  getName() {
    return this._getFirstBinType().name;
  }

  getColour() {
    return this._getFirstBinType().colour;
  }

  getColoursSpeech() {
    const colours = this.roundTypes.map(
      (k) => BinCollection.getBinType(k).colour
    );

    if (colours.length === 1) {
      return `${colours[0]} bin`;
    }

    const lastColour = colours.at(-1);
    const otherColours = colours.slice(0, -1).join(", ");
    return `${otherColours} and ${lastColour} bins`;
  }
};
