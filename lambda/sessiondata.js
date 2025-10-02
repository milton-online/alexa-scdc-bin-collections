// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const log = require("loglevel");
const getJSON = require("./getJSON");
const DataError = require("./errors/dataerror");
const messages = require("./messages");
const SpeakableDate = require("./speakabledate");
const AlexaDevice = require("./alexadevice");

const apiUrl = "https://servicelayer3c.azure-api.net/wastecalendar";
const CACHE_DAYS = 7;
const MILLISECONDS_PER_DAY = 86400000;

const numberOfCollections = 12;

function getLocationListFromSearchResults(postcodeSearchResults, address) {
  let matched_address = null;
  let houseNumber = "no_address";

  if (address.addressLine1) {
    [houseNumber] = address.addressLine1.match(/^[^ ]*/);
    matched_address = postcodeSearchResults.find(
      (item) => item.houseNumber === houseNumber
    );
  }

  // Return the complete list of locations in this postCode
  let locationList = postcodeSearchResults.map(({ id }) => id);

  // put the matched address at the front of the list if we found one
  if (matched_address) {
    locationList.unshift(matched_address.id);
  }

  return locationList;
}

function getPostcodeSearchFromSCDCWeb(postcode) {
  log.debug(
    `getPostcodeSearchFromSCDCWeb(postcode=${encodeURIComponent(postcode)})`
  );
  return getJSON(
    `${apiUrl}/address/search/?postCode=${encodeURIComponent(postcode)}`
  ).then((postcodeSearchResults) => {
    if (postcodeSearchResults.length < 1) {
      throw new DataError(
        "SCDC returned no locations for postcode starting " +
          postcode.slice(0, -4),
        messages.POSTCODE_LOOKUP_FAIL
      );
    }
    return postcodeSearchResults;
  });
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
  const step = Math.max(1, ~~(locationList.length / maxConcurrent));

  const promises = [];
  // amazonq-ignore-next-line
  for (let i = 0; i < maxConcurrent && i * step < locationList.length; i++) {
    const locationId = locationList[i * step];
    const url = `${apiUrl}/collection/search/${locationId}/?numberOfCollections=${numberOfCollections}`;
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
  log.info(
    `Fetching new persistent data for ${encodeURIComponent(
      alexaDevice.postalcode
    )}`
  );
  const attributesManager = handlerInput.attributesManager;
  const attributes = await getFreshSessionData(handlerInput, alexaDevice);
  if (process.env.NODE_ENV !== "development") {
    if (attributes.logLevel) {
      log.setLevel(attributes.logLevel);
    } else {
      attributes.logLevel = "error";
      log.setLevel("error");
    }
  }
  attributesManager.setSessionAttributes(attributes);
  attributesManager.setPersistentAttributes(attributes);
}

function attributesAreStale(attributes, thisDevice) {
  // Check data is not stale (more than a week old, for a different
  // device, or where the first collection is in the past)

  log.debug("attributesAreStale()");
  log.debug(
    `attributes: ${encodeURIComponent(JSON.stringify(attributes, null, 2))}`
  );
  log.debug(
    `thisDevice: ${encodeURIComponent(JSON.stringify(thisDevice, null, 2))}`
  );

  if (attributes.collections) {
    log.debug("Found collections");

    const midnightToday = new SpeakableDate().setToMidnight().getTime();
    attributes.midnightToday = midnightToday;

    if (attributes.alexaDevice === undefined) {
      attributes.alexaDevice = thisDevice;
      return true;
    }

    if (thisDevice.isSameLocationAsDevice(attributes.alexaDevice)) {
      log.debug("Same address as before");
      const firstCollectionDate = new Date(
        attributes.collections[0].date
      ).getTime();

      if (firstCollectionDate >= midnightToday) {
        log.debug(
          `fCD: ${encodeURIComponent(
            firstCollectionDate
          )} >= mdt: ${encodeURIComponent(midnightToday)}`
        );
        const aWeekAgo = midnightToday - CACHE_DAYS * MILLISECONDS_PER_DAY;

        if (attributes.fetchedOnDate > aWeekAgo) {
          log.debug("Not refreshing:  data is less than a week old");
          return false;
        }
      }
    }
  }
  return true;
}

function getFreshSessionData(handlerInput, alexaDevice) {
  log.debug(
    `getFreshSessionData(): ${encodeURIComponent(alexaDevice.postalcode)}`
  );
  const { requestEnvelope } = handlerInput;

  AlexaDevice.callDirectiveService(
    handlerInput,
    messages.CONTACTING_SCDC
  ).catch((err) =>
    log.error(encodeURIComponent(err?.message || "Unknown error"))
  );

  AlexaDevice.getConsentToken(requestEnvelope);

  return getLocationList(alexaDevice)
    .then((locationList) => getCollectionsFromLocationList(locationList))
    .then((data) => {
      Object.assign(data, {
        missedQuestion: false,
        areDirty: true,
        midnightToday: new SpeakableDate().setToMidnight().getTime(),
        lastReportedBinTime: 0,
        currentBinType: null,
        fetchedOnDate: Date.now(),
        deviceId: alexaDevice.deviceId,
        alexaDevice: alexaDevice,
      });
      return data;
    });
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
