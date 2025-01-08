// Copyright 2020 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

module.exports = class DataError extends Error {
  constructor(message, speech) {
    super(message);
    this.name = "DataError";
    this.speech = speech;
  }
};
