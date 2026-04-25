// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const { DynamoDBClient, CreateTableCommand, GetItemCommand, PutItemCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const { createAskSdkError } = require("ask-sdk-core");
const process = require("process");
const Alexa = require("ask-sdk-core");

function getLocalDynamoDBClient(options) {
  return new DynamoDBClient({
    region: "eu-west-1",
    endpoint: `http://localhost:${options.port}`,
  });
}

class NoOpPersistenceAdapter {
  async getAttributes() {
    return {};
  }
  async saveAttributes() {}
  async deleteAttributes() {}
}

/**
 * Custom DynamoDB persistence adapter using AWS SDK v3.
 * Replaces ask-sdk-dynamodb-persistence-adapter which depends on AWS SDK v2
 * (broken on Node.js 22+).
 */
class DynamoDbV3PersistenceAdapter {
  constructor(config) {
    this.tableName = config.tableName;
    this.partitionKeyName = config.partitionKeyName || "id";
    this.attributesName = config.attributesName || "attributes";
    this.createTable = config.createTable === true;
    this.dynamoDBClient = config.dynamoDBClient || new DynamoDBClient({ apiVersion: "latest" });
    this.partitionKeyGenerator = config.partitionKeyGenerator || ((requestEnvelope) => {
      if (!(requestEnvelope
        && requestEnvelope.context
        && requestEnvelope.context.System
        && requestEnvelope.context.System.user
        && requestEnvelope.context.System.user.userId)) {
        throw createAskSdkError("DynamoDbV3PersistenceAdapter", "Cannot retrieve user id from request envelope!");
      }
      return requestEnvelope.context.System.user.userId;
    });

    if (this.createTable) {
      const createTableParams = {
        AttributeDefinitions: [{
          AttributeName: this.partitionKeyName,
          AttributeType: "S",
        }],
        KeySchema: [{
          AttributeName: this.partitionKeyName,
          KeyType: "HASH",
        }],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
        TableName: this.tableName,
      };
      this.dynamoDBClient.send(new CreateTableCommand(createTableParams)).catch((err) => {
        if (err.name !== "ResourceInUseException") {
          throw createAskSdkError("DynamoDbV3PersistenceAdapter", `Could not create table (${this.tableName}): ${err.message}`);
        }
      });
    }
  }

  async getAttributes(requestEnvelope) {
    const attributesId = this.partitionKeyGenerator(requestEnvelope);
    const getParams = {
      Key: marshall({ [this.partitionKeyName]: attributesId }),
      TableName: this.tableName,
      ConsistentRead: true,
    };
    let data;
    try {
      data = await this.dynamoDBClient.send(new GetItemCommand(getParams));
    } catch (err) {
      throw createAskSdkError("DynamoDbV3PersistenceAdapter", `Could not read item (${attributesId}) from table (${getParams.TableName}): ${err.message}`);
    }
    if (!data.Item) {
      return {};
    }
    const item = unmarshall(data.Item);
    return item[this.attributesName] || {};
  }

  async saveAttributes(requestEnvelope, attributes) {
    const attributesId = this.partitionKeyGenerator(requestEnvelope);
    const item = {
      [this.partitionKeyName]: attributesId,
      [this.attributesName]: attributes,
    };
    const putParams = {
      Item: marshall(item, { removeUndefinedValues: true, convertEmptyValues: true }),
      TableName: this.tableName,
    };
    try {
      await this.dynamoDBClient.send(new PutItemCommand(putParams));
    } catch (err) {
      throw createAskSdkError("DynamoDbV3PersistenceAdapter", `Could not save item (${attributesId}) to table (${putParams.TableName}): ${err.message}`);
    }
  }

  async deleteAttributes(requestEnvelope) {
    const attributesId = this.partitionKeyGenerator(requestEnvelope);
    const deleteParams = {
      Key: marshall({ [this.partitionKeyName]: attributesId }),
      TableName: this.tableName,
    };
    try {
      await this.dynamoDBClient.send(new DeleteItemCommand(deleteParams));
    } catch (err) {
      throw createAskSdkError("DynamoDbV3PersistenceAdapter", `Could not delete item (${attributesId}) from table (${deleteParams.TableName}): ${err.message}`);
    }
  }
}

function getPersistenceAdapter() {
  if (process.env.SKIP_DYNAMODB === "true") {
    return new NoOpPersistenceAdapter();
  }
  
  if (process.env.DYNAMODB_LOCAL === "true") {
    const localClient = getLocalDynamoDBClient({ port: 8000 });
    return new DynamoDbV3PersistenceAdapter({
      tableName: "test-bins-table",
      createTable: true,
      dynamoDBClient: localClient,
      partitionKeyGenerator: (requestEnvelope) => {
        const userId = Alexa.getUserId(requestEnvelope);
        return userId.substring(userId.lastIndexOf(".") + 1);
      },
    });
  }
  
  const productionClient = new DynamoDBClient({
    region: process.env.DYNAMODB_PERSISTENCE_REGION || "us-east-1",
  });
  
  return new DynamoDbV3PersistenceAdapter({
    tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME || "bin-collections",
    createTable: false,
    dynamoDBClient: productionClient,
  });
}

module.exports = getPersistenceAdapter;
