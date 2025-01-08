// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
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

function getPersistenceAdapter() {
  if (process.env.DYNAMODB_LOCAL === "true") {
    return new ddbAdapter.DynamoDbPersistenceAdapter({
      tableName: "test-bins-table",
      createTable: true,
      dynamoDBClient: getLocalDynamoDBClient({ port: 8000 }),
      partitionKeyGenerator: (requestEnvelope) => {
        const userId = Alexa.getUserId(requestEnvelope);
        return userId.substring(userId.lastIndexOf(".") + 1);
      },
    });
  } else {
    return new ddbAdapter.DynamoDbPersistenceAdapter({
      tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
      createTable: false,
      dynamoDBClient: new AWS.DynamoDB({
        apiVersion: "latest",
        region: process.env.DYNAMODB_PERSISTENCE_REGION,
      }),
    });
  }
}

module.exports = getPersistenceAdapter;
