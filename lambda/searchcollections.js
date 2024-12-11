// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const BinCollection = require("./bincollection");
const SpeakableDate = require("./speakabledate");

function getNextCollection(sessionData, testfunc = () => true) {
  let r = sessionData.collections.find(function (item) {
    const collectionDate = new SpeakableDate(item.date).getTime();
    return (
      collectionDate >= sessionData.midnightToday &&
      collectionDate > sessionData.lastReportedBinTime &&
      testfunc(item)
    );
  });
  return r ? new BinCollection(r) : r;
}

function getNextCollectionOfType(sessionData, binType) {
  return getNextCollection(
    sessionData,
    (item) => item.roundTypes.indexOf(binType) !== -1
  );
}

module.exports = {
  getNextCollectionOfType,
  getNextCollection,
};
