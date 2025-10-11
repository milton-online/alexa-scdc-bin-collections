// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const AWS = require("aws-sdk");
const ddbAdapter = require("ask-sdk-dynamodb-persistence-adapter");
const process = require("process");
const Alexa = require("ask-sdk-core");

function getLocalDynamoDBClient(options) {
  AWS.config.update({
    region: "eu-west-1",
    endpoint: `http://localhost:${options.port}`,
  });

  return new AWS.DynamoDB();
}

class NoOpPersistenceAdapter {
  async getAttributes() {
    return {};
  }
  async saveAttributes() {}
  async deleteAttributes() {}
}

function getPersistenceAdapter() {
  if (process.env.SKIP_DYNAMODB === "true") {
    return new NoOpPersistenceAdapter();
  }
  
  if (process.env.DYNAMODB_LOCAL === "true") {
    const localClient = getLocalDynamoDBClient({ port: 8000 });
    return new ddbAdapter.DynamoDbPersistenceAdapter({
      tableName: "test-bins-table",
      createTable: true,
      dynamoDBClient: localClient,
      partitionKeyGenerator: (requestEnvelope) => {
        const userId = Alexa.getUserId(requestEnvelope);
        return userId.substring(userId.lastIndexOf(".") + 1);
      },
    });
  }
  
  const productionClient = new AWS.DynamoDB({
    apiVersion: "latest",
    region: process.env.DYNAMODB_PERSISTENCE_REGION || "us-east-1",
  });
  
  return new ddbAdapter.DynamoDbPersistenceAdapter({
    tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME || "bin-collections",
    createTable: false,
    dynamoDBClient: productionClient,
  });
}

module.exports = getPersistenceAdapter;
