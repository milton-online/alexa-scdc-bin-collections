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

// Skip DynamoDB for skill tests (use withSessionAttributes instead)
process.env.SKIP_DYNAMODB = "true";

// Suppress AWS SDK v2 maintenance mode warning.
// ask-sdk-dynamodb-persistence-adapter still bundles aws-sdk v2 internally;
// our code uses v3 (@aws-sdk/client-dynamodb) directly.
process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = "1";

// Node.js 22 is required for latest AWS SDK v3 packages
// and aligns with AWS Lambda's current recommended runtime
