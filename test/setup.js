// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

// Global test setup - runs before all tests
const log = require("loglevel");

// Disable all logging during tests unless DEBUG_TESTS is set
if (!process.env.DEBUG_TESTS) {
  log.disableAll();
}
