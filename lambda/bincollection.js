// Copyright 2020,2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const SpeakableDate = require("./speakabledate");
const messages = require("./messages");

const SCDC_MEDIA_BASE_URL = "https://www.scambs.gov.uk/media/";

const binTypes = {
  RECYCLE: {
    colour: "blue",
    name: "recycling",
    smallUrl: SCDC_MEDIA_BASE_URL + "1123/blue_bin_clipart.png",
    largeUrl: SCDC_MEDIA_BASE_URL + "1123/blue_bin_clipart.png",
  },
  DOMESTIC: {
    colour: "black",
    name: "landfill",
    smallUrl: SCDC_MEDIA_BASE_URL + "1122/black_bin.png",
    largeUrl: SCDC_MEDIA_BASE_URL + "1122/black_bin.png",
  },
  ORGANIC: {
    colour: "green",
    name: "compostable",
    smallUrl: SCDC_MEDIA_BASE_URL + "1118/green_bin.png",
    largeUrl: SCDC_MEDIA_BASE_URL + "1118/green_bin.png",
  },
};

module.exports = class BinCollection {
  static getBinType(binType) {
    return binTypes[binType];
  }

  static getColourForBinType(binType) {
    return binTypes[binType].colour;
  }

  static getNameForBinType(binType) {
    return binTypes[binType].name;
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

  getSmallImageUrl() {
    return binTypes[this.roundTypes[0]].smallUrl;
  }

  getLargeImageUrl() {
    return binTypes[this.roundTypes[0]].largeUrl;
  }

  getName() {
    return binTypes[this.roundTypes[0]].name;
  }

  getColour() {
    return binTypes[this.roundTypes[0]].colour;
  }

  getColoursSpeech() {
    let speakOutput;

    const colours = this.roundTypes.map((k) => binTypes[k].colour);

    if (colours.length === 1) {
      speakOutput = `${colours[0]}`;
    } else {
      speakOutput = `${colours.slice(0, -1).join(", ")} and ${
        colours[colours.length - 1]
      }`;
    }
    speakOutput += " bin";
    if (colours.length !== 1) {
      speakOutput += "s";
    }

    return speakOutput;
  }
};
