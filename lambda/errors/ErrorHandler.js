// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const DataError = require("./dataerror");
const messages = require("../messages");
const log = require("loglevel");

const PERMISSIONS = ["read::alexa:device:all:address"];

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, e) {
    log.error(`Error handled: ${e.stack}`);
    let r = handlerInput.responseBuilder;
    if (e instanceof DataError) {
      r = r.speak(e.speech);
      if (e.speech === messages.NOTIFY_MISSING_PERMISSIONS) {
        r = r.withAskForPermissionsConsentCard(PERMISSIONS);
      }
    } else {
      r = r.speak(messages.ERROR);
    }
    return r.getResponse();
  },
};

module.exports = ErrorHandler;
