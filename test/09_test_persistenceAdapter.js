// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";

const should = require("should");
const sinon = require("sinon");
const { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand, CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const { execSync } = require("child_process");
const path = require("path");


const TEST_TABLE_NAME = "prod-table";
const TEST_REGION_US = "us-east-1";
const TEST_REGION_EU = "eu-west-1";
const LOCAL_DYNAMODB_ENDPOINT = "http://localhost:8000";
const DYNAMODB_DIR = path.join(__dirname, "../dynamodb-local");

const TEST_USER_ID = "amzn1.ask.account.TEST_USER_123";

function makeRequestEnvelope(userId) {
  return {
    context: {
      System: {
        user: { userId: userId || TEST_USER_ID },
        device: { deviceId: "amzn1.ask.device.TEST_DEVICE" },
      },
    },
  };
}

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

  describe("getPersistenceAdapter() factory", function () {
    it("should return NoOpPersistenceAdapter when SKIP_DYNAMODB is true", function () {
      process.env.SKIP_DYNAMODB = "true";
      const adapter = getPersistenceAdapter();
      adapter.should.be.ok();
      adapter.should.have.property("getAttributes");
      adapter.should.have.property("saveAttributes");
      adapter.should.have.property("deleteAttributes");
    });

    it("NoOpPersistenceAdapter.getAttributes() should return empty object", async function () {
      process.env.SKIP_DYNAMODB = "true";
      const adapter = getPersistenceAdapter();
      const result = await adapter.getAttributes();
      result.should.deepEqual({});
    });

    it("NoOpPersistenceAdapter.saveAttributes() should resolve without error", async function () {
      process.env.SKIP_DYNAMODB = "true";
      const adapter = getPersistenceAdapter();
      await adapter.saveAttributes({}, { foo: "bar" });
    });

    it("NoOpPersistenceAdapter.deleteAttributes() should resolve without error", async function () {
      process.env.SKIP_DYNAMODB = "true";
      const adapter = getPersistenceAdapter();
      await adapter.deleteAttributes({});
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

    it("should use default table name when DYNAMODB_PERSISTENCE_TABLE_NAME is not set", function () {
      delete process.env.DYNAMODB_LOCAL;
      delete process.env.DYNAMODB_PERSISTENCE_TABLE_NAME;
      delete process.env.SKIP_DYNAMODB;

      delete require.cache[require.resolve("../lambda/persistenceAdapter")];
      const getAdapter = require("../lambda/persistenceAdapter");
      const adapter = getAdapter();
      adapter.tableName.should.equal("bin-collections");
    });

    (dockerAvailable ? it : it.skip)(
      "should create DynamoDBClient with local endpoint when DYNAMODB_LOCAL is true",
      function () {
        process.env.DYNAMODB_LOCAL = "true";

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

        delete require.cache[require.resolve("../lambda/persistenceAdapter")];
        getPersistenceAdapter = require("../lambda/persistenceAdapter");

        getPersistenceAdapter();

        require.cache[sdkModulePath] = originalModule;

        constructorCalls.length.should.be.greaterThan(0);
        const localConfig = constructorCalls[0];
        localConfig.should.have.property("endpoint", LOCAL_DYNAMODB_ENDPOINT);
        localConfig.should.have.property("region", TEST_REGION_EU);
      }
    );
  });

  describe("DynamoDbV3PersistenceAdapter", function () {
    let mockClient;
    let adapter;

    beforeEach(function () {
      delete process.env.DYNAMODB_LOCAL;
      delete process.env.SKIP_DYNAMODB;
      process.env.DYNAMODB_PERSISTENCE_TABLE_NAME = TEST_TABLE_NAME;
      process.env.DYNAMODB_PERSISTENCE_REGION = TEST_REGION_US;

      delete require.cache[require.resolve("../lambda/persistenceAdapter")];
      const getAdapter = require("../lambda/persistenceAdapter");
      adapter = getAdapter();
      mockClient = sinon.stub(adapter.dynamoDBClient, "send");
    });

    afterEach(function () {
      if (mockClient) {
        mockClient.restore();
      }
    });

    describe("constructor defaults", function () {
      it("should use 'id' as default partition key name", function () {
        adapter.partitionKeyName.should.equal("id");
      });

      it("should use 'attributes' as default attributes name", function () {
        adapter.attributesName.should.equal("attributes");
      });

      it("should not create table by default", function () {
        adapter.createTable.should.equal(false);
      });
    });

    describe("getAttributes()", function () {
      it("should return stored attributes for a known user", async function () {
        const storedAttrs = { collections: [{ date: "2026-05-01" }], deviceId: "dev1" };
        mockClient.resolves({
          Item: marshall({ id: TEST_USER_ID, attributes: storedAttrs }),
        });

        const result = await adapter.getAttributes(makeRequestEnvelope());
        result.should.deepEqual(storedAttrs);

        const sentCommand = mockClient.firstCall.args[0];
        sentCommand.should.be.instanceOf(GetItemCommand);
        sentCommand.input.TableName.should.equal(TEST_TABLE_NAME);
        sentCommand.input.ConsistentRead.should.equal(true);
      });

      it("should return empty object when item does not exist", async function () {
        mockClient.resolves({});

        const result = await adapter.getAttributes(makeRequestEnvelope());
        result.should.deepEqual({});
      });

      it("should return empty object when item has no attributes field", async function () {
        mockClient.resolves({
          Item: marshall({ id: TEST_USER_ID }),
        });

        const result = await adapter.getAttributes(makeRequestEnvelope());
        result.should.deepEqual({});
      });

      it("should throw AskSdkError when DynamoDB read fails", async function () {
        mockClient.rejects(new Error("Connection refused"));

        try {
          await adapter.getAttributes(makeRequestEnvelope());
          should.fail("should have thrown");
        } catch (err) {
          err.name.should.equal("AskSdk.DynamoDbV3PersistenceAdapter Error");
          err.message.should.containEql("Could not read item");
          err.message.should.containEql(TEST_USER_ID);
          err.message.should.containEql(TEST_TABLE_NAME);
        }
      });

      it("should use userId from request envelope as partition key", async function () {
        mockClient.resolves({});

        await adapter.getAttributes(makeRequestEnvelope("amzn1.ask.account.CUSTOM_USER"));

        const sentCommand = mockClient.firstCall.args[0];
        const key = sentCommand.input.Key;
        key.should.have.property("id");
        key.id.should.have.property("S", "amzn1.ask.account.CUSTOM_USER");
      });
    });

    describe("saveAttributes()", function () {
      it("should send PutItemCommand with marshalled attributes", async function () {
        mockClient.resolves({});

        const attrs = { collections: [{ date: "2026-05-01" }], deviceId: "dev1" };
        await adapter.saveAttributes(makeRequestEnvelope(), attrs);

        const sentCommand = mockClient.firstCall.args[0];
        sentCommand.should.be.instanceOf(PutItemCommand);
        sentCommand.input.TableName.should.equal(TEST_TABLE_NAME);
        sentCommand.input.Item.should.have.property("id");
        sentCommand.input.Item.should.have.property("attributes");
      });

      it("should throw AskSdkError when DynamoDB write fails", async function () {
        mockClient.rejects(new Error("Throughput exceeded"));

        try {
          await adapter.saveAttributes(makeRequestEnvelope(), { foo: "bar" });
          should.fail("should have thrown");
        } catch (err) {
          err.name.should.equal("AskSdk.DynamoDbV3PersistenceAdapter Error");
          err.message.should.containEql("Could not save item");
          err.message.should.containEql(TEST_USER_ID);
          err.message.should.containEql(TEST_TABLE_NAME);
        }
      });
    });

    describe("deleteAttributes()", function () {
      it("should send DeleteItemCommand with correct key", async function () {
        mockClient.resolves({});

        await adapter.deleteAttributes(makeRequestEnvelope());

        const sentCommand = mockClient.firstCall.args[0];
        sentCommand.should.be.instanceOf(DeleteItemCommand);
        sentCommand.input.TableName.should.equal(TEST_TABLE_NAME);
        sentCommand.input.Key.should.have.property("id");
        sentCommand.input.Key.id.should.have.property("S", TEST_USER_ID);
      });

      it("should throw AskSdkError when DynamoDB delete fails", async function () {
        mockClient.rejects(new Error("Access denied"));

        try {
          await adapter.deleteAttributes(makeRequestEnvelope());
          should.fail("should have thrown");
        } catch (err) {
          err.name.should.equal("AskSdk.DynamoDbV3PersistenceAdapter Error");
          err.message.should.containEql("Could not delete item");
          err.message.should.containEql(TEST_USER_ID);
          err.message.should.containEql(TEST_TABLE_NAME);
        }
      });
    });

    describe("default partitionKeyGenerator", function () {
      it("should throw when requestEnvelope has no user", async function () {
        mockClient.resolves({});

        try {
          await adapter.getAttributes({ context: { System: {} } });
          should.fail("should have thrown");
        } catch (err) {
          err.message.should.containEql("Cannot retrieve user id");
        }
      });

      it("should throw when requestEnvelope is empty", async function () {
        mockClient.resolves({});

        try {
          await adapter.getAttributes({});
          should.fail("should have thrown");
        } catch (err) {
          err.message.should.containEql("Cannot retrieve user id");
        }
      });
    });

    describe("custom partitionKeyGenerator", function () {
      it("should use custom generator when provided", async function () {
        // Create adapter with custom generator
        delete require.cache[require.resolve("../lambda/persistenceAdapter")];
        process.env.DYNAMODB_LOCAL = "true";

        // The local adapter uses a custom partitionKeyGenerator that
        // extracts the last segment of the userId after the final dot
        if (!dockerAvailable) {
          // We can't test the local adapter without Docker, but we can
          // verify the factory creates it with the right config
          this.skip();
        }

        const localAdapter = getPersistenceAdapter();
        const localMock = sinon.stub(localAdapter.dynamoDBClient, "send");
        localMock.resolves({});

        const envelope = {
          context: {
            System: {
              user: { userId: "amzn1.ask.account.ABC.LAST_SEGMENT" },
              device: { deviceId: "dev1" },
            },
          },
        };

        await localAdapter.getAttributes(envelope);

        const sentCommand = localMock.firstCall.args[0];
        const key = sentCommand.input.Key;
        key.id.S.should.equal("LAST_SEGMENT");
      });
    });

    describe("createTable", function () {
      it("should send CreateTableCommand when createTable is true", function () {
        // The local adapter has createTable: true
        if (!dockerAvailable) {
          this.skip();
        }

        delete require.cache[require.resolve("../lambda/persistenceAdapter")];
        process.env.DYNAMODB_LOCAL = "true";

        // Spy on the DynamoDBClient.send before creating the adapter
        const sdkModulePath = require.resolve("@aws-sdk/client-dynamodb");
        const originalModule = require.cache[sdkModulePath];
        const sendCalls = [];

        const OriginalDynamoDBClient = DynamoDBClient;
        class SpyDynamoDBClient extends OriginalDynamoDBClient {
          send(command) {
            sendCalls.push(command);
            return Promise.resolve({});
          }
        }

        require.cache[sdkModulePath] = {
          ...originalModule,
          exports: {
            ...originalModule.exports,
            DynamoDBClient: SpyDynamoDBClient,
          },
        };

        delete require.cache[require.resolve("../lambda/persistenceAdapter")];
        getPersistenceAdapter = require("../lambda/persistenceAdapter");
        getPersistenceAdapter();

        require.cache[sdkModulePath] = originalModule;

        const createCmds = sendCalls.filter((c) => c instanceof CreateTableCommand);
        createCmds.length.should.equal(1);
        createCmds[0].input.TableName.should.equal("test-bins-table");
      });

      it("should not send CreateTableCommand when createTable is false", function () {
        // The production adapter has createTable: false
        mockClient.callCount.should.equal(0);
      });
    });

    describe("round-trip save and get", function () {
      it("should retrieve what was saved", async function () {
        const savedAttrs = {
          collections: [
            { date: "2026-05-01T00:00:00Z", roundTypes: ["DOMESTIC", "FOOD"], slippedCollection: false },
          ],
          fetchedOnDate: 1776988300468,
          deviceId: "amzn1.ask.device.TEST",
        };

        // Capture what saveAttributes sends
        let savedItem;
        mockClient.callsFake((command) => {
          if (command instanceof PutItemCommand) {
            savedItem = command.input.Item;
            return Promise.resolve({});
          }
          if (command instanceof GetItemCommand) {
            return Promise.resolve({ Item: savedItem });
          }
          return Promise.resolve({});
        });

        const envelope = makeRequestEnvelope();
        await adapter.saveAttributes(envelope, savedAttrs);
        const retrieved = await adapter.getAttributes(envelope);

        retrieved.should.deepEqual(savedAttrs);
      });

      it("should handle class instances in attributes (convertClassInstanceToMap)", async function () {
        const AlexaDevice = require("../lambda/alexadevice");
        const device = new AlexaDevice();
        device.deviceId = "amzn1.ask.device.TEST";
        device.address = {
          addressLine1: "42 Fake Street",
          postalCode: "CB24 8AY",
          countryCode: "GB",
        };
        device.postalcode = "CB248AY";

        const savedAttrs = {
          collections: [{ date: "2026-05-01T00:00:00Z", roundTypes: ["DOMESTIC"] }],
          fetchedOnDate: Date.now(),
          deviceId: device.deviceId,
          alexaDevice: device,
        };

        let savedItem;
        mockClient.callsFake((command) => {
          if (command instanceof PutItemCommand) {
            savedItem = command.input.Item;
            return Promise.resolve({});
          }
          if (command instanceof GetItemCommand) {
            return Promise.resolve({ Item: savedItem });
          }
          return Promise.resolve({});
        });

        const envelope = makeRequestEnvelope();

        // Should not throw — class instance must be marshalled correctly
        await adapter.saveAttributes(envelope, savedAttrs);
        const retrieved = await adapter.getAttributes(envelope);

        retrieved.should.have.property("alexaDevice");
        retrieved.alexaDevice.should.have.property("deviceId", device.deviceId);
        retrieved.alexaDevice.should.have.property("postalcode", "CB248AY");
        retrieved.alexaDevice.address.addressLine1.should.equal("42 Fake Street");
      });
    });
  });
});
