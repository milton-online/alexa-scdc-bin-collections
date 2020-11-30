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

const alexaTest = require("alexa-skill-test-framework")
const { messages } = require("../lambda/messages.js")

const DEVICE_ID = "amzn1.ask.device.0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"

alexaTest.initialize(
    require('../lambda/index.js'),
    "amzn1.ask.skill.a9f3e5f3-5a08-4a7a-a0fc-bc828e9787b0",
    "amzn1.ask.account.000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    DEVICE_ID
);

const yesterday = Date.now() - 86400000

datedAttributes = { collections:
   [ { date: '2501-09-18T00:00:00Z',
       roundTypes: ['DOMESTIC'],
       slippedCollection: false },
     { date: '2501-09-24T00:00:00Z',
       roundTypes: ['RECYCLE','ORGANIC'],
       slippedCollection: true } ],
  currentCollectionIndex: 0,
  fetchedOnDate: yesterday,
  deviceId: DEVICE_ID,
  currentBinType: null }

todayAttributes = { collections:
     [ { date: Date.now()+300,
         roundTypes: ['DOMESTIC'],
         slippedCollection: false },
       { date: Date.now() + 7*86400000,
         roundTypes: ['DOMESTIC', 'RECYCLE' ],
         slippedCollection: false },
     ],
    currentCollectionIndex: 0,
    deviceId: DEVICE_ID,
    fetchedOnDate: yesterday,
    currentBinType: "DOMESTIC" }

tomorrowAttributes = { collections:
       [ { date: Date.now() + 86400000,
           roundTypes: ['RECYCLE'],
           slippedCollection: false }
       ],
      currentCollectionIndex: 0,
      fetchedOnDate: yesterday,
      deviceId: DEVICE_ID,
      currentBinType: null }

describe("Bin Collections Skill", function() {
    describe("LaunchRequest", function() {
        alexaTest.test([
            {
                request: alexaTest.getLaunchRequest(),
                says: "Your next collection is the black bin, on Sun Sep 18 .",
                repromptsNothing: true,
                shouldEndSession: true,
                withSessionAttributes: datedAttributes,
                hasAttributes: {
                    missedQuestion: false,
                },
            },
        ])
    })
    describe("LaunchRequest (today)", function() {
        alexaTest.test([
            {
                request: alexaTest.getLaunchRequest(),
                says: `Your next collection is the black bin, today.${messages.DID_YOU_MISS_IT}`,
                repromptsNothing: true,
                shouldEndSession: false,
                hasCardTitle: "Next collection",
                hasCardTextLike: "Your next collection is the black bin, today.",
                hasCardLargeImageUrlLike: 'black_bin',
                withSessionAttributes: todayAttributes,
                hasAttributes: {
                    missedQuestion: true,
                },
            },
            {
                request: alexaTest.getIntentRequest("AMAZON.YesIntent"),
                saysLike: "OK then.  The next black landfill collection will be on",
                hasCardTitle: "Next landfill collection",
                hasCardTextLike: "The next black landfill collection will be",
                repromptsNothing: true,
                shouldEndSession: true,
            },
        ])
    })
    describe("Inappropriate Yes", function () {
        todayAttributes.missedQuestion = false;
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest("AMAZON.YesIntent"),
                says: messages.NO_QUESTION,
                repromptsNothing: true,
                shouldEndSession: true,
                withSessionAttributes: todayAttributes
            },
        ])
    })
    describe("NextColourBinIntent", function() {
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest(
                    "NextColourBinIntent",
                    { 'binType': 'RECYCLE' }
                ),
                says: `Your next blue recycling collection is on Sat Sep 24 .${messages.SLIPPED_COLLECTION}`,
                repromptsNothing: true,
                shouldEndSession: true,
                withSessionAttributes: datedAttributes
            }
        ])
    })
    describe("WhichBinTodayIntent (today)", function() {
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest(
                    "WhichBinTodayIntent"
                ),
                says: "Today's bin collection is the black bin",
                repromptsNothing: true,
                shouldEndSession: true,
                withSessionAttributes: todayAttributes
            },
        ])
    })
    describe("WhichBinTodayIntent (tomorrow)", function() {
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest(
                    "WhichBinTodayIntent"
                ),
                says: "There is no bin collection due today.  But there is tomorrow.  It's the blue bin",
                hasCardTitle: "Collection tomorrow",
                hasCardText: "There is no bin collection due today.  But there is tomorrow.  It's the blue bin",
                hasCardLargeImageUrlLike: 'blue_bin_clipart',
                repromptsNothing: true,
                shouldEndSession: true,
                withSessionAttributes: tomorrowAttributes
            },
        ])
    })
    describe("WhoPutTheBinsOutIntent", function() {
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest(
                    "WhoPutTheBinsOutIntent"
                ),
                says: messages.WHOWHOWHO,
                repromptsNothing: true,
                shouldEndSession: true,
                withSessionAttributes: { deviceId: DEVICE_ID,
                    collections:
                   [ { date: Date.now()+300,
                       roundTypes: ['RECYCLE'],
                       slippedCollection: false }
                   ],
                  fetchedOnDate: yesterday,
                  currentCollectionIndex: 0,
                  currentBinType: null }
            },
        ])
    })
})
