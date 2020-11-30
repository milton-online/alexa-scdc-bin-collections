/* Copyright 2020 Tim Cutts <tim@thecutts.org>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

const should = require('should')
const messages = require("../lambda/messages.js")
const { getJSON } = require("../lambda/getJSON.js")
const TestServer = require ('./utils/server.js')

describe('getJSON', function() {

    const local = new TestServer();
    let base;

    before(async () => {
        await local.start();
        base = `http://${local.hostname}:${local.port}/`;
    });

    after(async () => {
        return local.stop();
    });

    it('should fetch name', function() {
        const r = getJSON(`${base}json`)
        return r.should.eventually.have.property('name')
    })

    it ('error/404 should throw DataError', function() {
        getJSON(`${base}error/404`)
            .should.be.rejectedWith({ name: 'DataError',
                                      message: 'HTTP error 404'});
    })

    it ('slow should throw Timeout', function() {
        getJSON(`${base}slow`, 100)
            .should.be.rejectedWith({ name: 'DataError',
                                      message: `Timeout: ${base}slow`})
    })
})
