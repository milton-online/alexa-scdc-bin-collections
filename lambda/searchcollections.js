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

const BinCollection = require("./bincollection.js");
const SpeakableDate = require("./speakabledate.js");

exports.getNextCollectionOfType = function (sessionData, binType) {
  let r = sessionData.collections.find(function (item) {
    const collectionDate = new SpeakableDate(item.date).getTime();
    return (
      item.roundTypes.indexOf(binType) !== -1 &&
      collectionDate >= sessionData.midnightToday &&
      collectionDate > sessionData.lastReportedBinTime
    );
  });
  return r ? new BinCollection(r) : r;
};

exports.getNextCollection = function (sessionData) {
  let r = sessionData.collections.find(function (item) {
    const collectionDate = new SpeakableDate(item.date).getTime();
    return (
      collectionDate >= sessionData.midnightToday &&
      collectionDate > sessionData.lastReportedBinTime
    );
  });
  return r ? new BinCollection(r) : r;
};
