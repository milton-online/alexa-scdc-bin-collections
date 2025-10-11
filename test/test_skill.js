// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const { AlexaTest, LaunchRequestBuilder, IntentRequestBuilder } = require("ask-sdk-test");
const log = require("loglevel");
const util = require("util");
const messages = require("../lambda/messages");
const SpeakableDate = require("../lambda/speakabledate");
const sinon = require("sinon");
const AlexaDevice = require("../lambda/alexadevice");

("use strict");

const DEVICE_ID = "amzn1.ask.device.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
const USER_ID = "amzn1.ask.account.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

const testAddress = {
  addressLine1: "241 No Such Street",
  addressLine2: null,
  addressLine3: null,
  city: "Some town",
  stateOrRegion: null,
  districtOrCounty: null,
  countryCode: "GB",
  postalCode: "CB24 6ZD",
};

const mockAlexaDevice = {
  deviceId: DEVICE_ID,
  address: testAddress,
  postalcode: "CB246ZD",
  getPostcodeFromAddress: () => mockAlexaDevice,
  isSameLocationAsDevice: () => true,
};

const skillSettings = {
  appId: "amzn1.ask.skill.a9f3e5f3-5a08-4a7a-a0fc-bc828e9787b0",
  userId: USER_ID,
  deviceId: DEVICE_ID,
  locale: "en-GB",
};

const alexaTest = new AlexaTest(require("../lambda/index").handler, skillSettings);

const today = new SpeakableDate();
today.setHours(13, 0);
const yesterday = Date.now() - 86400000;

const datedAttributes = {
  collections: [
    {
      date: "2501-09-18T00:00:00Z",
      roundTypes: ["DOMESTIC"],
      slippedCollection: false,
    },
    {
      date: "2501-09-24T00:00:00Z",
      roundTypes: ["RECYCLE", "ORGANIC"],
      slippedCollection: true,
    },
  ],
  lastReportedBinTime: 0,
  fetchedOnDate: yesterday,
  deviceId: DEVICE_ID,
  alexaDevice: mockAlexaDevice,
  currentBinType: null,
  logLevel: "silent",
};

const todayAttributes = {
  collections: [
    {
      date: today.toISOString(),
      roundTypes: ["DOMESTIC"],
      slippedCollection: false,
    },
    {
      date: today.clone().addDays(7).toISOString(),
      roundTypes: ["RECYCLE", "DOMESTIC"],
      slippedCollection: true,
    },
  ],
  lastReportedBinTime: 0,
  deviceId: DEVICE_ID,
  alexaDevice: mockAlexaDevice,
  fetchedOnDate: yesterday,
  currentBinType: "DOMESTIC",
  logLevel: "silent",
};

const tomorrowAttributes = {
  collections: [
    {
      date: today.clone().addDays(1).toISOString(),
      roundTypes: ["RECYCLE"],
      slippedCollection: false,
    },
  ],
  lastReportedBinTime: 0,
  fetchedOnDate: yesterday,
  deviceId: DEVICE_ID,
  alexaDevice: mockAlexaDevice,
  currentBinType: null,
  logLevel: "silent",
};

describe("Bin Collections Skill", function () {
  beforeEach(function () {
    sinon.stub(AlexaDevice.prototype, "getAddressFromDevice").callsFake(function () {
      this.deviceId = DEVICE_ID;
      this.address = testAddress;
      return Promise.resolve(this);
    });
    sinon.stub(AlexaDevice.prototype, "getPostcodeFromAddress").callsFake(function () {
      this.postalcode = "CB246ZD";
      return this;
    });
    sinon.stub(AlexaDevice.prototype, "isSameLocationAsDevice").returns(true);
  });

  afterEach(function () {
    sinon.restore();
  });

  describe("LaunchRequest", function () {
    alexaTest.test([
      {
        request: new LaunchRequestBuilder(skillSettings).build(),
        says: "Your next collection is the black bin, on Sun Sep 18 .",
        repromptsNothing: true,
        withSessionAttributes: datedAttributes,
        hasAttributes: {
          missedQuestion: false,
          currentBinType: "DOMESTIC",
          lastReportedBinTime: 16779225600000,
        },
      },
    ]);
  });

  describe("LaunchRequest (today)", function () {
    alexaTest.test([
      {
        request: new LaunchRequestBuilder(skillSettings).build(),
        says: `Your next collection is the black bin, today.${messages.DID_YOU_MISS_IT}`,
        shouldEndSession: false,
        hasCardTitle: "Next collection",
        hasCardTextLike: "Your next collection is the black bin, today.",
        hasCardLargeImageUrlLike: "black_bin",
        withSessionAttributes: todayAttributes,
        hasAttributes: {
          missedQuestion: true,
          currentBinType: "DOMESTIC",
          lastReportedBinTime: new SpeakableDate(todayAttributes.collections[0].date).getTime(),
        },
      },
      {
        request: new IntentRequestBuilder(skillSettings, "AMAZON.YesIntent").build(),
        saysLike: "OK then.  The next black landfill collection will be on",
        hasCardTitle: "Next landfill collection",
        hasCardTextLike: "The next black landfill collection will be",
        repromptsNothing: true,
        hasAttributes: {
          missedQuestion: false,
          currentBinType: "DOMESTIC",
          lastReportedBinTime: new SpeakableDate(todayAttributes.collections[1].date).getTime(),
        },
      },
    ]);
  });

  describe("Inappropriate Yes", function () {
    todayAttributes.missedQuestion = false;
    alexaTest.test([
      {
        request: new IntentRequestBuilder(skillSettings, "AMAZON.YesIntent").build(),
        says: messages.NO_QUESTION,
        repromptsNothing: true,
        withSessionAttributes: todayAttributes,
      },
    ]);
  });

  describe("NextColourBinIntent", function () {
    alexaTest.test([
      {
        request: new IntentRequestBuilder(skillSettings, "NextColourBinIntent")
          .withSlot("binType", "RECYCLE")
          .build(),
        says: `Your next blue recycling collection is on Sat Sep 24 .${messages.SLIPPED_COLLECTION}`,
        repromptsNothing: true,
        withSessionAttributes: datedAttributes,
        hasAttributes: {
          missedQuestion: false,
          currentBinType: "RECYCLE",
          lastReportedBinTime: new SpeakableDate(datedAttributes.collections[1].date).getTime(),
        },
      },
    ]);
  });

  describe("NextColourBinIntent (today)", function () {
    todayAttributes.missedQuestion = false;
    todayAttributes.lastReportedBinTime = 0;
    alexaTest.test([
      {
        request: new IntentRequestBuilder(skillSettings, "NextColourBinIntent")
          .withSlot("binType", "DOMESTIC")
          .build(),
        says: `Your next black landfill collection is today.${messages.DID_YOU_MISS_IT}`,
        shouldEndSession: false,
        withSessionAttributes: todayAttributes,
        hasAttributes: {
          missedQuestion: true,
          currentBinType: "DOMESTIC",
          lastReportedBinTime: new SpeakableDate(todayAttributes.collections[0].date).getTime(),
        },
      },
      {
        request: new IntentRequestBuilder(skillSettings, "AMAZON.YesIntent").build(),
        saysLike: "OK then.  The next black landfill collection will be on",
        hasCardTitle: "Next landfill collection",
        hasCardTextLike: "The next black landfill collection will be",
        repromptsNothing: true,
        hasAttributes: {
          missedQuestion: false,
          currentBinType: "DOMESTIC",
          lastReportedBinTime: new SpeakableDate(todayAttributes.collections[1].date).getTime(),
        },
      },
    ]);
  });

  describe("WhichBinTodayIntent (today)", function () {
    alexaTest.test([
      {
        request: new IntentRequestBuilder(skillSettings, "WhichBinTodayIntent").build(),
        says: "Today's bin collection is the black bin",
        repromptsNothing: true,
        withSessionAttributes: todayAttributes,
      },
    ]);
  });

  describe("WhichBinTodayIntent (tomorrow)", function () {
    alexaTest.test([
      {
        request: new IntentRequestBuilder(skillSettings, "WhichBinTodayIntent").build(),
        says: "There is no bin collection due today.  But there is tomorrow.  It's the blue bin",
        hasCardTitle: "Collection tomorrow",
        hasCardText: "There is no bin collection due today.  But there is tomorrow.  It's the blue bin",
        hasCardLargeImageUrlLike: "blue_bin_clipart",
        repromptsNothing: true,
        withSessionAttributes: tomorrowAttributes,
      },
    ]);
  });

  describe("WhoPutTheBinsOutIntent", function () {
    alexaTest.test([
      {
        request: new IntentRequestBuilder(skillSettings, "WhoPutTheBinsOutIntent").build(),
        says: messages.WHOWHOWHO,
        repromptsNothing: true,
        withSessionAttributes: {
          deviceId: DEVICE_ID,
          alexaDevice: mockAlexaDevice,
          collections: [
            {
              date: today.clone().addDays(1).toISOString(),
              roundTypes: ["RECYCLE"],
              slippedCollection: false,
            },
          ],
          fetchedOnDate: yesterday,
          lastReportedBinTime: 0,
          currentBinType: null,
        },
      },
    ]);
  });

  describe("SetLogLevelIntent", function () {
    ["trace", "debug", "info", "warn", "error", "silent"].forEach(function (testLevel) {
      alexaTest.test([
        {
          request: new IntentRequestBuilder(skillSettings, "SetLogLevelIntent")
            .withSlot("logLevel", testLevel)
            .build(),
          says: util.format(messages.LOGGING, testLevel),
          hasCardTitle: "Bin Collections Log Level",
          hasCardContent: util.format(messages.LOGGING_CARD, testLevel),
          repromptsNothing: true,
          withSessionAttributes: { ...tomorrowAttributes, logLevel: "silent" },
          hasAttributes: {
            logLevel: testLevel,
          },
        },
      ]);
    });
  });
});
