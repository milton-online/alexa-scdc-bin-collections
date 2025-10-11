// Copyright 2020,2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
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

// amazonq-ignore-next-line
function getJSON(url) {
  log.debug(`getJSON: ${url}`);

  // Validate URL to prevent SSRF
  const allowedHosts = [
    "servicelayer3c.azure-api.net",
    "localhost",
    "127.0.0.1",
  ];
  try {
    const parsedUrl = new URL(url);
    if (!allowedHosts.includes(parsedUrl.hostname)) {
      return Promise.reject(
        new DataError(
          `Invalid URL host: ${parsedUrl.hostname}`,
          messages.WEB_ERROR
        )
      );
    }
  } catch (e) {
    return Promise.reject(
      new DataError(`Invalid URL: ${url}`, messages.WEB_ERROR)
    );
  }

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
