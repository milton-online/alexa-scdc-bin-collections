// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
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

const numberOfCollections = 12;

function getLocationListFromSearchResults(postcodeSearchResults, address) {
  let matched_address = null;
  let houseNumber = "no_address";

  if (address.addressLine1) {
    [houseNumber] = address.addressLine1.match(/^[^ ]*/);
    matched_address = postcodeSearchResults.find(
      (item) => item.houseNumber == houseNumber
    );
  }

  // Return the complete list of locations in this postCode
  let locationList = postcodeSearchResults.map((address) => address.id);

  // put the matched address at the front of the list if we found one
  if (matched_address) {
    locationList.unshift(matched_address.id);
  }

  return locationList;
}

function getPostcodeSearchFromSCDCWeb(postcode) {
  log.debug(`getPostcodeSearchFromSCDCWeb(postcode=${postcode})`);
  return new Promise((resolve, reject) => {
    getJSON(`${apiUrl}/address/search/?postCode=${postcode}`)
      .then((postcodeSearchResults) => {
        if (postcodeSearchResults.length < 1) {
          reject(
            new DataError(
              "SCDC returned no locations for postcode starting " +
                postcode.slice(0, -4),
              messages.POSTCODE_LOOKUP_FAIL
            )
          );
        }
        resolve(postcodeSearchResults);
      })
      .catch((e) => reject(e));
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
  // We only have enough time for four tests. If the first does not work
  // we will try four entries evenly spaced throughout the list.

  const step = ~~(locationList.length / 4);

  for (let l = 0; l < locationList.length; l += step) {
    let locationId = locationList[l];
    let url = `${apiUrl}/collection/search/${locationId}/?numberOfCollections=${numberOfCollections}`;
    let r = await getJSON(url);

    if (r.collections.length >= 1) {
      return { collections: r.collections };
    }
  }

  throw new DataError("No data", messages.NO_DATA_RETURNED);
}

async function getFreshAttributes(handlerInput, alexaDevice) {
  log.info(`Fetching new persistent data for ${alexaDevice.postalcode}`);
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
  log.debug(`attributes: ${JSON.stringify(attributes, null, 2)}`);
  log.debug(`thisDevice: ${JSON.stringify(thisDevice, null, 2)}`);

  if (attributes.collections) {
    log.debug("Found collections");

    const midnightToday = new SpeakableDate().setToMidnight().getTime();
    attributes.midnightToday = midnightToday;

    if (attributes.alexaDevice === undefined) {
      if (attributes.alexaDevice === thisDevice.deviceId) {
        attributes.alexaDevice === thisDevice;
      } else {
        return true;
      }
    }

    if (thisDevice.isSameLocationAsDevice(attributes.alexaDevice)) {
      log.debug("Same address as before");
      const firstCollectionDate = new Date(
        attributes.collections[0].date
      ).getTime();
      if (firstCollectionDate >= midnightToday) {
        log.debug(`fCD: ${firstCollectionDate} >= mdt: ${midnightToday}`);
        const aWeekAgo = midnightToday - 7 * 86400000;

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
  log.debug(`getFreshSessionData(): ${alexaDevice.postalcode}`);
  const { requestEnvelope } = handlerInput;

  // Device access doesn't work under mocha test framework, but
  // otherwise send user a "please wait" message
  if (process.env.MOCK_DEVICE !== "true") {
    AlexaDevice.callDirectiveService(
      handlerInput,
      messages.CONTACTING_SCDC
    ).catch((err) => log.error(err));

    AlexaDevice.getConsentToken(requestEnvelope);
  }

  return new Promise((resolve, reject) => {
    getLocationList(alexaDevice)
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
        resolve(data);
      })
      .catch((e) => reject(e));
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
