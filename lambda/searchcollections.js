// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const BinCollection = require("./bincollection");
const SpeakableDate = require("./speakabledate");

function getNextCollection(sessionData, testfunc = () => true) {
  const collection = sessionData.collections.find(function (item) {
    const collectionDate = new SpeakableDate(item.date).getTime();
    return (
      collectionDate >= sessionData.midnightToday &&
      collectionDate > sessionData.lastReportedBinTime &&
      testfunc(item)
    );
  });
  return collection ? new BinCollection(collection) : collection;
}

function getNextCollectionOfType(sessionData, binType) {
  return getNextCollection(
    sessionData,
    (item) => item.roundTypes.includes(binType)
  );
}

module.exports = {
  getNextCollectionOfType,
  getNextCollection,
};
