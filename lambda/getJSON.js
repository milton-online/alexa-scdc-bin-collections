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

const DataError = require("./dataerror.js");
const fetch = require("node-fetch");
const AbortController = require("abort-controller");
const log = require("loglevel");
const { messages } = require("./messages.js");

exports.getJSON_fromURL = function (url, timeout = 5000) {
  log.debug(url);
  return new Promise(function (resolve, reject) {
    const controller = new AbortController();
    const timeoutobj = setTimeout(() => {
      controller.abort();
    }, timeout);

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          reject(
            new DataError(
              `HTTP error (${res.status}) :${url}: `,
              messages.WEB_ERROR
            )
          );
        }
      })
      .finally(() => clearTimeout(timeoutobj))
      .then((json) => resolve(json))
      .catch((err) => {
        if (err.name === "AbortError") {
          reject(new DataError(`Timeout: ${url}`, messages.WEB_TIMEOUT));
        } else {
          reject(
            new DataError(
              `Other error: ${url}: ${err.stack}`,
              messages.WEB_ERROR
            )
          );
        }
      });
  });
};
