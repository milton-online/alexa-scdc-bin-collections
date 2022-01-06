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

const alexaTest = require("alexa-skill-test-framework");
const log = require("loglevel");
const util = require("util");
const messages = require("../lambda/messages.js");
const SpeakableDate = require("../lambda/speakabledate.js");
const MockAlexaDevice = require("./mockalexadevice.js");

const DEVICE_ID =
  "amzn1.ask.device.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

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

const mockAlexaDevice = new MockAlexaDevice(DEVICE_ID, testAddress);
mockAlexaDevice.getPostcodeFromAddress();

alexaTest.initialize(
  require("../lambda/index.js"),
  "amzn1.ask.skill.a9f3e5f3-5a08-4a7a-a0fc-bc828e9787b0",
  "amzn1.ask.account.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  DEVICE_ID
);

const today = new SpeakableDate().setToMidnight();
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
      date: today.addDays(7).toISOString(),
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
      date: today.addDays(1).toISOString(),
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

log.disableAll();

describe("Bin Collections Skill", function () {
  describe("LaunchRequest", function () {
    alexaTest.test([
      {
        request: alexaTest.getLaunchRequest(),
        says: "Your next collection is the black bin, on Sun Sep 18 .",
        repromptsNothing: true,
        shouldEndSession: true,
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
        request: alexaTest.getLaunchRequest(),
        says: `Your next collection is the black bin, today.${messages.DID_YOU_MISS_IT}`,
        repromptsNothing: true,
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
        request: alexaTest.getIntentRequest("AMAZON.YesIntent"),
        saysLike: "OK then.  The next black landfill collection will be on",
        hasCardTitle: "Next landfill collection",
        hasCardTextLike: "The next black landfill collection will be",
        repromptsNothing: true,
        shouldEndSession: true,
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
        request: alexaTest.getIntentRequest("AMAZON.YesIntent"),
        says: messages.NO_QUESTION,
        repromptsNothing: true,
        shouldEndSession: true,
        withSessionAttributes: todayAttributes,
      },
    ]);
  });
  describe("NextColourBinIntent", function () {
    alexaTest.test([
      {
        request: alexaTest.getIntentRequest("NextColourBinIntent", {
          binType: "RECYCLE",
        }),
        says: `Your next blue recycling collection is on Sat Sep 24 .${messages.SLIPPED_COLLECTION}`,
        repromptsNothing: true,
        shouldEndSession: true,
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
        request: alexaTest.getIntentRequest("NextColourBinIntent", {
          binType: "DOMESTIC",
        }),
        says: `Your next black landfill collection is today.${messages.DID_YOU_MISS_IT}`,
        repromptsNothing: true,
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
        request: alexaTest.getIntentRequest("AMAZON.YesIntent"),
        saysLike: "OK then.  The next black landfill collection will be on",
        hasCardTitle: "Next landfill collection",
        hasCardTextLike: "The next black landfill collection will be",
        repromptsNothing: true,
        shouldEndSession: true,
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
        request: alexaTest.getIntentRequest("WhichBinTodayIntent"),
        says: "Today's bin collection is the black bin",
        repromptsNothing: true,
        shouldEndSession: true,
        withSessionAttributes: todayAttributes,
      },
    ]);
  });
  describe("WhichBinTodayIntent (tomorrow)", function () {
    alexaTest.test([
      {
        request: alexaTest.getIntentRequest("WhichBinTodayIntent"),
        says: "There is no bin collection due today.  But there is tomorrow.  It's the blue bin",
        hasCardTitle: "Collection tomorrow",
        hasCardText:
          "There is no bin collection due today.  But there is tomorrow.  It's the blue bin",
        hasCardLargeImageUrlLike: "blue_bin_clipart",
        repromptsNothing: true,
        shouldEndSession: true,
        withSessionAttributes: tomorrowAttributes,
      },
    ]);
  });
  describe("WhoPutTheBinsOutIntent", function () {
    alexaTest.test([
      {
        request: alexaTest.getIntentRequest("WhoPutTheBinsOutIntent"),
        says: messages.WHOWHOWHO,
        repromptsNothing: true,
        shouldEndSession: true,
        withSessionAttributes: {
          deviceId: DEVICE_ID,
          alexaDevice: mockAlexaDevice,
          collections: [
            {
              date: today.addDays(1).toISOString(),
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
    ["trace", "debug", "info", "warn", "error", "silent"].forEach(function (
      testLevel,
      levelNumber
    ) {
      alexaTest.test([
        {
          request: alexaTest.getIntentRequest("SetLogLevelIntent", {
            logLevel: testLevel,
          }),
          says: util.format(messages.LOGGING, testLevel),
          hasCardTitle: "Bin Collections Log Level",
          hasCardContent: util.format(messages.LOGGING_CARD, testLevel),
          repromptsNothing: true,
          shouldEndSession: true,
          withSessionAttributes: tomorrowAttributes,
          hasAttributes: {
            logLevel: testLevel,
          },
        },
      ]);
      it(`logging level check: ${testLevel}`, function () {
        log.getLevel().should.equal(levelNumber);
      });
    });
  });
});
