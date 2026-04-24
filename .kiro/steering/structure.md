# Project Structure

## Root Layout

```
/
├── lambda/              # Main skill source code (canonical)
├── .ask/lambda/         # Mirror of lambda/ used by ASK CLI (keep in sync)
├── test/                # Mocha test suite
├── skill-package/       # Alexa skill manifest and interaction models
├── infrastructure/      # CloudFormation stack definition
├── dynamodb-local/      # Docker Compose config for local DynamoDB
├── assets/              # Bin icon images (source)
└── deploy.sh            # Deployment script (wraps `ask deploy`)
```

> **Note**: `lambda/` and `.ask/lambda/` are duplicates. The source of truth is `lambda/`. Changes must be kept in sync.

## lambda/ — Skill Source

```
lambda/
├── index.js                        # Lambda entry point; wires up all handlers
├── constants.js                    # Shared constants (URLs, TTLs, test IDs)
├── messages.js                     # All user-facing speech strings
├── bincollection.js                # BinCollection class (domain model)
├── speakabledate.js                # Date wrapper with speech formatting
├── searchcollections.js            # Collection search/filter logic
├── sessiondata.js                  # Fetches and manages session/persistent data
├── cacheManager.js                 # Cache staleness checks
├── alexadevice.js                  # Device address/postcode resolution
├── getJSON.js                      # Axios HTTP wrapper
├── memoryCache.js                  # In-memory cache
├── progressiveLoader.js            # Progressive response loading
├── persistenceAdapter.js           # DynamoDB adapter factory (prod/local/noop)
├── intents/                        # One file per intent handler
│   ├── LaunchRequestHandler.js
│   ├── WhichBinTodayIntentHandler.js
│   ├── NextColourBinIntentHandler.js
│   ├── MissedBinCollectionIntentHandler.js
│   ├── WhoPutTheBinsOutIntentHandler.js
│   ├── GetFreshDataIntentHandler.js
│   ├── SetLogLevelIntentHandler.js
│   ├── YesIntentHandler.js
│   ├── NoIntentHandler.js
│   ├── HelpIntentHandler.js
│   ├── CancelAndStopIntentHandler.js
│   ├── SessionEndedRequestHandler.js
│   ├── IntentReflectorHandler.js
│   └── slotResolver.js
├── interceptors/
│   ├── LoadBinCollectionsInterceptor.js   # Request interceptor: loads/refreshes data
│   └── PersistenceSavingInterceptor.js    # Response interceptor: saves dirty state
└── errors/
    ├── ErrorHandler.js                    # Global Alexa error handler
    └── dataerror.js                       # DataError class (has .speech property)
```

## test/ — Test Suite

Tests are numbered and run in order by mocha. Each file targets a single module:

```
test/
├── setup.js                  # Global setup: disables logging, sets SKIP_DYNAMODB=true
├── 01_test_speakabledate.js
├── 02_test_memoryCache.js
├── 03_test_alexadevice.js
├── 04_test_bincollection.js
├── 05_test_getJSON.js
├── 06_test_errorhandler.js
├── 07_test_cacheManager.js
├── 08_test_searchcollections.js
├── 09_test_persistenceAdapter.js
├── 10_test_progressiveLoader.js
├── 11_test_sessiondata.js
├── 12_test_intents.js
└── 13_test_skill.js
```

Tests import directly from `lambda/` using `NODE_PATH=lambda/node_modules`.

## skill-package/ — Alexa Skill Manifest

```
skill-package/
├── skill.json                              # Skill metadata and publishing info
├── assets/images/                          # Skill store icons (en-GB)
└── interactionModels/custom/en-GB.json     # Intent schema, utterances, slots
```

## Architecture Patterns

### Intent Handlers
Each intent is a plain object with `canHandle(handlerInput)` and `handle(handlerInput)` methods, exported as a single module. Registered in `index.js` via a dynamic `require` loop.

### Request/Response Interceptors
- `LoadBinCollectionsInterceptor` — runs before every request; resolves device address, checks cache staleness, fetches fresh data from SCDC API if needed
- `PersistenceSavingInterceptor` — runs after every response; persists session attributes to DynamoDB only when `attributes.areDirty === true`

### Error Handling
- `DataError` — thrown for known data/API failures; carries a `.speech` string for user-facing responses
- `ErrorHandler` — catches all errors; uses `error.speech` if available, otherwise returns a generic error message

### State Management
Session attributes are the primary state store during a session. They are loaded from DynamoDB at the start of each request and saved back only when dirty. Key attributes: `collections`, `fetchedOnDate`, `deviceId`, `alexaDevice`, `missedQuestion`, `areDirty`.

### Caching
Collections are cached in DynamoDB with a 7-day TTL. Cache is invalidated if the device/address changes, or if the first collection date is in the past.

## Licensing
All source files carry SPDX headers:
```js
// SPDX-FileCopyrightText: <year> Tim Cutts <tim@thecutts.org>
// SPDX-License-Identifier: Apache-2.0
```
New files must include these headers.
