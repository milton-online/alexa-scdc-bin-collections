// Copyright 2020,2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const axios = require("axios").default;
const log = require("loglevel");

const DataError = require("./errors/dataerror");
const messages = require("./messages");

// Reuse HTTP agent for connection pooling
const httpAgent = axios.create({
  timeout: 3000,
  maxRedirects: 2,
  headers: {
    Accept: "application/json",
    "User-Agent": "BinCollectionSkill/1.0",
  },
});

function getJSON(url) {
  log.debug(`getJSON: ${url}`);
  return new Promise(function (resolve, reject) {
    httpAgent
      .get(url)
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
