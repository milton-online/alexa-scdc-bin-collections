# Requirements: Bin Collections Alexa Skill

## Overview

The Bin Collections skill is an Alexa skill for residents of South Cambridgeshire, UK. It uses the device's configured address to look up upcoming kerbside refuse collection schedules from the SCDC waste calendar API and reports them via voice and Alexa cards.

---

## User Stories

### US-1: Next Collection

**As a** South Cambridgeshire resident,  
**I want to** ask Alexa when my next bin collection is,  
**so that** I know which bin to put out and when.

**Acceptance Criteria:**
- AC-1.1: When the skill is launched or `NextBinCollectionIntent` is invoked, it responds with the colour(s) and date of the next upcoming collection.
- AC-1.2: The response includes a standard Alexa card with the collection details and a bin colour image.
- AC-1.3: If the next collection is tomorrow, the response appends "Better get that/those bin(s) out!"
- AC-1.4: If the next collection is today, and the current time is after midday the session stays open and the skill asks "Did you miss it?"
- AC-1.5: If no upcoming collections are found, the skill throws an error.

---

### US-2: Which Bin Today

**As a** resident,  
**I want to** ask which bin is collected today,  
**so that** I don't have to remember the schedule.

**Acceptance Criteria:**
- AC-2.1: If there is a collection today, the skill responds with the colour(s) of today's bin.
- AC-2.2: If there is no collection today but one tomorrow, the skill says there is no collection today and mentions tomorrow's bin.
- AC-2.3: If there is no collection today or tomorrow, the skill says there is no collection due today.

---

### US-3: Next Collection by Bin Type

**As a** resident,  
**I want to** ask when a specific bin colour or waste type is next collected,  
**so that** I can plan ahead for a particular bin.

**Acceptance Criteria:**
- AC-3.1: The skill accepts a `binType` slot resolved to one of: `RECYCLE`, `DOMESTIC`, `ORGANIC`, `FOOD`.
- AC-3.2: The skill responds with the date of the next collection of that type.
- AC-3.3: If the collection is today, the session stays open and the skill asks "Did you miss it?"
- AC-3.4: If no upcoming collection of that type is found, the skill throws an error.

---

### US-4: Missed Collection Follow-up

**As a** resident who may have missed a collection,  
**I want to** ask about the next collection after the one I missed,  
**so that** I know when to try again.

**Acceptance Criteria:**
- AC-4.1: When the skill has asked "Did you miss it?" and the user says "Yes", the skill reports the next collection of the same bin type after the last reported one.
- AC-4.2: When the user says "No" after the missed-collection question, the skill ends the session with "Bye then!"
- AC-4.3: If the user says "Yes" when no missed-collection question was asked, the skill responds "I didn't ask you a question."
- AC-4.4: If there is no further collection of that type, the skill responds "Sorry, I don't know when the next collection after that is yet."

---

### US-5: Address and Permissions

**As a** resident,  
**I want to** be guided to set up my address if it's missing,  
**so that** the skill can look up my specific collection schedule.

**Acceptance Criteria:**
- AC-5.1: If the skill does not have permission to access the device address, it prompts the user to grant permission via the Alexa app.
- AC-5.2: If the device has no address configured, the skill tells the user to set their address in the Alexa app.
- AC-5.3: If the device has no postcode, the skill tells the user to set their address in the Alexa app.
- AC-5.4: If the postcode is not found in the SCDC database, the skill tells the user to check their address in the Alexa app.

---

### US-6: Data Freshness

**As a** resident,  
**I want** the skill to use up-to-date collection data,  
**so that** I'm not given outdated information.

**Acceptance Criteria:**
- AC-6.1: Collection data is cached per device in DynamoDB with a 7-day TTL.
- AC-6.2: The cache is invalidated if the device ID changes, the address changes, or the first cached collection date is in the past.
- AC-6.3: The user can explicitly request a data refresh by invoking `GetFreshDataIntent`.
- AC-6.4: When fetching fresh data, the skill sends a progressive "Just a moment..." response so the user knows it is working.
- AC-6.5: After a successful forced refresh, the skill confirms it is up to date and keeps the session open.

---

### US-7: Slipped Collections

**As a** resident,  
**I want to** be told when a collection is not on its usual day,  
**so that** I'm not caught out by schedule changes.

**Acceptance Criteria:**
- AC-7.1: If a collection has `slippedCollection: true`, the date speech appends "This collection is not on your usual day."

---

### US-8: Help

**As a** new user,  
**I want to** ask for help,  
**so that** I know what the skill can do.

**Acceptance Criteria:**
- AC-8.1: `AMAZON.HelpIntent` returns a spoken description of available queries and a reprompt.
- AC-8.2: A simple Alexa card is shown with the help text.

---

### US-9: Cancel and Stop

**As a** user,  
**I want to** be able to stop the skill at any time,  
**so that** I'm not stuck in a conversation.

**Acceptance Criteria:**
- AC-9.1: `AMAZON.CancelIntent` and `AMAZON.StopIntent` end the session with a goodbye message.

---

### US-10: Logging Control

**As a** developer,  
**I want to** control the log level at runtime,  
**so that** I can debug issues in production without redeploying.

**Acceptance Criteria:**
- AC-10.1: `SetLogLevelIntent` accepts a `logLevel` slot and sets the loglevel for the current Lambda container.
- AC-10.2: The skill confirms the new log level via speech and an Alexa card.

---

### US-11: Who Put the Bins Out

**As a** user,  
**I want to** ask who put the bins out,  
**so that** I can enjoy a small easter egg.

**Acceptance Criteria:**
- AC-11.1: `WhoPutTheBinsOutIntent` responds with "Who, Who, Who Who".

---

## Non-Functional Requirements

### NFR-1: Reliability
- The skill must handle SCDC API timeouts (default 3s) gracefully and return a user-friendly error message.
- The skill must handle Alexa Device Address API failures gracefully.

### NFR-2: Performance
- Cached data must be served without calling the SCDC API.
- When fresh data is needed, a progressive response ("Just a moment...") must be sent before the API call completes.
- Up to 3 location IDs are tried in parallel when fetching collections.

### NFR-3: Security
- HTTP requests are restricted to an allowlist of hosts (`servicelayer3c.azure-api.net`, `localhost`).
- The skill requires explicit user permission to access device address data.

### NFR-4: Testability
- All modules must be testable without a live DynamoDB connection (`SKIP_DYNAMODB=true`).
- All modules must be testable without live Alexa or SCDC API calls (via `nock` and `sinon`).

### NFR-5: Skill Certification
- The skill must handle Amazon's certification test address (US postcode `20146`) by mapping it to a valid SCDC postcode (`CB246ZD`).

### NFR-6: Licensing
- All source files must include SPDX licence headers (`Apache-2.0`).
