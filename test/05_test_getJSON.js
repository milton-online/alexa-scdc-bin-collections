// Copyright 2020 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

const should = require("should");
const getJSON = require("../lambda/getJSON");
const TestServer = require("./utils/server");

describe("getJSON", function () {
  const local = new TestServer();
  let base;

  before(async () => {
    await local.start();
    base = `http://${local.hostname}:${local.port}/`;
  });

  after(async () => {
    return local.stop();
  });

  it("should fetch name", function () {
    const r = getJSON(`${base}json`);
    return r.should.eventually.have.property("name");
  });

  it("error/404 should throw DataError", function () {
    getJSON(`${base}error/404`).should.be.rejectedWith({
      name: "DataError",
      message: "HTTP error 404",
    });
  });

  it("slow should throw Timeout", function () {
    getJSON(`${base}slow`, 100).should.be.rejectedWith({
      name: "DataError",
      message: `Timeout: ${base}slow`,
    });
  });
});
