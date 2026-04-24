# Tech Stack

## Runtime & Language
- **Node.js** >= 20.0.0
- **JavaScript** (CommonJS modules, `"use strict"` in main files)
- ES2021 syntax (configured in ESLint)

## Core Dependencies
- **ask-sdk-core** — Alexa Skills Kit SDK for request handling, response building
- **ask-sdk-dynamodb-persistence-adapter** — DynamoDB persistence for session state
- **aws-sdk** v2 — AWS service access (DynamoDB)
- **axios** — HTTP requests to the SCDC waste calendar API
- **loglevel** — Runtime-configurable logging (`log.setLevel`, `log.info`, `log.debug`)

Core dependencies should be kept up to date to minimise security vulnerabilities if possible.

## Dev Dependencies
- **mocha** — Test runner
- **should** — BDD assertion library (`value.should.equal(...)`)
- **sinon** — Stubs and spies
- **nock** — HTTP request mocking
- **ask-sdk-test** — Alexa skill testing utilities
- **nyc** — Code coverage (HTML reporter)
- **eslint** — Linting (`eslint:recommended` + custom rules)

Security vulnerabilities in dev dependencies should be minimised, only if it's simple to do so.

## Infrastructure
- **AWS Lambda** — Skill handler (`exports.handler`)
- **AWS DynamoDB** — Persistent attributes (device/user state, cached collections)
- **CloudFormation** — Infrastructure as code (`infrastructure/cfn-deployer/skill-stack.yaml`)
- **ASK CLI** — Deployment (`ask deploy`)

## Common Commands

All test/coverage commands must be run from the `lambda/` directory:

```bash
# Run tests
cd lambda && npm test

# Run with coverage report (outputs to .nyc_output/)
cd lambda && npm run coverage

# Lint
cd lambda && npx eslint .

# Deploy skill (from repo root)
./deploy.sh   # runs: ask deploy

# Local DynamoDB (for VSCode debugging)
cd dynamodb-local && docker compose up
```

## Environment Variables
| Variable | Purpose |
|---|---|
| `LOG_LEVEL` | loglevel level (default: `info`) |
| `SKIP_DYNAMODB` | Set to `"true"` to use no-op persistence (used in tests) |
| `DYNAMODB_LOCAL` | Set to `"true"` to use local DynamoDB on port 8000 |
| `DYNAMODB_PERSISTENCE_REGION` | AWS region for production DynamoDB |
| `DYNAMODB_PERSISTENCE_TABLE_NAME` | DynamoDB table name (default: `bin-collections`) |
| `DEBUG_TESTS` | Set to enable logging during test runs |

## Linting Rules
- Extends `eslint:recommended`
- `no-unused-vars` is an error (except `should` which is imported for side effects)
- Environments: `browser`, `commonjs`, `node`, `es6`, `mocha`
