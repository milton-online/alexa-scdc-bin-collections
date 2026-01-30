# Alexa Skill Development Rules

This is an Alexa Skill for South Cambridgeshire bin collections.

## Key Architecture
- Lambda function in `lambda/` directory
- Interaction model in `skill-package/interactionModels/custom/en-GB.json`
- Tests use ask-sdk-test framework
- Bin types: RECYCLE (blue), DOMESTIC (black), ORGANIC (green), FOOD (food caddy)

## Development Guidelines
- Run tests with `npm test` from lambda directory
- Deploy with `ask deploy` using AmazonBuilder profile
- Use DataError for user-facing errors
- Follow existing code patterns for new bin types

