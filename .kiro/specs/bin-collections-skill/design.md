# Design: Bin Collections Alexa Skill

## Overview

An Alexa skill that queries the South Cambridgeshire District Council (SCDC) waste calendar API and reports upcoming kerbside refuse collection information to users. The skill resolves the user's address from their Alexa device, looks up their collection schedule, and responds with spoken and card-based output.

---

## High-Level Design

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Alexa Service                        │
│  (speech recognition, intent routing, device address API)   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (Lambda invocation)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    AWS Lambda Function                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Request Interceptor: LoadBinCollectionsInterceptor  │   │
│  │  - Resolve device address via Alexa Device API       │   │
│  │  - Check DynamoDB cache for stale/missing data       │   │
│  │  - Fetch fresh data from SCDC API if needed          │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                               │
│  ┌──────────────────────────▼───────────────────────────┐   │
│  │              Intent Handlers (13 handlers)           │   │
│  │  LaunchRequest / NextBinCollectionIntent             │   │
│  │  WhichBinTodayIntent                                 │   │
│  │  NextColourBinIntent                                 │   │
│  │  MissedBinCollectionIntent                           │   │
│  │  GetFreshDataIntent                                  │   │
│  │  SetLogLevelIntent                                   │   │
│  │  WhoPutTheBinsOutIntent                              │   │
│  │  AMAZON.YesIntent / AMAZON.NoIntent                  │   │
│  │  AMAZON.HelpIntent / AMAZON.CancelAndStopIntent      │   │
│  │  SessionEndedRequest / IntentReflector               │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                               │
│  ┌──────────────────────────▼───────────────────────────┐   │
│  │  Response Interceptor: PersistenceSavingInterceptor  │   │
│  │  - Save session attributes to DynamoDB if dirty      │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                               │
└─────────────────────────────┼───────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
│  AWS DynamoDB │   │   SCDC Azure API  │   │  Alexa Device│
│  (persistent  │   │  (waste calendar) │   │  Address API │
│   attributes) │   │                  │   │              │
└──────────────┘   └──────────────────┘   └──────────────┘
```

### Data Flow: Typical Request

1. Alexa invokes Lambda with a request envelope
2. `LoadBinCollectionsInterceptor` runs:
   - Reads session attributes; if no `deviceId`, loads from DynamoDB
   - Calls Alexa Device Address API to get the device's full address and postcode
   - Calls `attributesAreStale()` — if stale, fetches fresh data from SCDC API and writes to DynamoDB
3. The matching intent handler runs, reads session attributes, builds a spoken + card response
4. `PersistenceSavingInterceptor` runs: if `attributes.areDirty === true`, saves to DynamoDB

### External API: SCDC Waste Calendar

Base URL: `https://servicelayer3c.azure-api.net/wastecalendar`

| Endpoint | Purpose |
|---|---|
| `GET /address/search/?postCode={postcode}` | Returns list of addresses/location IDs for a postcode |
| `GET /collection/search/{locationId}/?numberOfCollections=12` | Returns upcoming collections for a location |

Collection object shape:
```json
{
  "date": "2025-06-15T00:00:00Z",
  "roundTypes": ["ORGANIC", "RECYCLE"],
  "slippedCollection": false
}
```

### Caching Strategy

- Collections and postcode lookups are cached in DynamoDB per device, with a 7-day TTL
- Cache is invalidated if: device ID changes, address changes, first cached collection is in the past, or data is older than 7 days
- An in-memory `MemoryCache` (LRU, max 100 entries, 5-min TTL) is available for within-container reuse across warm Lambda invocations
- `areDirty` flag on session attributes gates DynamoDB writes — only written when state has changed

### Bin Types

| API Key | Colour | Name |
|---|---|---|
| `RECYCLE` | blue | recycling |
| `DOMESTIC` | black | landfill |
| `ORGANIC` | green | compostable |
| `FOOD` | food caddy | food waste |

---

## Low-Level Design

### Key Classes and Modules

#### `BinCollection` (bincollection.js)
Domain model for a single collection event.

```
constructor(jsondata)
  - Assigns all JSON fields
  - Wraps date as SpeakableDate

static getBinType(binType: string): BinTypeObject   // throws DataError if unknown
static getColourForBinType(binType): string
static getNameForBinType(binType): string

getDateSpeech(): string
  - Returns "today." / "tomorrow." / "on Mon Jan 01."
  - Appends slipped collection notice if applicable
  - Appends "Better get that/those bin(s) out!" if tomorrow
  - Appends missed-collection prompt if this afternoon

getColoursSpeech(): string
  - Single: "green bin"
  - Two: "green and blue bins"
  - Three+: "green, blue and black bins"

isToday() / isTomorrow() / isThisAfternoon(): boolean
getSmallImageUrl() / getLargeImageUrl(): string   // HTTPS URLs for Alexa cards
```

#### `SpeakableDate` (speakabledate.js)
Extends `Date` with speech-oriented helpers.

```
isToday(): boolean
isTomorrow(): boolean
isThisAfternoon(): boolean   // today AND hour >= 12
isSameDateAs(date): boolean
getDateSpeech(): string      // "today." | "tomorrow." | "on Mon Jan 01."
setToMidnight(): this
addDays(n): this
clone(): SpeakableDate
```

#### `AlexaDevice` (alexadevice.js)
Handles device address resolution and postcode extraction.

```
async getAddressFromDevice(handlerInput): this
  - Calls Alexa Device Address Service API
  - Throws DataError(NOTIFY_MISSING_PERMISSIONS) on 403
  - Throws DataError(NO_ADDRESS) on 204 / null address
  - Throws DataError(LOCATION_FAILURE) on other errors

getPostcodeFromAddress(): this
  - Extracts and normalises UK postcode (removes space)
  - Maps Amazon certification address (US 20146) → CB246ZD

isSameLocationAsDevice(otherDevice): boolean
  - Compares addressLine1 and postalCode (case-insensitive)

static getConsentToken(requestEnvelope): string   // throws DataError if missing
static async callDirectiveService(handlerInput, message): Promise
  // Sends progressive "Just a moment..." response; failures are silently ignored
```

#### `sessiondata.js`
Orchestrates data fetching and session state.

```
attributesAreStale(attributes, thisDevice): boolean
  - Returns true if: no collections, no alexaDevice, device ID mismatch,
    address mismatch, or fetchedOnDate older than 7 days from midnight today

async getFreshAttributes(handlerInput, alexaDevice): void
  - Fetches fresh data, sets both session and persistent attributes

async getFreshSessionData(handlerInput, alexaDevice): object
  - Sends progressive directive ("Just a moment...")
  - Calls getLocationList() → getCollectionsFromLocationList()
  - Returns attributes object with collections, fetchedOnDate, deviceId, etc.

Internal.getLocationListFromSearchResults(results, address): string[]
  - Extracts location IDs; puts matched house number first

Internal.getPostcodeSearchFromSCDCWeb(postcode): Promise<object[]>
  - Throws DataError(POSTCODE_LOOKUP_FAIL) if no results

Internal.getCollectionsFromLocationList(locationList): Promise<{collections}>
  - Tries up to 3 locations in parallel
  - Returns first result with >= 1 collection
  - Throws DataError(NO_DATA_RETURNED) if all fail
```

#### `searchcollections.js`

```
getNextCollection(sessionData, testfunc?): BinCollection | undefined
  - Finds first collection >= midnightToday AND > lastReportedBinTime
  - Applies optional filter function

getNextCollectionOfType(sessionData, binType): BinCollection | undefined
  - Calls getNextCollection with roundTypes.includes(binType) filter
```

#### `getJSON.js`

```
getJSON(url, timeout?): Promise<object>
  - Validates URL host against allowlist (servicelayer3c.azure-api.net, localhost)
  - Throws DataError(WEB_ERROR) on non-2xx response
  - Throws DataError(WEB_TIMEOUT) on timeout/network error
  - Default timeout: 3000ms (overridable via HTTP_TIMEOUT env var)
```

#### `persistenceAdapter.js`

```
getPersistenceAdapter(): PersistenceAdapter
  - SKIP_DYNAMODB=true  → NoOpPersistenceAdapter (used in tests)
  - DYNAMODB_LOCAL=true → local DynamoDB on port 8000
  - default             → production DynamoDB (region from DYNAMODB_PERSISTENCE_REGION)
```

#### `CacheManager` (cacheManager.js)

```
static shouldRefreshCollections(attributes): boolean
  - True if: no collections, no fetchedOnDate, age > 7 days, or first collection in past

static shouldRefreshPostcode(attributes): boolean
  - True if: no postcodeCache, or postcodeCacheDate > 7 days old
```

#### `MemoryCache` (memoryCache.js)
LRU in-memory cache, singleton exported as `globalCache`.

```
set(key, value, ttl = 300000): void   // evicts oldest entry when at maxSize (100)
get(key): value | null                // returns null if expired
clear(): void
```

### Session Attributes Schema

| Attribute | Type | Description |
|---|---|---|
| `collections` | `object[]` | Raw collection objects from SCDC API |
| `fetchedOnDate` | `number` | `Date.now()` timestamp of last fetch |
| `midnightToday` | `number` | Midnight timestamp for today (set on each request) |
| `deviceId` | `string` | Alexa device ID of the cached data |
| `alexaDevice` | `object` | Serialised `AlexaDevice` instance |
| `lastReportedBinTime` | `number` | Timestamp of last collection reported to user |
| `currentBinType` | `string` | Last bin type reported (e.g. `"ORGANIC"`) |
| `missedQuestion` | `boolean` | Whether the skill asked "did you miss it?" |
| `areDirty` | `boolean` | Whether attributes need persisting to DynamoDB |

### Intent Handler Summary

| Handler | Trigger | Behaviour |
|---|---|---|
| `LaunchRequestHandler` | `LaunchRequest` or `NextBinCollectionIntent` | Reports next upcoming collection with colour, date, and card |
| `WhichBinTodayIntentHandler` | `WhichBinTodayIntent` | Reports today's collection; if none today, reports tomorrow's |
| `NextColourBinIntentHandler` | `NextColourBinIntent` | Reports next collection of a specific bin type (slot: `binType`) |
| `MissedBinCollectionIntentHandler` | `MissedBinCollectionIntent` | Reports the next collection after the last reported one |
| `GetFreshDataIntentHandler` | `GetFreshDataIntent` | Forces a fresh fetch from SCDC API |
| `SetLogLevelIntentHandler` | `SetLogLevelIntent` | Sets loglevel at runtime (slot: `logLevel`) |
| `WhoPutTheBinsOutIntentHandler` | `WhoPutTheBinsOutIntent` | Responds with "Who, Who, Who Who" |
| `YesIntentHandler` | `AMAZON.YesIntent` | If `missedQuestion=true`, delegates to `MissedBinCollectionIntentHandler`; otherwise says "I didn't ask you a question" |
| `NoIntentHandler` | `AMAZON.NoIntent` (only when `missedQuestion=true`) | Ends session with "Bye then!" |
| `HelpIntentHandler` | `AMAZON.HelpIntent` | Returns help text and reprompt |
| `CancelAndStopIntentHandler` | `AMAZON.CancelIntent` / `AMAZON.StopIntent` | Ends session with "Goodbye" |
| `SessionEndedRequestHandler` | `SessionEndedRequest` | No-op (session cleanup) |
| `IntentReflectorHandler` | Any unhandled intent | Echoes intent name (catch-all for debugging) |

### Error Handling

- `DataError` — known failures (API errors, missing permissions, bad postcode). Has a `.speech` property for user-facing messages.
- `ErrorHandler` — global catch-all. Uses `error.speech` if present, otherwise returns the generic `ERROR` message with SSML interjection.
- HTTP errors from SCDC API are mapped to `DataError` with appropriate speech in `getJSON.js`.
- Address API errors are mapped to `DataError` in `alexadevice.js`.

### Certification Address Handling

Amazon uses a fixed US address (`20146`) during skill certification testing. The skill detects this and maps it to a valid SCDC postcode (`CB246ZD`) so certification requests succeed.

### Logging

Uses `loglevel`. Level is set from `LOG_LEVEL` env var (default: `info`). Can be changed at runtime via `SetLogLevelIntent`. All logging is disabled during tests unless `DEBUG_TESTS` is set.
