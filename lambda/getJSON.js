// Copyright 2020,2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const axios = require("axios").default;
const log = require("loglevel");

const DataError = require("./errors/dataerror");
const messages = require("./messages");

function getJSON(url, timeout = 5000) {
  log.debug(`getJSON: ${url}`);
  return new Promise(function (resolve, reject) {
    axios(url, { timeout })
      .then((res) => {
        resolve(res.data);
      })
      .catch((err) => {
        log.error(`Error: ${err.code} ${err.message}`);
        if (err.response) {
          reject(
            new DataError(
              `Error: ${url}: ${err.response.status}`,
              messages.WEB_ERROR
            )
          );
        } else {
          reject(new DataError(`Timeout: ${url}`, messages.WEB_TIMEOUT));
        }
      });
  });
}

module.exports = getJSON;
