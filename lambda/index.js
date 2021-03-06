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

const Alexa = require('ask-sdk-core');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter')
const BinCollection = require("./bincollection.js")
const DataError = require("./dataerror.js")
const { messages } = require("./messages.js")
const { getFreshSessionData } = require("./sessiondata.js")
const { getJSON } = require("./getJSON.js")
const SpeakableDate = require("./speakabledate.js")
const { getNextCollection, getNextCollectionOfType } = require("./searchcollections.js")

"use strict"

const PERMISSIONS = ['read::alexa:device:all:address'];

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return (Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest' ||
               (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NextBinCollectionIntent'));
    },
    handle(handlerInput) {
        let { requestEnvelope, serviceClientFactory,
                responseBuilder, attributesManager } = handlerInput;

        const attributes = attributesManager.getSessionAttributes();

        attributes.lastReportedBinTime = 0
        const collection = getNextCollection(attributes)
        attributes.currentBinType = collection.roundTypes[0];
        attributes.lastReportedBinTime = collection.date.getTime();

        let speakOutput = "Your next collection is the "
        speakOutput += collection.getColoursSpeech();
        speakOutput += ', ' + collection.getDateSpeech();

        const oldQuestionState = attributes.missedQuestion;

        if (collection.isToday()) {
            responseBuilder = responseBuilder.withShouldEndSession(false)
            attributes.missedQuestion = true;
        } else {
            attributes.missedQuestion = false;
        }

        attributes.areDirty = attributes.areDirty ||
                              (attributes.missedQuestion !== oldQuestionState)

        attributesManager.setSessionAttributes(attributes);

        return responseBuilder
            .speak(speakOutput)
            .withStandardCard("Next collection", speakOutput,
            collection.getSmallImageUrl(),
            collection.getLargeImageUrl()
            )
            .getResponse();
    }
};

function resolveToCanonicalSlotValue(slot) {
    const resolutions = slot.resolutions;
    const hasResolutionDataOnSlot = (resolutions && resolutions.resolutionsPerAuthority && resolutions.resolutionsPerAuthority.length > 0);
    const resolution = hasResolutionDataOnSlot ? slot.resolutions.resolutionsPerAuthority[0] : null;

    if (resolution && resolution.status.code === 'ER_SUCCESS_MATCH') {
        return resolution.values[0].value.name;
    } else {
        return slot.value;
    }
}

const NextColourBinIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NextColourBinIntent';
    },
    handle(handlerInput) {
        let { requestEnvelope, serviceClientFactory,
                responseBuilder, attributesManager } = handlerInput;

        const binType = resolveToCanonicalSlotValue(requestEnvelope.request.intent.slots.binType);

        const attributes = attributesManager.getSessionAttributes();

        attributes.lastReportedBinTime = 0
        const collection = getNextCollectionOfType(attributes, binType);
        attributes.currentBinType = binType;
        attributes.lastReportedBinTime = collection.date.getTime();
        attributes.lastIntent = requestEnvelope.request.intent;

        if (collection.isToday()) {
            responseBuilder = responseBuilder.withShouldEndSession(false)
            attributes.missedQuestion = true;
        } else {
            attributes.missedQuestion = false;
        }

        attributesManager.setSessionAttributes(attributes);

        const speakOutput = [
            'Your next',
            BinCollection.getColourForBinType(binType),
            BinCollection.getNameForBinType(binType),
            'collection is',
            collection.getDateSpeech()
        ].join(" ");

        return responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const MissedBinCollectionIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'MissedBinCollectionIntent';
    },
    handle(handlerInput) {
        const { requestEnvelope, serviceClientFactory,
                responseBuilder, attributesManager } = handlerInput;

        const attributes = attributesManager.getSessionAttributes();

        const collection = getNextCollectionOfType(attributes, attributes.currentBinType);

        if (! collection) {
            return handlerInput.responseBuilder
                .speak(messages.NO_MORE)
                .getResponse();
        }

        attributes.lastReportedBinTime = collection.date.getTime();
        attributes.missedQuestion = false;
        attributesManager.setSessionAttributes(attributes);

        const binName = BinCollection.getNameForBinType(attributes.currentBinType)

        const speakOutput = [
            'The next',
            BinCollection.getColourForBinType(attributes.currentBinType),
            binName,
            'collection will be',
            collection.getDateSpeech()
        ].join(" ");

        return handlerInput.responseBuilder
            .withStandardCard(`Next ${binName} collection`,
                speakOutput,
                collection.getSmallImageUrl(),
                collection.getLargeImageUrl())
            .speak('OK then.  ' + speakOutput)
            .getResponse();
    }
}

const WhichBinTodayIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'WhichBinTodayIntent';
    },
    handle(handlerInput) {
        let { requestEnvelope, serviceClientFactory,
                responseBuilder, attributesManager } = handlerInput;

        const attributes = attributesManager.getSessionAttributes();
        attributes.lastReportedBinTime = 0
        const collection = getNextCollection(attributes);
        attributes.currentBinType = collection.roundTypes[0];
        attributes.lastReportedBinTime = collection.date.getTime()
        attributes.missedQuestion = false

        let speakOutput;

        if (collection.isToday()) {
            speakOutput = "Today's bin collection is the " + collection.getColoursSpeech();
            responseBuilder = responseBuilder.withStandardCard(
                "Collection today", speakOutput,
                collection.getSmallImageUrl(),
                collection.getLargeImageUrl())
        } else {
            speakOutput = "There is no bin collection due today."
            if (collection.isTomorrow()) {
                speakOutput += "  But there is tomorrow.  It's the " + collection.getColoursSpeech();
                responseBuilder = responseBuilder.withStandardCard(
                    "Collection tomorrow", speakOutput)
            } else {
                responseBuilder = responseBuilder.withSimpleCard(
                    "No collection today", speakOutput)
            }
        }

        attributesManager.setSessionAttributes(attributes);

        return responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
}

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(messages.HELP + " " + messages.HELP_REPROMPT)
            .reprompt(messages.HELP_REPROMPT)
            .withSimpleCard(messages.HELPCARD_TITLE, messages.HELP)
            .getResponse();
    }
};

const WhoPutTheBinsOutIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'WhoPutTheBinsOutIntent';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(messages.WHOWHOWHO)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, e) {
        console.error(`~~~~~ Error handled: ${e.stack}`);
        let r = handlerInput.responseBuilder;
        if (e instanceof DataError) {
            r = r.speak(e.speech)
            if (e.speech === messages.NOTIFY_MISSING_PERMISSIONS) {
                r = r.withAskForPermissionsConsentCard(PERMISSIONS)
            }
        } else {
            r = r.speak(messages.ERROR);
        }
        return r.getResponse();
   }
};

const PersistenceSavingInterceptor = {
    process(handlerInput) {
        const {attributesManager} = handlerInput
        return new Promise((resolve, reject) => {
            const attributes = attributesManager.getSessionAttributes()
            if (attributes.areDirty) {
                console.log("Saving attributes")
                attributesManager.savePersistentAttributes()
                    .then(() => {
                        attributes.areDirty = false
                        attributesManager.setSessionAttributes(attributes)
                        resolve();
                    })
                    .catch((error) => {
                        reject(error);
                    });
            } else {
                resolve();
            }
        });
    }
}

const LoadBinCollectionsInterceptor = {
    async process(handlerInput) {
        const {requestEnvelope, attributesManager} = handlerInput
        // In normal operation there wouldn't be session attributes here, but during testing there are
        let attributes = attributesManager.getSessionAttributes()
        if (!attributes.deviceId) {
          attributes = await attributesManager.getPersistentAttributes() || {};
          attributesManager.setSessionAttributes(attributes)
        }

        // Check data is not stale (more than a week old, for a different
        // device, or where the first collection is in the past)

        if (attributes.collections) {
            console.log("Found collections")
            if (attributes.missedQuestion === true) {
                console.log("Not refreshing:  missedQuestion is true")
                return
            }

            const midnightToday = new SpeakableDate().setToMidnight().getTime();
            attributes.midnightToday = midnightToday;

            const deviceId = Alexa.getDeviceId(requestEnvelope)

            //console.log(`oldDev: ${attributes.deviceId}`)
            //console.log(`newDev: ${deviceId}`)

            if (attributes.deviceId === deviceId) {
                console.log("Same device as before")
                const firstCollectionDate = new Date(attributes.collections[0].date).getTime()
                if (firstCollectionDate >= midnightToday) {

                    console.log(`fCD: ${firstCollectionDate} >= mdt: ${midnightToday}`)
                    const aWeekAgo = midnightToday - 7*86400000

                    if (attributes.fetchedOnDate > aWeekAgo) {
                        console.log("Not refreshing:  data is less than a week old")
                        return
                    }
                }
            }
        }

        await getFreshAttributes(handlerInput);

    }
}

async function getFreshAttributes(handlerInput) {
    console.info("Fetching new persistent data")
    const attributesManager = handlerInput.attributesManager
    const attributes = await getFreshSessionData(handlerInput)

    attributesManager.setSessionAttributes(attributes)
    attributesManager.setPersistentAttributes(attributes)
}

const YesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        if (attributes.missedQuestion) {
            return MissedBinCollectionIntentHandler.handle(handlerInput)
        } else {
            return handlerInput.responseBuilder
                .speak(messages.NO_QUESTION)
                .getResponse();
        }
    }
}

const NoIntentHandler = {
    canHandle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();

        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
            &&  attributes.missedQuestion === true
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(messages.BYE_THEN)
            .withShouldEndSession(true)
            .getResponse();
    }
}

const GetFreshDataIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetFreshDataIntent';
    },
    async handle(handlerInput) {

        await getFreshAttributes(handlerInput)

        return handlerInput.responseBuilder
            .speak(messages.GOT_FRESH_DATA)
            .withShouldEndSession(false)
            .getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter({bucketName:process.env.S3_PERSISTENCE_BUCKET})
    )
    .withApiClient(new Alexa.DefaultApiClient())
    .addRequestHandlers(
        LaunchRequestHandler,
        YesIntentHandler,
        NoIntentHandler,
        NextColourBinIntentHandler,
        MissedBinCollectionIntentHandler,
        WhichBinTodayIntentHandler,
        GetFreshDataIntentHandler,
        WhoPutTheBinsOutIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler,
    )
    .addRequestInterceptors(
        LoadBinCollectionsInterceptor
    )
    .addResponseInterceptors(
        PersistenceSavingInterceptor
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .lambda();
