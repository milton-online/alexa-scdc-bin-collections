# Product: Bin Collections Alexa Skill

An Alexa skill that tells users in South Cambridgeshire (UK) about their upcoming kerbside refuse collections. It queries the South Cambridgeshire District Council (SCDC) Azure-hosted waste calendar API to look up collection schedules by address.

## Core Functionality

- Reports the next upcoming bin collection (colour, type, date)
- Handles multiple bin types: blue (recycling), black (landfill), green (compostable), food caddy
- Warns users when a collection is tomorrow ("better get those bins out!")
- Asks if the user missed a collection when it was due that afternoon
- Flags "slipped collections" (collections not on the usual day)
- Supports querying by bin colour or waste category

## Key Constraints

- Only works for addresses in South Cambridgeshire, UK
- Requires the user to have a valid address configured on their Alexa device
- Requires the skill to have address/postcode permissions granted in the Alexa app
- The SCDC API does not return results for some business addresses

## Deployment

Deployed as an AWS Lambda function via the Alexa Skills Kit (ASK) CLI. Persistent state is stored in DynamoDB. The skill is published on the Alexa UK skill store.
