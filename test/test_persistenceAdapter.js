// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const should = require("should");
const sinon = require("sinon");
const AWS = require("aws-sdk");
const { execSync } = require("child_process");

("use strict");

const TEST_TABLE_NAME = "prod-table";
const TEST_REGION_US = "us-east-1";
const TEST_REGION_EU = "eu-west-1";
const LOCAL_DYNAMODB_ENDPOINT = "http://localhost:8000";

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
      cwd: "../dynamodb-local",
      stdio: "ignore",
    });
    execSync("sleep 2");
  } catch (e) {
    console.log("Failed to start DynamoDB:", e.message);
  }
}

function stopDynamoDB() {
  try {
    execSync("docker compose down", {
      cwd: "../dynamodb-local",
      stdio: "ignore",
    });
  } catch (e) {
    console.log("Failed to stop DynamoDB:", e.message);
  }
}

const dockerAvailable = isDockerRunning();

describe("persistenceAdapter", function () {
  let envBackup;
  let getPersistenceAdapter;

  before(function () {
    if (dockerAvailable) {
      startDynamoDB();
    }
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
    "should configure local DynamoDB client with correct endpoint",
    function () {
      process.env.DYNAMODB_LOCAL = "true";
      const configSpy = sinon.spy(AWS.config, "update");

      getPersistenceAdapter();

      configSpy.calledOnce.should.be.true();
      const config = configSpy.firstCall.args[0];
      config.should.have.property("endpoint", LOCAL_DYNAMODB_ENDPOINT);
      config.should.have.property("region", TEST_REGION_EU);

      configSpy.restore();
    }
  );
});
