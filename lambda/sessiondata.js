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

const log = require("loglevel");
const { getJSON } = require("./getJSON.js");
const DataError = require("./dataerror.js");
const messages = require("./messages.js");
const SpeakableDate = require("./speakabledate.js");
const AlexaDevice = require("./alexadevice.js");

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

function attributesAreStale(attributes, thisDevice) {
  // Check data is not stale (more than a week old, for a different
  // device, or where the first collection is in the past)

  if (attributes.collections) {
    log.debug("Found collections");

    const midnightToday = new SpeakableDate().setToMidnight().getTime();
    attributes.midnightToday = midnightToday;

    log.debug(`oldAddr: ${attributes.alexaDevice.postalcode}`);
    log.debug(`newAddr: ${thisDevice.postalcode}`);
    log.debug(`oldHouse: ${attributes.alexaDevice.house}`);
    log.debug(`newHouse: ${thisDevice.house}`);

    if (
      attributes.alexaDevice.postalcode === thisDevice.postalcode &&
      attributes.alexaDevice.house === thisDevice.house
    ) {
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
  attributesAreStale: attributesAreStale,
  getFreshSessionData: getFreshSessionData,
};
