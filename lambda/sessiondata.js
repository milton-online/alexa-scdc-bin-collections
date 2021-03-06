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

const Alexa = require('ask-sdk-core')
const { getJSON } = require("./getJSON.js")
const DataError = require("./dataerror.js")
const { messages } = require("./messages.js")
const SpeakableDate = require("./speakabledate.js")

const apiUrl = "https://servicelayer3c.azure-api.net/wastecalendar";
const numberOfCollections = 12

function getConsentToken(requestEnvelope) {
    const consentToken = requestEnvelope.context.System.apiAccessToken;

    if (!consentToken) {
        throw new DataError("No consent token", messages.NOTIFY_MISSING_PERMISSIONS)
    }

    return consentToken
}

async function getAddressFromDevice(handlerInput) {
    try {
        const { requestEnvelope, serviceClientFactory } = handlerInput
        const deviceId = Alexa.getDeviceId(requestEnvelope)
        const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
        const address = await deviceAddressServiceClient.getFullAddress(deviceId);

        // console.log('Device:', deviceId); console.log('Address:', address)

        return address
    } catch (e) {
        throw new DataError('No address from device', messages.NOTIFY_MISSING_PERMISSIONS)
    }
}

function getPostcodeFromAddress(address) {
    if (address.postalCode === null) {
        throw new DataError('No postcode', messages.NO_POSTCODE)
    }
    // get rid of the space in the postcode
    return address.postalCode.slice(0,-4) + address.postalCode.slice(-3);
}

function getLocationListFromSearchResults(postcodeSearchResults, address) {
    let matched_address = null;
    let houseNumber = 'no_address';

    if (address.addressLine1) {
        [ houseNumber ] = address.addressLine1.match(/^[^ ]*/);
        matched_address = postcodeSearchResults.find(item => item.houseNumber == houseNumber);
    }

    // Return the complete list of locations in this postCode
    let locationList = postcodeSearchResults.map(address => address.id)

    // put the matched address at the front of the list if we found one
    if (matched_address) {
        locationList.unshift(matched_address.id)
    }

    return locationList
}

function getPostcodeSearchFromSCDCWeb(postcode) {
    return new Promise((resolve, reject) => {
        getJSON(`${apiUrl}/address/search/?postCode=${postcode}`)
            .then((postcodeSearchResults) => {
                if (postcodeSearchResults.length < 1) {
                    console.error(`${apiUrl}/address/search/?postCode=${postcode}`)
                    reject(new DataError('SCDC returned no locations for postcode starting ' + postcode.slice(0,-4), messages.POSTCODE_LOOKUP_FAIL))
                }
                resolve(postcodeSearchResults)
            })
            .catch(e => reject(e))
    })
}

async function getLocationList(handlerInput) {
    const address = await getAddressFromDevice(handlerInput)
    const postcode = getPostcodeFromAddress(address)
    const postcodeSearchResults = await getPostcodeSearchFromSCDCWeb(postcode)
    return getLocationListFromSearchResults(postcodeSearchResults, address)
}

async function getCollectionsFromLocationList(locationList) {

    // We only have enough time for four tests. If the first does not work
    // we will try four entries evenly spaced throughout the list.

    const step = ~~(locationList.length/4)

    for (let l = 0; l < locationList.length; l += step) {
        let locationId = locationList[l]
        let url = `${apiUrl}/collection/search/${locationId}/?numberOfCollections=${numberOfCollections}`
        console.log(url)
        let r = await getJSON(url)

        if (r.collections.length >= 1) {
            return({ collections: r.collections })
        }
    }

    throw new DataError("No data", messages.NO_DATA_RETURNED)
}

function callDirectiveService(handlerInput, message) {
    const requestEnvelope = handlerInput.requestEnvelope;
    const directiveServiceClient = handlerInput.serviceClientFactory.getDirectiveServiceClient();

    const requestId = requestEnvelope.request.requestId;
    const endpoint = requestEnvelope.context.System.apiEndpoint;
    const token = Alexa.getApiAccessToken(requestEnvelope);

    const directive = {
        header: {
            requestId,
        },
        directive: {
            type: 'VoicePlayer.Speak',
            speech: message
        },
    };

    return directiveServiceClient.enqueue(directive, endpoint, token);
}

exports.getFreshSessionData = function (handlerInput) {

    const { requestEnvelope } = handlerInput;

    callDirectiveService(handlerInput, messages.CONTACTING_SCDC)
        .catch(err => console.log(err))

    const consentToken = getConsentToken(requestEnvelope)
    const deviceId = Alexa.getDeviceId(requestEnvelope)

    return new Promise((resolve, reject) => {
        getLocationList(handlerInput)
            .then(locationList => getCollectionsFromLocationList(locationList))
            .then((data) => {
                Object.assign(data, {
                    missedQuestion: false,
                    areDirty: true,
                    midnightToday: new SpeakableDate().setToMidnight().getTime(),
                    lastReportedBinTime: 0,
                    currentBinType: null,
                    deviceId: deviceId,
                    fetchedOnDate: Date.now()
                })
                resolve(data)
            })
            .catch(e => reject(e))
    })
}

/* for testing */
exports.Internal = function() {
    return {
        getPostcodeSearchFromSCDCWeb,
        getPostcodeFromAddress,
        getLocationListFromSearchResults,
        getCollectionsFromLocationList
    }
}
/* end test only */
