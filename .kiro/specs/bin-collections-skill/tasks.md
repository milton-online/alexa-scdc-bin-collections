# Tasks: Bin Collections Alexa Skill

These tasks represent the current implementation state and areas for improvement. Completed items reflect what is already built; open items are gaps or enhancements identified during spec review.

## 1. Core Domain Model

- [x] 1.1 `BinCollection` class with constructor, `getColoursSpeech()`, `getDateSpeech()`, image URL methods
- [x] 1.2 `SpeakableDate` class extending `Date` with `isToday()`, `isTomorrow()`, `isThisAfternoon()`, `getDateSpeech()`
- [x] 1.3 Static `getBinType()` throwing `DataError` for unknown bin types
- [x] 1.4 `_formatColoursSpeech()` handling 1, 2, and 3+ bin types with correct grammar

## 2. Address and Device Resolution

- [x] 2.1 `AlexaDevice.getAddressFromDevice()` with error handling for 403, 204, and other failures
- [x] 2.2 `AlexaDevice.getPostcodeFromAddress()` normalising UK postcodes (removing space)
- [x] 2.3 Certification address mapping (US `20146` → `CB246ZD`)
- [x] 2.4 `isSameLocationAsDevice()` for cache invalidation on address change
- [x] 2.5 `AlexaDevice.callDirectiveService()` for progressive "Just a moment..." response

## 3. SCDC API Integration

- [x] 3.1 `getJSON()` with axios, 3s timeout, and host allowlist validation
- [x] 3.2 `getPostcodeSearchFromSCDCWeb()` with `DataError` on empty results
- [x] 3.3 `getCollectionsFromLocationList()` with parallel requests (up to 3 locations)
- [x] 3.4 `getLocationListFromSearchResults()` placing matched house number first

## 4. Caching and Session State

- [x] 4.1 DynamoDB persistence adapter factory supporting prod, local, and no-op modes
- [x] 4.2 `attributesAreStale()` checking device ID, address, age, and first collection date
- [x] 4.3 `areDirty` flag gating DynamoDB writes in `PersistenceSavingInterceptor`
- [x] 4.4 `MemoryCache` LRU in-memory cache with TTL and max-size eviction
- [x] 4.5 `CacheManager` static helpers for collection and postcode cache staleness
- [x] 4.6 Wire `MemoryCache` into postcode lookup to avoid redundant SCDC API calls within a warm Lambda container

## 5. Request Lifecycle

- [x] 5.1 `LoadBinCollectionsInterceptor` loading persistent attributes and refreshing stale data
- [x] 5.2 `PersistenceSavingInterceptor` saving dirty attributes after each response
- [x] 5.3 Skill builder in `index.js` wiring all handlers, interceptors, and error handler

## 6. Intent Handlers

- [x] 6.1 `LaunchRequestHandler` — next collection with card and tomorrow reminder
- [x] 6.2 `WhichBinTodayIntentHandler` — today/tomorrow/none response
- [x] 6.3 `NextColourBinIntentHandler` — next collection by bin type with slot resolution
- [x] 6.4 `MissedBinCollectionIntentHandler` — next collection after last reported
- [x] 6.5 `GetFreshDataIntentHandler` — forced refresh with `DataError` handling
- [x] 6.6 `YesIntentHandler` — delegates to missed collection or "I didn't ask you a question"
- [x] 6.7 `NoIntentHandler` — ends session when `missedQuestion=true`
- [x] 6.8 `HelpIntentHandler` — help text with reprompt and card
- [x] 6.9 `CancelAndStopIntentHandler` — goodbye and session end
- [x] 6.10 `SetLogLevelIntentHandler` — runtime log level change
- [x] 6.11 `WhoPutTheBinsOutIntentHandler` — easter egg response
- [x] 6.12 `SessionEndedRequestHandler` — no-op session cleanup
- [x] 6.13 `IntentReflectorHandler` — catch-all for unhandled intents

## 7. Error Handling

- [x] 7.1 `DataError` class with `.speech` property for user-facing messages
- [x] 7.2 `ErrorHandler` using `error.speech` when available, generic message otherwise
- [x] 7.3 All user-facing strings centralised in `messages.js`

## 8. Test Coverage

- [x] 8.1 `SpeakableDate` unit tests
- [x] 8.2 `MemoryCache` unit tests
- [x] 8.3 `AlexaDevice` unit tests
- [x] 8.4 `BinCollection` unit tests including error cases and image URL validation
- [x] 8.5 `getJSON` unit tests with nock HTTP mocking
- [x] 8.6 `ErrorHandler` unit tests
- [x] 8.7 `CacheManager` unit tests
- [x] 8.8 `searchcollections` unit tests
- [x] 8.9 `persistenceAdapter` unit tests
- [x] 8.10 `progressiveLoader` unit tests
- [x] 8.11 `sessiondata` unit tests
- [x] 8.12 Intent handler unit tests
- [x] 8.13 End-to-end skill integration tests
- [x] 8.14 Add property-based tests for `_formatColoursSpeech()` — verify the Oxford-comma-free list format holds for any array length >= 1
- [x] 8.15 Add property-based tests for `attributesAreStale()` — verify staleness is monotonically true as `fetchedOnDate` ages past the 7-day threshold
- [x] 8.16 Add property-based tests for `getLocationListFromSearchResults()` — verify matched address is always first when present, and all IDs are always included

## 9. Infrastructure and Deployment

- [x] 9.1 CloudFormation stack definition (`infrastructure/cfn-deployer/skill-stack.yaml`)
- [x] 9.2 `deploy.sh` wrapping `ask deploy`
- [x] 9.3 Local DynamoDB Docker Compose setup
- [x] 9.4 `.vscode` launch configuration for local debugging
- [x] 9.5 Document required IAM permissions for Lambda execution role in README
- [x] 9.6 Add `deploy-lambda.sh` documentation — clarify when to use vs `deploy.sh`

## 10. Migrate AWS SDK v2 to v3

- [x] 10.1 Replace `aws-sdk` dependency with `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` in `lambda/package.json`
- [x] 10.2 Update `lambda/persistenceAdapter.js` to import `DynamoDBClient` from `@aws-sdk/client-dynamodb` and construct v3 clients instead of using `AWS.DynamoDB`
- [x] 10.3 Update `test/09_test_persistenceAdapter.js` to remove `require("aws-sdk")` and update any v2-specific assertions (e.g. `AWS.config.update` spy) to use v3 client patterns
- [x] 10.4 Run `npm install` in `lambda/` to install v3 packages and remove v2
- [x] 10.5 Run full test suite to verify no regressions from the SDK migration
- [x] 10.6 Sync updated files to `.ask/lambda/` directory
