// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";

const {
  AlexaTest,
  LaunchRequestBuilder,
  IntentRequestBuilder,
} = require("ask-sdk-test");

const nock = require("nock");
const log = require("loglevel");
const util = require("util");
const sinon = require("sinon");
const AlexaDevice = require("../lambda/alexadevice");
const messages = require("../lambda/messages");
const SpeakableDate = require("../lambda/speakabledate");

const {
  ONE_DAY,
  CACHE_TTL,
  TEST_POSTCODE,
  TEST_POSTCODE_NO_SPACE,
  TEST_DEVICE_ID,
  TEST_USER_ID,
  TEST_SKILL_ID,
  TEST_ADDRESS_LINE1,
} = require("../lambda/constants");

const testAddress = {
  addressLine1: TEST_ADDRESS_LINE1,
  addressLine2: null,
  addressLine3: null,
  city: "Some town",
  stateOrRegion: null,
  districtOrCounty: null,
  countryCode: "GB",
  postalCode: TEST_POSTCODE,
};

const mockAlexaDevice = {
  deviceId: TEST_DEVICE_ID,
  address: testAddress,
  postalcode: TEST_POSTCODE_NO_SPACE,
  getPostcodeFromAddress: () => mockAlexaDevice,
  isSameLocationAsDevice: () => true,
};

const skillSettings = {
  appId: TEST_SKILL_ID,
  userId: TEST_USER_ID,
  deviceId: TEST_DEVICE_ID,
  locale: "en-GB",
};

const alexaTest = new AlexaTest(
  require("../lambda/index").handler,
  skillSettings
);

const today = new SpeakableDate();
today.setHours(13, 0);
const yesterday = Date.now() - ONE_DAY;

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
  deviceId: TEST_DEVICE_ID,
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
  deviceId: TEST_DEVICE_ID,
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
  deviceId: TEST_DEVICE_ID,
  alexaDevice: mockAlexaDevice,
  currentBinType: null,
  logLevel: "silent",
};

describe("Bin Collections Skill", function () {
  beforeEach(function () {
    sinon
      .stub(AlexaDevice.prototype, "getAddressFromDevice")
      .callsFake(function () {
        this.deviceId = TEST_DEVICE_ID;
        this.address = testAddress;
        return Promise.resolve(this);
      });
    sinon
      .stub(AlexaDevice.prototype, "getPostcodeFromAddress")
      .callsFake(function () {
        this.postalcode = TEST_POSTCODE_NO_SPACE;
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
        description: "should announce next collection with fresh data",
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

  describe("LaunchRequest (stale data)", function () {
    const staleAttributes = {
      collections: [
        {
          date: "2501-09-18T00:00:00Z",
          roundTypes: ["DOMESTIC"],
          slippedCollection: false,
        },
      ],
      lastReportedBinTime: 0,
      fetchedOnDate: Date.now() - (CACHE_TTL.COLLECTIONS + ONE_DAY),
      deviceId: TEST_DEVICE_ID,
      alexaDevice: mockAlexaDevice,
      currentBinType: null,
      logLevel: "silent",
    };

    beforeEach(() => {
      nock("https://servicelayer3c.azure-api.net")
        .get(/\/wastecalendar\/address\/search\/\?postCode=.*/)
        .reply(200, [{ id: "100090161613", houseNumber: "42" }]);
      nock("https://servicelayer3c.azure-api.net")
        .get(/\/wastecalendar\/collection\/search\/.*\?numberOfCollections=12/)
        .reply(200, {
          collections: [
            {
              date: "2501-09-20T00:00:00Z",
              roundTypes: ["RECYCLE"],
              slippedCollection: false,
            },
          ],
        });
    });

    afterEach(() => {
      nock.cleanAll();
    });

    alexaTest.test([
      {
        description: "should fetch fresh data when stale",
        request: new LaunchRequestBuilder(skillSettings).build(),
        saysLike: "Your next collection is the blue",
        repromptsNothing: true,
        withSessionAttributes: staleAttributes,
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
          lastReportedBinTime: new SpeakableDate(
            todayAttributes.collections[0].date
          ).getTime(),
        },
      },
      {
        request: new IntentRequestBuilder(
          skillSettings,
          "AMAZON.YesIntent"
        ).build(),
        saysLike: "OK then.  The next black landfill collection will be on",
        hasCardTitle: "Next landfill collection",
        hasCardTextLike: "The next black landfill collection will be",
        repromptsNothing: true,
        hasAttributes: {
          missedQuestion: false,
          currentBinType: "DOMESTIC",
          lastReportedBinTime: new SpeakableDate(
            todayAttributes.collections[1].date
          ).getTime(),
        },
      },
    ]);
  });

  describe("Inappropriate Yes", function () {
    todayAttributes.missedQuestion = false;
    alexaTest.test([
      {
        request: new IntentRequestBuilder(
          skillSettings,
          "AMAZON.YesIntent"
        ).build(),
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
          lastReportedBinTime: new SpeakableDate(
            datedAttributes.collections[1].date
          ).getTime(),
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
          lastReportedBinTime: new SpeakableDate(
            todayAttributes.collections[0].date
          ).getTime(),
        },
      },
      {
        request: new IntentRequestBuilder(
          skillSettings,
          "AMAZON.YesIntent"
        ).build(),
        saysLike: "OK then.  The next black landfill collection will be on",
        hasCardTitle: "Next landfill collection",
        hasCardTextLike: "The next black landfill collection will be",
        repromptsNothing: true,
        hasAttributes: {
          missedQuestion: false,
          currentBinType: "DOMESTIC",
          lastReportedBinTime: new SpeakableDate(
            todayAttributes.collections[1].date
          ).getTime(),
        },
      },
    ]);
  });

  describe("WhichBinTodayIntent (today)", function () {
    alexaTest.test([
      {
        request: new IntentRequestBuilder(
          skillSettings,
          "WhichBinTodayIntent"
        ).build(),
        says: "Today's bin collection is the black bin",
        repromptsNothing: true,
        withSessionAttributes: todayAttributes,
      },
    ]);
  });

  describe("WhichBinTodayIntent (tomorrow)", function () {
    alexaTest.test([
      {
        request: new IntentRequestBuilder(
          skillSettings,
          "WhichBinTodayIntent"
        ).build(),
        says: "There is no bin collection due today.  But there is tomorrow.  It's the blue bin",
        hasCardTitle: "Collection tomorrow",
        hasCardText:
          "There is no bin collection due today.  But there is tomorrow.  It's the blue bin",
        hasCardLargeImageUrlLike: "blue_bin_clipart",
        repromptsNothing: true,
        withSessionAttributes: tomorrowAttributes,
      },
    ]);
  });

  describe("WhoPutTheBinsOutIntent", function () {
    alexaTest.test([
      {
        request: new IntentRequestBuilder(
          skillSettings,
          "WhoPutTheBinsOutIntent"
        ).build(),
        says: messages.WHOWHOWHO,
        repromptsNothing: true,
        withSessionAttributes: {
          deviceId: TEST_DEVICE_ID,
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

  describe("GetFreshDataIntent", function () {
    beforeEach(() => {
      nock("https://servicelayer3c.azure-api.net")
        .get(/\/wastecalendar\/address\/search\/\?postCode=.*/)
        .reply(200, [{ id: "100090161613", houseNumber: "42" }]);
      nock("https://servicelayer3c.azure-api.net")
        .get(/\/wastecalendar\/collection\/search\/.*\?numberOfCollections=12/)
        .reply(200, {
          collections: [
            {
              date: today.clone().addDays(1).toISOString(),
              roundTypes: ["DOMESTIC"],
              slippedCollection: false,
            },
          ],
        });
    });

    afterEach(() => {
      nock.cleanAll();
    });

    alexaTest.test([
      {
        description: "should fetch fresh data and confirm",
        request: new IntentRequestBuilder(
          skillSettings,
          "GetFreshDataIntent"
        ).build(),
        saysLike: "I'm up to date with the council",
        shouldEndSession: false,
        withSessionAttributes: datedAttributes,
      },
    ]);
  });

  describe("WhichBinTodayIntent (no collection)", function () {
    const noCollectionAttributes = {
      collections: [
        {
          date: today.clone().addDays(3).toISOString(),
          roundTypes: ["DOMESTIC"],
          slippedCollection: false,
        },
      ],
      lastReportedBinTime: 0,
      fetchedOnDate: yesterday,
      deviceId: TEST_DEVICE_ID,
      alexaDevice: mockAlexaDevice,
      currentBinType: null,
      logLevel: "silent",
    };
    alexaTest.test([
      {
        description: "should report no collection today or tomorrow",
        request: new IntentRequestBuilder(
          skillSettings,
          "WhichBinTodayIntent"
        ).build(),
        says: "There is no bin collection due today.",
        hasCardTitle: "No collection today",
        repromptsNothing: true,
        withSessionAttributes: noCollectionAttributes,
      },
    ]);
  });

  describe("SetLogLevelIntent", function () {
    alexaTest.test([
      {
        request: new IntentRequestBuilder(skillSettings, "SetLogLevelIntent")
          .withSlot("logLevel", "invalid")
          .build(),
        hasCardTitle: "Bin Collections Log Level",
        repromptsNothing: true,
        withSessionAttributes: tomorrowAttributes,
        hasAttributes: {
          logLevel: "warn",
        },
      },
    ]);

    ["warn", "error", "silent"].forEach(function (testLevel) {
      beforeEach(() => {
        log.setLevel("warn");
      });
      alexaTest.test([
        {
          request: new IntentRequestBuilder(skillSettings, "SetLogLevelIntent")
            .withSlot("logLevel", testLevel)
            .build(),
          says: util.format(messages.LOGGING, testLevel),
          hasCardTitle: "Bin Collections Log Level",
          hasCardContent: util.format(messages.LOGGING_CARD, testLevel),
          repromptsNothing: true,
          withSessionAttributes: tomorrowAttributes,
          hasAttributes: {
            logLevel: testLevel,
          },
        },
      ]);
    });
  });

  describe("Unknown bin type handling", function () {
    const unknownBinAttributes = {
      collections: [
        {
          date: today.clone().addDays(1).toISOString(),
          roundTypes: ["UNKNOWN_BIN_TYPE"],
          slippedCollection: false,
        },
      ],
      lastReportedBinTime: 0,
      fetchedOnDate: yesterday,
      deviceId: TEST_DEVICE_ID,
      alexaDevice: mockAlexaDevice,
      currentBinType: null,
      logLevel: "silent",
    };

    alexaTest.test([
      {
        description: "should handle unknown bin types gracefully",
        request: new LaunchRequestBuilder(skillSettings).build(),
        says: "I don't know about UNKNOWN_BIN_TYPE bins yet. Please contact the developer to add support for this bin type.",
        repromptsNothing: true,
        withSessionAttributes: unknownBinAttributes,
      },
    ]);
  });
});
