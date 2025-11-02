// Copyright 2020-2025 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2025 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const should = require("should");
const nock = require("nock");
const getJSON = require("../lambda/getJSON");

describe("getJSON", function () {
  const base = "http://localhost";

  afterEach(() => {
    nock.cleanAll();
  });

  it("should fetch name", function () {
    nock(base).get("/json").reply(200, { name: "value" });

    const r = getJSON(`${base}/json`);
    return r.should.eventually.have.property("name");
  });

  it("error/404 should throw DataError", function () {
    nock(base).get("/error/404").reply(404);

    return getJSON(`${base}/error/404`).should.be.rejectedWith({
      name: "DataError",
    });
  });

  it("should reject requests to disallowed hostnames", function () {
    nock("http://example.com").get("/").reply(200, "test");
    return getJSON("http://example.com").should.be.rejectedWith({
      name: "DataError",
    });
  });

  it("slow should throw Timeout", function () {
    this.slow(300);
    nock(base).get("/slow").delay(200).reply(200, "test");

    return getJSON(`${base}/slow`, 100).should.be.rejectedWith({
      name: "DataError",
      message: `Timeout: ${base}/slow`,
    });
  });
});
