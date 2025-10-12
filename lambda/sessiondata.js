// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const log = require("loglevel");
const getJSON = require("./getJSON");
const DataError = require("./errors/dataerror");
const messages = require("./messages");
const SpeakableDate = require("./speakabledate");
const AlexaDevice = require("./alexadevice");
const {
  ONE_DAY,
  SCDC_API_BASE_URL,
  CACHE_DAYS,
  NUMBER_OF_COLLECTIONS,
} = require("./constants");

function getLocationListFromSearchResults(postcodeSearchResults, address) {
  let matched_address = null;
  let houseNumber = "no_address";

  if (address.addressLine1) {
    const match = address.addressLine1.match(/^[^ ]*/);
    if (match) {
      [houseNumber] = match;
      matched_address = postcodeSearchResults.find(
        (item) => item.houseNumber === houseNumber
      );
    }
  }

  // Return the complete list of locations in this postCode
  let locationList = postcodeSearchResults.map(({ id }) => id);

  // put the matched address at the front of the list if we found one
  if (matched_address) {
    locationList = [matched_address.id, ...locationList];
  }

  return locationList;
}

async function getPostcodeSearchFromSCDCWeb(postcode) {
  log.debug(`getPostcodeSearchFromSCDCWeb(postcode=${postcode})`);
  const postcodeSearchResults = await getJSON(
    `${SCDC_API_BASE_URL}/address/search/?postCode=${postcode}`
  );
  if (
    !Array.isArray(postcodeSearchResults) ||
    postcodeSearchResults.length < 1
  ) {
    throw new DataError(
      `SCDC returned no locations for postcode starting ${postcode.slice(0, -4)}`,
      messages.POSTCODE_LOOKUP_FAIL
    );
  }
  return postcodeSearchResults;
}

async function getLocationList(alexaDevice) {
  const postcodeSearchResults = await getPostcodeSearchFromSCDCWeb(
    alexaDevice.postalcode
  );
  return getLocationListFromSearchResults(
    postcodeSearchResults,
    alexaDevice.address
  );
}

async function getCollectionsFromLocationList(locationList) {
  // Try parallel requests for better performance
  const maxConcurrent = Math.min(3, locationList.length);
  const step = Math.max(1, Math.floor(locationList.length / maxConcurrent));

  const promises = [];
  for (let i = 0; i < maxConcurrent && i * step < locationList.length; i++) {
    const locationId = locationList[i * step];
    const url = `${SCDC_API_BASE_URL}/collection/search/${locationId}/?numberOfCollections=${NUMBER_OF_COLLECTIONS}`;
    promises.push(
      getJSON(url)
        .then((r) => ({ locationId, collections: r.collections }))
        .catch(() => ({ locationId, collections: [] }))
    );
  }

  const results = await Promise.all(promises);
  const validResult = results.find((r) => r.collections.length >= 1);

  if (validResult) {
    return { collections: validResult.collections };
  }

  throw new DataError("No data", messages.NO_DATA_RETURNED);
}

async function getFreshAttributes(handlerInput, alexaDevice) {
  log.info(`Fetching new persistent data for ${alexaDevice.postalcode}`);
  const attributesManager = handlerInput.attributesManager;
  const attributes = await getFreshSessionData(handlerInput, alexaDevice);
  attributesManager.setSessionAttributes(attributes);
  attributesManager.setPersistentAttributes(attributes);
}

function attributesAreStale(attributes, thisDevice) {
  if (!attributes.collections) {
    return true;
  }

  if (!attributes.alexaDevice) {
    return true;
  }

  if (attributes.deviceId !== thisDevice.deviceId) {
    return true;
  }

  if (!thisDevice.isSameLocationAsDevice(attributes.alexaDevice)) {
    return true;
  }

  const midnightToday = new SpeakableDate().setToMidnight().getTime();
  attributes.midnightToday = midnightToday;

  const aWeekAgo = midnightToday - CACHE_DAYS * ONE_DAY;
  return attributes.fetchedOnDate <= aWeekAgo;
}

async function getFreshSessionData(handlerInput, alexaDevice) {
  log.debug(`getFreshSessionData(): ${alexaDevice.postalcode}`);
  const { requestEnvelope } = handlerInput;

  AlexaDevice.callDirectiveService(
    handlerInput,
    messages.CONTACTING_SCDC
  ).catch(() => {});

  AlexaDevice.getConsentToken(requestEnvelope);

  const locationList = await getLocationList(alexaDevice);
  const data = await getCollectionsFromLocationList(locationList);

  Object.assign(data, {
    missedQuestion: false,
    areDirty: true,
    midnightToday: new SpeakableDate().setToMidnight().getTime(),
    lastReportedBinTime: 0,
    currentBinType: null,
    fetchedOnDate: Date.now(),
    deviceId: alexaDevice.deviceId,
    alexaDevice,
  });

  return data;
}

module.exports = {
  Internal: {
    getPostcodeSearchFromSCDCWeb,
    getLocationListFromSearchResults,
    getCollectionsFromLocationList,
  },
  getFreshAttributes,
  attributesAreStale,
  getFreshSessionData,
};
