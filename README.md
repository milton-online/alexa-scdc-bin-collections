# Description

This project contains an Alexa Skill which contacts an Azure web service run by
South Cambridgeshire District Council.  It looks up your address and reports
information about upcoming kerbside refuse collections.

# Usage

If you just want to enable the skill on your device, please visit [this Alexa QuickLink](https://alexa-skills.amazon.co.uk/apis/custom/skills/amzn1.ask.skill.a9f3e5f3-5a08-4a7a-a0fc-bc828e9787b0/launch).

## Running the test suite

To run the test suite, navigate to the lambda directory of the checkout and run:

`npm test`

## Debugging locally in VSCode

Debugging locally within VSCode requires the use of a local DynamoDB installation.
This is most easily installed and run using a Docker container, so you will need docker desktop installed.

1. In a terminal window, navigate to the `dynamodb-local` directory, and run `docker-compose up`.  This will run dynamodb in a container on port 8000.  You should see a summary of information about the container.
2. You can inspect the contents of the local dynamodb database with:
```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000
```
3. Start the debugger by pressing F5
4. AWS will now begin routing requests for the development version to the local copy of the skill, until you stop the debugger again.  Note there are some prerequisites to this working, so please see [Amazon's documentation](https://developer.amazon.com/en-US/docs/alexa/ask-toolkit/vs-code-testing-simulator.html)

References:

* DZone article on local dynamodb: https://dzone.com/articles/alexa-skill-with-local-dynamodb

* Debugging Alexa skills with VSCode: https://developer.amazon.com/en-US/docs/alexa/ask-toolkit/vs-code-testing-simulator.html

# Author

Tim Cutts <tim@thecutts.org>

## Relationship with South Cambridgeshire District Council

South Cambridgeshire District Council are not responsible for this Alexa Skill
in any way, other than providing the backend web service with which it
communicates.

Please do not contact them with requests for support or enhancement requests.
