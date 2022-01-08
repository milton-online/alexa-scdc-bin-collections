/* Copyright 2020-2022 Tim Cutts <tim@thecutts.org>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

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
