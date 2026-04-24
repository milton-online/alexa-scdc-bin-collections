// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";

const should = require("should");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { execSync } = require("child_process");
const path = require("path");


const TEST_TABLE_NAME = "prod-table";
const TEST_REGION_US = "us-east-1";
const TEST_REGION_EU = "eu-west-1";
const LOCAL_DYNAMODB_ENDPOINT = "http://localhost:8000";
const DYNAMODB_DIR = path.join(__dirname, "../dynamodb-local");

function isDockerRunning() {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function startDynamoDB() {
  try {
    execSync("docker compose up -d", {
      cwd: DYNAMODB_DIR,
      stdio: "ignore",
      shell: true,
      timeout: 10000,
    });
    execSync("sleep 3", { shell: true });
  } catch (e) {
    console.log("Failed to start DynamoDB:", e.message);
  }
}

function stopDynamoDB() {
  try {
    execSync("docker compose down", {
      cwd: DYNAMODB_DIR,
      stdio: "ignore",
      shell: true,
    });
  } catch (e) {
    console.log("Failed to stop DynamoDB:", e.message);
  }
}

const dockerAvailable = isDockerRunning() && !process.env.SKIP_DYNAMODB;

describe("persistenceAdapter", function () {
  let envBackup;
  let getPersistenceAdapter;

  before(function (done) {
    this.timeout(15000);
    if (dockerAvailable) {
      startDynamoDB();
    }
    done();
  });

  after(function () {
    if (dockerAvailable) {
      stopDynamoDB();
    }
  });

  beforeEach(function () {
    envBackup = { ...process.env };
    delete require.cache[require.resolve("../lambda/persistenceAdapter")];
    getPersistenceAdapter = require("../lambda/persistenceAdapter");
  });

  afterEach(function () {
    process.env = envBackup;
  });

  (dockerAvailable ? it : it.skip)(
    "should return adapter for local DynamoDB when DYNAMODB_LOCAL is true",
    function () {
      process.env.DYNAMODB_LOCAL = "true";
      const adapter = getPersistenceAdapter();
      adapter.should.be.ok();
      adapter.should.have.property("getAttributes");
    }
  );

  it("should return adapter for production DynamoDB when DYNAMODB_LOCAL is not set", function () {
    delete process.env.DYNAMODB_LOCAL;
    process.env.DYNAMODB_PERSISTENCE_TABLE_NAME = TEST_TABLE_NAME;
    process.env.DYNAMODB_PERSISTENCE_REGION = TEST_REGION_US;

    const adapter = getPersistenceAdapter();
    adapter.should.be.ok();
    adapter.should.have.property("getAttributes");
  });

  it("should return adapter for production DynamoDB when DYNAMODB_LOCAL is false", function () {
    process.env.DYNAMODB_LOCAL = "false";
    process.env.DYNAMODB_PERSISTENCE_TABLE_NAME = TEST_TABLE_NAME;
    process.env.DYNAMODB_PERSISTENCE_REGION = TEST_REGION_EU;

    const adapter = getPersistenceAdapter();
    adapter.should.be.ok();
    adapter.should.have.property("getAttributes");
  });

  (dockerAvailable ? it : it.skip)(
    "should create DynamoDBClient with local endpoint when DYNAMODB_LOCAL is true",
    function () {
      process.env.DYNAMODB_LOCAL = "true";

      // Replace the @aws-sdk/client-dynamodb module with a spy wrapper
      const sdkModulePath = require.resolve("@aws-sdk/client-dynamodb");
      const originalModule = require.cache[sdkModulePath];

      const constructorCalls = [];
      function SpyDynamoDBClient(config) {
        constructorCalls.push(config);
        return new DynamoDBClient(config);
      }

      require.cache[sdkModulePath] = {
        ...originalModule,
        exports: {
          ...originalModule.exports,
          DynamoDBClient: SpyDynamoDBClient,
        },
      };

      // Re-require persistenceAdapter so it picks up the spy
      delete require.cache[require.resolve("../lambda/persistenceAdapter")];
      getPersistenceAdapter = require("../lambda/persistenceAdapter");

      getPersistenceAdapter();

      // Restore the original module
      require.cache[sdkModulePath] = originalModule;

      constructorCalls.length.should.be.greaterThan(0);
      const localConfig = constructorCalls[0];
      localConfig.should.have.property("endpoint", LOCAL_DYNAMODB_ENDPOINT);
      localConfig.should.have.property("region", TEST_REGION_EU);
    }
  );
});
