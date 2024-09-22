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
    } else if (this.isToday()) {
      speech += messages.DID_YOU_MISS_IT;
    }
    return speech;
  }

  isToday() {
    return this.date.isToday();
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
