// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

"use strict";

const should = require("should");
const nock = require("nock");
const {
  Internal,
  attributesAreStale,
  getFreshSessionData,
  getFreshAttributes,
} = require("../lambda/sessiondata");
const SpeakableDate = require("../lambda/speakabledate");
const {
  ONE_DAY,
  TEST_DEVICE_ID,
  TEST_OTHER_DEVICE_ID,
} = require("../lambda/constants");
const sinon = require("sinon");
const AlexaDevice = require("../lambda/alexadevice");
const globalCache = require("../lambda/memoryCache");

const today = new SpeakableDate().setToMidnight();
const tomorrow = new SpeakableDate().addDays(1);
const yesterday = Date.now() - ONE_DAY;
const sixdaysago = Date.now() - ONE_DAY * 6;
const amonthago = Date.now() - ONE_DAY * 30;
const DEVICE_ID = TEST_DEVICE_ID;
const OTHER_DEVICE = TEST_OTHER_DEVICE_ID;

const testAddress = {
  addressLine1: "42 Fake Street",
  addressLine2: null,
  addressLine3: null,
  city: "Testville",
  stateOrRegion: null,
  districtOrCounty: null,
  countryCode: "GB",
  postalCode: "TE5 7PC",
};

const TEST_POSTCODE_MOCK = "TE57PC";

const mockalexadevice = sinon.createStubInstance(AlexaDevice);
mockalexadevice.deviceId = DEVICE_ID;
mockalexadevice.address = testAddress;
mockalexadevice.postalcode = TEST_POSTCODE_MOCK;
mockalexadevice.getPostcodeFromAddress.returns(mockalexadevice);
mockalexadevice.isSameLocationAsDevice.returns(true);

const mockOtherDevice = sinon.createStubInstance(AlexaDevice);
mockOtherDevice.deviceId = OTHER_DEVICE;
mockOtherDevice.address = testAddress;
mockOtherDevice.postalcode = TEST_POSTCODE_MOCK;
mockOtherDevice.getPostcodeFromAddress.returns(mockOtherDevice);
mockOtherDevice.isSameLocationAsDevice.returns(true);

const testPostcodeSearchResults = [
  {
    id: "100090161613",
    houseNumber: "42",
    street: "Fake Street",
    town: "Testville",
    postCode: TEST_POSTCODE_MOCK,
  },
];

const mockCollectionsResponse = {
  collections: [
    {
      date: new SpeakableDate().addDays(1).toISOString(),
      roundTypes: ["DOMESTIC"],
      slippedCollection: false,
    },
    {
      date: new SpeakableDate().addDays(8).toISOString(),
      roundTypes: ["RECYCLE"],
      slippedCollection: false,
    },
  ],
};

const testAttributes = {
  collections: [
    {
      date: today.toISOString(),
      roundTypes: ["DOMESTIC"],
      slippedCollection: false,
    },
    {
      date: today.clone().addDays(7).toISOString(),
      roundTypes: ["RECYCLE", "DOMESTIC"],
      slippedCollection: true,
    },
  ],
  lastReportedBinTime: 0,
  missedQuestion: false,
  deviceId: DEVICE_ID,
  fetchedOnDate: yesterday,
  alexaDevice: mockalexadevice,
  currentBinType: "DOMESTIC",
};

describe("sessiondata", function () {
  let results;
  let locationList;
  describe("getPostcodeSearchFromSCDCWeb()", function () {
    beforeEach(() => globalCache.clear());
    afterEach(() => nock.cleanAll());

    it("fetching results", async function () {
      nock("https://servicelayer3c.azure-api.net")
        .get(`/wastecalendar/address/search/?postCode=${TEST_POSTCODE_MOCK}`)
        .reply(200, testPostcodeSearchResults);

      results = await Internal.getPostcodeSearchFromSCDCWeb(TEST_POSTCODE_MOCK);
      results.length.should.be.greaterThan(0);
      results[0].should.have.property("id");
    });

    it("should throw DataError when postcode not found", async function () {
      nock("https://servicelayer3c.azure-api.net")
        .get("/wastecalendar/address/search/?postCode=XX99XX")
        .reply(200, []);

      await Internal.getPostcodeSearchFromSCDCWeb(
        "XX99XX"
      ).should.be.rejectedWith({
        name: "DataError",
        message: "SCDC returned no locations for postcode starting XX",
      });
    });

    it("should return cached result on second call without hitting network", async function () {
      nock("https://servicelayer3c.azure-api.net")
        .get(`/wastecalendar/address/search/?postCode=${TEST_POSTCODE_MOCK}`)
        .once()
        .reply(200, testPostcodeSearchResults);

      // First call — hits the network
      const first = await Internal.getPostcodeSearchFromSCDCWeb(
        TEST_POSTCODE_MOCK
      );
      first.length.should.be.greaterThan(0);

      // Second call — should come from cache (nock would throw if network is hit again)
      const second = await Internal.getPostcodeSearchFromSCDCWeb(
        TEST_POSTCODE_MOCK
      );
      second.should.deepEqual(first);
      nock.isDone().should.be.true();
    });
  });
  describe("getLocationListFromSearchResults()", function () {
    it("should handle address without addressLine1", function () {
      const results = Internal.getLocationListFromSearchResults(
        testPostcodeSearchResults,
        {}
      );
      results.should.be.an.Array();
      results.length.should.equal(1);
    });
    it("should put matched address first", function () {
      const searchResults = [
        { id: "100090161612", houseNumber: "41" },
        { id: "100090161613", houseNumber: "42" },
        { id: "100090161614", houseNumber: "43" },
      ];
      const results = Internal.getLocationListFromSearchResults(
        searchResults,
        testAddress
      );
      results[0].should.equal("100090161613");
    });
    it("should handle house name without number", function () {
      const searchResults = [
        { id: "100090161612", houseNumber: "41" },
        { id: "100090161613", houseNumber: "42" },
        { id: "100090161614", houseNumber: "43" },
      ];
      const houseNameAddress = {
        addressLine1: "Rose Cottage",
        postalCode: "TE5 7PC",
      };
      const results = Internal.getLocationListFromSearchResults(
        searchResults,
        houseNameAddress
      );
      results.should.be.an.Array();
      results.length.should.equal(3);
      results[0].should.equal("100090161612");
    });
  });
  describe("mockalexadevice.isSameLocationAsDevice()", function () {
    it("otherdevice and mockdevice are same address", function () {
      mockalexadevice.isSameLocationAsDevice(mockOtherDevice).should.be.true;
    });
  });
  describe("alexaDevice.getPostcodeFromAddress()", function () {
    it("withspace", function () {
      mockalexadevice.postalcode.should.equal(TEST_POSTCODE_MOCK);
    });
  });
  describe("Fetching collections", function () {
    afterEach(() => nock.cleanAll());
    beforeEach(() => globalCache.clear());

    it("getLocationListFromSearchResults() with matched address", function () {
      locationList = Internal.getLocationListFromSearchResults(
        testPostcodeSearchResults,
        mockalexadevice.address
      );
      locationList[0].should.equal("100090161613");
    });

    it("getCollectionsFromLocationList()", async function () {
      nock("https://servicelayer3c.azure-api.net")
        .get(/\/wastecalendar\/collection\/search\/.*\?numberOfCollections=12/)
        .reply(200, mockCollectionsResponse);

      const r = await Internal.getCollectionsFromLocationList(locationList);
      r.collections.length.should.be.greaterThan(0);
    });
  });
  describe("attributesAreStale()", function () {
    it("Data fetched yesterday, collection today", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.true;
    });
    testAttributes.collections[0].date = today
      .clone()
      .addDays(-7)
      .toISOString();
    it("data fetched yesterday, collection in the past", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.true;
    });
    testAttributes.collections[0].date = tomorrow.toISOString();
    it("data fetched yesterday, collection tomorrow", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.false;
    });
    it("Data fresh but for different device, same address", function () {
      attributesAreStale(testAttributes, mockOtherDevice).should.be.false;
    });
    it("Data fresh but from device with different postcode", function () {
      mockOtherDevice.address.postalCode = "TE5 8AB";
      mockOtherDevice.postalcode = "TE58AB";
      mockOtherDevice.postalcode.should.equal("TE58AB");
      attributesAreStale(testAttributes, mockOtherDevice).should.be.true;
    });
    testAttributes.fetchedOnDate = amonthago;
    it("Data more than a week old", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.true;
    });
    testAttributes.fetchedOnDate = sixdaysago;
    it("Data six days old", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.false;
    });
    testAttributes.missedQuestion = true;
    it("Old data with missed question flag set", function () {
      attributesAreStale(testAttributes, mockalexadevice).should.be.true;
    });
    it("should return true when no collections", function () {
      const attrs = { ...testAttributes };
      delete attrs.collections;
      attributesAreStale(attrs, mockalexadevice).should.be.true;
    });
    it("should handle undefined alexaDevice", function () {
      const attrs = {
        ...testAttributes,
        collections: [{ date: tomorrow.toISOString() }],
        fetchedOnDate: Date.now(),
        alexaDevice: undefined,
      };
      attributesAreStale(attrs, mockalexadevice).should.be.true;
    });
    it("should return true when all collections are in the past", function () {
      const attrs = {
        ...testAttributes,
        collections: [
          {
            date: today.clone().addDays(-7).toISOString(),
            roundTypes: ["DOMESTIC"],
          },
          {
            date: today.clone().addDays(-1).toISOString(),
            roundTypes: ["RECYCLE"],
          },
        ],
        fetchedOnDate: yesterday,
        alexaDevice: mockalexadevice,
        deviceId: DEVICE_ID,
      };
      attributesAreStale(attrs, mockalexadevice).should.be.true;
    });
    it("should return false when first collection is past but later ones are future", function () {
      const attrs = {
        ...testAttributes,
        collections: [
          {
            date: today.clone().addDays(-1).toISOString(),
            roundTypes: ["DOMESTIC"],
          },
          { date: tomorrow.toISOString(), roundTypes: ["RECYCLE"] },
        ],
        fetchedOnDate: yesterday,
        alexaDevice: mockalexadevice,
        deviceId: DEVICE_ID,
      };
      attributesAreStale(attrs, mockalexadevice).should.be.false;
    });
    it("should return true when device ID differs", function () {
      const attrs = {
        ...testAttributes,
        collections: [
          { date: tomorrow.toISOString(), roundTypes: ["DOMESTIC"] },
        ],
        fetchedOnDate: yesterday,
        alexaDevice: mockalexadevice,
        deviceId: OTHER_DEVICE,
      };
      attributesAreStale(attrs, mockalexadevice).should.be.true;
    });
    it("should return true when data is exactly 7 days old", function () {
      const sevendaysago = Date.now() - ONE_DAY * 7;
      const attrs = {
        ...testAttributes,
        collections: [
          { date: tomorrow.toISOString(), roundTypes: ["DOMESTIC"] },
        ],
        fetchedOnDate: sevendaysago,
        alexaDevice: mockalexadevice,
        deviceId: DEVICE_ID,
      };
      attributesAreStale(attrs, mockalexadevice).should.be.true;
    });
  });
  describe("getLocationListFromSearchResults() — property-based tests", function () {
    // **Validates: Requirements 3.4 (getLocationListFromSearchResults placing matched house number first)**
    //
    // We generate test cases programmatically across varying result-set sizes and
    // match positions, then assert all four properties for each case:
    //
    //   P1 — All IDs included: output contains all N unique IDs from input
    //   P2 — Matched address first: when a match exists, its ID is at index 0
    //   P3 — No match → original order: output equals original ID order when no match
    //   P4 — Completeness: set of unique IDs in output equals set of IDs in input

    // Helper: build a results array of a given size with sequential IDs and house numbers
    function makeResults(size) {
      const results = [];
      for (let i = 0; i < size; i++) {
        results.push({
          id: `id-${i}`,
          houseNumber: String(i + 1),
        });
      }
      return results;
    }

    // Helper: build an address whose addressLine1 starts with the given house number
    function makeAddress(houseNumber) {
      return { addressLine1: `${houseNumber} Some Street` };
    }

    const sizes = [1, 2, 3, 5, 10];

    sizes.forEach(function (size) {
      describe(`with ${size} result(s)`, function () {
        const searchResults = makeResults(size);
        const allIds = searchResults.map((r) => r.id);

        // Test matching at first, middle, and last positions
        const matchPositions = [
          { label: "first", index: 0 },
          { label: "middle", index: Math.floor((size - 1) / 2) },
          { label: "last", index: size - 1 },
        ].filter(
          // deduplicate when size is small (e.g. size=1 all three are index 0)
          (pos, idx, arr) => arr.findIndex((p) => p.index === pos.index) === idx
        );

        matchPositions.forEach(function ({ label, index }) {
          it(`P1+P2+P4: matched house number at ${label} position (index ${index})`, function () {
            const matchedEntry = searchResults[index];
            const address = makeAddress(matchedEntry.houseNumber);
            const output = Internal.getLocationListFromSearchResults(
              searchResults,
              address
            );

            // P2: matched ID is first
            output[0].should.equal(
              matchedEntry.id,
              `Expected matched ID "${matchedEntry.id}" at index 0`
            );

            // P1: output length is N+1 (matched ID duplicated at front)
            output.length.should.equal(
              size + 1,
              `Expected output length ${size + 1} (N+1) when match found`
            );

            // P4: unique IDs in output equal IDs in input
            const uniqueOutputIds = [...new Set(output)];
            uniqueOutputIds.sort().should.deepEqual(
              [...allIds].sort(),
              "Unique IDs in output should equal all input IDs"
            );
          });
        });

        it(`P3+P4: non-matching house number → original order, length N`, function () {
          const address = makeAddress("999"); // no entry has houseNumber "999"
          const output = Internal.getLocationListFromSearchResults(
            searchResults,
            address
          );

          // P3: output is exactly the original IDs in original order
          output.should.deepEqual(
            allIds,
            "Output should equal original ID list when no match"
          );

          // P4: set of unique IDs equals input IDs
          [...new Set(output)].sort().should.deepEqual(
            [...allIds].sort(),
            "Unique IDs in output should equal all input IDs"
          );
        });

        it(`P3+P4: no addressLine1 → original order, length N`, function () {
          const output = Internal.getLocationListFromSearchResults(
            searchResults,
            {} // no addressLine1
          );

          // P3: output is exactly the original IDs in original order
          output.should.deepEqual(
            allIds,
            "Output should equal original ID list when no addressLine1"
          );

          // P4: set of unique IDs equals input IDs
          [...new Set(output)].sort().should.deepEqual(
            [...allIds].sort(),
            "Unique IDs in output should equal all input IDs"
          );
        });

        it(`P3+P4: house name (no numeric match) → original order, length N`, function () {
          const address = { addressLine1: "Rose Cottage" };
          const output = Internal.getLocationListFromSearchResults(
            searchResults,
            address
          );

          // P3: output is exactly the original IDs in original order
          output.should.deepEqual(
            allIds,
            "Output should equal original ID list for house name with no match"
          );

          // P4: set of unique IDs equals input IDs
          [...new Set(output)].sort().should.deepEqual(
            [...allIds].sort(),
            "Unique IDs in output should equal all input IDs"
          );
        });
      });
    });

    it("P1+P2: matched ID appears exactly twice in output (once prepended, once in original list)", function () {
      const searchResults = [
        { id: "aaa", houseNumber: "10" },
        { id: "bbb", houseNumber: "20" },
        { id: "ccc", houseNumber: "30" },
      ];
      const address = makeAddress("20");
      const output = Internal.getLocationListFromSearchResults(
        searchResults,
        address
      );

      // "bbb" should appear at index 0 and once more in the list
      output[0].should.equal("bbb");
      output.filter((id) => id === "bbb").length.should.equal(
        2,
        "Matched ID should appear exactly twice"
      );
      output.length.should.equal(4); // N+1 = 3+1
    });

    it("P4: no IDs are lost or invented for any input", function () {
      // Sweep over multiple sizes and match scenarios to confirm completeness
      const scenarios = [
        { size: 1, matchIndex: 0 },
        { size: 3, matchIndex: 1 },
        { size: 5, matchIndex: 4 },
        { size: 10, matchIndex: 7 },
      ];

      for (const { size, matchIndex } of scenarios) {
        const results = makeResults(size);
        const allInputIds = new Set(results.map((r) => r.id));

        // With match
        const matchAddress = makeAddress(results[matchIndex].houseNumber);
        const withMatch = Internal.getLocationListFromSearchResults(
          results,
          matchAddress
        );
        const uniqueWithMatch = new Set(withMatch);
        uniqueWithMatch
          .size.should.equal(
            allInputIds.size,
            `Size ${size}, match at ${matchIndex}: unique output IDs count should equal input IDs count`
          );
        for (const id of allInputIds) {
          uniqueWithMatch.has(id).should.be.true(
            `Size ${size}: input ID "${id}" missing from output`
          );
        }

        // Without match
        const noMatchAddress = makeAddress("9999");
        const withoutMatch = Internal.getLocationListFromSearchResults(
          results,
          noMatchAddress
        );
        const uniqueWithoutMatch = new Set(withoutMatch);
        uniqueWithoutMatch
          .size.should.equal(
            allInputIds.size,
            `Size ${size}, no match: unique output IDs count should equal input IDs count`
          );
        for (const id of allInputIds) {
          uniqueWithoutMatch.has(id).should.be.true(
            `Size ${size}: input ID "${id}" missing from no-match output`
          );
        }
      }
    });
  });

  describe("attributesAreStale() — property-based tests (age monotonicity)", function () {
    // **Validates: Requirements 4.2**
    //
    // We sample fetchedOnDate values at 12-hour intervals from 0 to 30 days old.
    // For each sample we build attributes that are "fresh" in every other dimension:
    //   - valid future collections
    //   - correct device ID
    //   - same address (isSameLocationAsDevice returns true)
    //
    // The staleness threshold is: fetchedOnDate <= midnightToday - CACHE_TTL.COLLECTIONS
    // Because midnightToday is rounded to midnight (not Date.now()), there is a boundary
    // zone of up to 1 day around the 7-day mark where the result depends on the time of
    // day the test runs.  We skip asserting in that zone.

    const HALF_DAY = ONE_DAY / 2;
    const THRESHOLD_DAYS = 7; // CACHE_TTL.COLLECTIONS / ONE_DAY
    const BOUNDARY_ZONE = ONE_DAY; // skip assertions within 1 day of threshold

    // Build a fresh-in-every-other-dimension attributes object for a given fetchedOnDate
    function makeAttrs(fetchedOnDate) {
      const tomorrow = new SpeakableDate().addDays(1);
      return {
        collections: [
          { date: tomorrow.toISOString(), roundTypes: ["DOMESTIC"], slippedCollection: false },
        ],
        lastReportedBinTime: 0,
        missedQuestion: false,
        deviceId: DEVICE_ID,
        fetchedOnDate,
        alexaDevice: mockalexadevice,
      };
    }

    // Generate ages from 0 to 30 days in 12-hour steps
    const ages = [];
    for (let steps = 0; steps * HALF_DAY <= ONE_DAY * 30; steps++) {
      ages.push(steps * HALF_DAY);
    }

    it("should return false for ages safely below the 7-day threshold", function () {
      const safelyFreshAges = ages.filter(
        (age) => age < THRESHOLD_DAYS * ONE_DAY - BOUNDARY_ZONE
      );
      safelyFreshAges.length.should.be.greaterThan(0);

      for (const age of safelyFreshAges) {
        const fetchedOnDate = Date.now() - age;
        const attrs = makeAttrs(fetchedOnDate);
        const result = attributesAreStale(attrs, mockalexadevice);
        result.should.be.false(
          `Expected attributesAreStale to be false for age ${age / ONE_DAY} days, but got true`
        );
      }
    });

    it("should return true for ages safely above the 7-day threshold", function () {
      const definitelyStaleAges = ages.filter(
        (age) => age > THRESHOLD_DAYS * ONE_DAY + BOUNDARY_ZONE
      );
      definitelyStaleAges.length.should.be.greaterThan(0);

      for (const age of definitelyStaleAges) {
        const fetchedOnDate = Date.now() - age;
        const attrs = makeAttrs(fetchedOnDate);
        const result = attributesAreStale(attrs, mockalexadevice);
        result.should.be.true(
          `Expected attributesAreStale to be true for age ${age / ONE_DAY} days, but got false`
        );
      }
    });

    it("monotonicity: once stale, all older fetchedOnDate values are also stale", function () {
      // Sort ages ascending, compute staleness for each
      const sortedAges = [...ages].sort((a, b) => a - b);
      const results = sortedAges.map((age) => {
        const fetchedOnDate = Date.now() - age;
        return attributesAreStale(makeAttrs(fetchedOnDate), mockalexadevice);
      });

      // Find the first index where staleness flips to true
      const firstStaleIndex = results.indexOf(true);

      if (firstStaleIndex === -1) {
        // No stale result found at all — this would be a bug (30-day-old data must be stale)
        throw new Error(
          "Monotonicity check: no stale result found even at 30 days — expected at least one"
        );
      }

      // All results from firstStaleIndex onwards must also be true
      const allStaleAfterFirst = results.slice(firstStaleIndex).every((r) => r === true);
      allStaleAfterFirst.should.be.true(
        "Monotonicity violated: found a non-stale result after the first stale result"
      );
    });
  });

  describe("getFreshSessionData()", function () {
    afterEach(() => nock.cleanAll());
    beforeEach(() => globalCache.clear());

    it("should fetch fresh session data successfully", async function () {
      const mockDevice = new AlexaDevice();
      mockDevice.deviceId = "device-123";
      mockDevice.postalcode = TEST_POSTCODE_MOCK;
      mockDevice.address = {
        addressLine1: "42 Fake Street",
        postalCode: "TE5 7PC",
      };

      nock("https://servicelayer3c.azure-api.net")
        .get(`/wastecalendar/address/search/?postCode=${TEST_POSTCODE_MOCK}`)
        .reply(200, testPostcodeSearchResults);

      nock("https://servicelayer3c.azure-api.net")
        .get(/\/wastecalendar\/collection\/search\/.*\?numberOfCollections=12/)
        .reply(200, mockCollectionsResponse);

      const handlerInput = {
        requestEnvelope: {
          request: { requestId: "req-123" },
          context: {
            System: {
              apiEndpoint: "https://api.example.com",
              apiAccessToken: "token-123",
              device: { deviceId: "device-123" },
            },
          },
        },
        serviceClientFactory: {
          getDirectiveServiceClient: () => ({
            enqueue: sinon.stub().resolves(),
          }),
        },
      };

      const data = await getFreshSessionData(handlerInput, mockDevice);
      data.should.have.property("collections");
      data.should.have.property("deviceId");
      data.deviceId.should.equal("device-123");
      data.should.have.property("fetchedOnDate");
      data.should.have.property("alexaDevice");
    });
  });
  describe("getFreshAttributes()", function () {
    afterEach(() => nock.cleanAll());
    beforeEach(() => globalCache.clear());

    it("should set attributes correctly", async function () {
      const mockDevice = new AlexaDevice();
      mockDevice.deviceId = "device-456";
      mockDevice.postalcode = TEST_POSTCODE_MOCK;
      mockDevice.address = {
        addressLine1: "42 Fake Street",
        postalCode: "TE5 7PC",
      };

      nock("https://servicelayer3c.azure-api.net")
        .get(`/wastecalendar/address/search/?postCode=${TEST_POSTCODE_MOCK}`)
        .reply(200, testPostcodeSearchResults);

      nock("https://servicelayer3c.azure-api.net")
        .get(/\/wastecalendar\/collection\/search\/.*\?numberOfCollections=12/)
        .reply(200, mockCollectionsResponse);

      const handlerInput = {
        requestEnvelope: {
          request: { requestId: "req-456" },
          context: {
            System: {
              apiEndpoint: "https://api.example.com",
              apiAccessToken: "token-456",
              device: { deviceId: "device-456" },
            },
          },
        },
        serviceClientFactory: {
          getDirectiveServiceClient: () => ({
            enqueue: sinon.stub().resolves(),
          }),
        },
        attributesManager: {
          setSessionAttributes: sinon.stub(),
          setPersistentAttributes: sinon.stub(),
        },
      };

      await getFreshAttributes(handlerInput, mockDevice);
      handlerInput.attributesManager.setSessionAttributes.calledOnce.should.be.true();
      handlerInput.attributesManager.setPersistentAttributes.calledOnce.should.be.true();
    });
  });
});
