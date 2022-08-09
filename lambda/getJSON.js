/* Copyright 2020,2022 Tim Cutts <tim@thecutts.org>

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
