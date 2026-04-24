<!--
SPDX-FileCopyrightText: 2020-2024 Tim Cutts <tim@thecutts.org>

SPDX-License-Identifier: Apache-2.0
-->

# Description

This project contains an Alexa Skill which contacts an Azure web service run by
South Cambridgeshire District Council.  It looks up your address and reports
information about upcoming kerbside refuse collections.

# Usage

If you just want to enable the skill on your device, please visit [this Alexa QuickLink](https://alexa-skills.amazon.co.uk/apis/custom/skills/amzn1.ask.skill.a9f3e5f3-5a08-4a7a-a0fc-bc828e9787b0/launch).

## Running the test suite

To run the test suite, navigate to the lambda directory of the checkout and run:

`npm test`

## Deployment

Both deployment scripts require the [ASK CLI](https://developer.amazon.com/en-US/docs/alexa/smapi/quick-start-alexa-skills-kit-command-line-interface.html) (`ask`) to be installed and configured.

### `deploy.sh` — full deployment

```bash
./deploy.sh
```

Runs `ask deploy` with no flags. Deploys everything: Lambda code, skill manifest, interaction models, and CloudFormation infrastructure (IAM roles, DynamoDB table, Lambda resource policies). Use this for:

- First-time setup
- Changes to the skill manifest (`skill-package/skill.json`)
- Changes to interaction models (`skill-package/interactionModels/`)
- Changes to the CloudFormation stack (`infrastructure/cfn-deployer/skill-stack.yaml`)

Uses the default ASK CLI profile.

### `deploy-lambda.sh` — Lambda-only deployment

```bash
./deploy-lambda.sh [profile]
```

Runs `ask deploy --target lambda`, skipping the manifest, interaction models, and infrastructure. This is faster and is the right choice when only Lambda code has changed.

**Branch-to-profile mapping** (used when no profile argument is given):

| Branch | ASK CLI profile | Environment |
|---|---|---|
| `dev` | `default` | Development |
| `master` / `main` | `live` | Production |
| anything else | — | exits with an error |

**Optional profile argument**: pass a profile name to override branch detection:

```bash
./deploy-lambda.sh default   # deploy to development
./deploy-lambda.sh live      # deploy to production
```

If you are on a feature branch, you must supply the profile manually — the script will not guess.

## Debugging locally in VSCode

Debugging locally within VSCode requires the use of a local DynamoDB installation.
This is most easily installed and run using a Docker container, so you will need docker desktop installed.

1. In a terminal window, navigate to the `dynamodb-local` directory, and run `docker compose up`.  This will run dynamodb in a container on port 8000.  You should see a summary of information about the container.
2. You can inspect the contents of the local dynamodb database with:
```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000
```
3. Start the debugger by pressing F5
4. AWS will now begin routing requests for the development version to the local copy of the skill, until you stop the debugger again.  Note there are some prerequisites to this working, so please see [Amazon's documentation](https://developer.amazon.com/en-US/docs/alexa/ask-toolkit/vs-code-testing-simulator.html)

References:

* DZone article on local dynamodb: https://dzone.com/articles/alexa-skill-with-local-dynamodb

* Debugging Alexa skills with VSCode: https://developer.amazon.com/en-US/docs/alexa/ask-toolkit/vs-code-testing-simulator.html

## IAM Permissions

The Lambda function requires an execution role with the following permissions:

| Service | Actions | Resource |
|---|---|---|
| CloudWatch Logs | `logs:*` | `arn:aws:logs:*:*:*` |
| DynamoDB | `GetItem`, `PutItem`, `UpdateItem`, `DeleteItem` | `arn:aws:dynamodb:{region}:{account}:table/bin-collections` |

In addition, the Lambda function itself must allow invocation by the Alexa service. This is configured as a resource-based policy (not an IAM role permission) granting `lambda:invokeFunction` to:
- `alexa-appkit.amazon.com`
- `alexa-connectedhome.amazon.com`

**When deploying via `ask deploy` / `deploy.sh`**: all of the above — the IAM execution role, its policies, and the Lambda resource-based permissions — are automatically provisioned by the CloudFormation stack at `infrastructure/cfn-deployer/skill-stack.yaml`. No manual setup is required.

**When deploying the Lambda manually via `deploy-lambda.sh`**: the Lambda function must already be associated with an execution role that has the DynamoDB and CloudWatch Logs permissions listed above. The resource-based permissions for Alexa invocation must also be configured separately (e.g. via the AWS Console or CLI).

# Author

Tim Cutts <tim@thecutts.org>

## Relationship with South Cambridgeshire District Council

South Cambridgeshire District Council are not responsible for this Alexa Skill
in any way, other than providing the backend web service with which it
communicates.

Please do not contact them with requests for support or enhancement requests.
