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
const { Internal } = require("../lambda/sessiondata.js")
const { messages } = require("../lambda/messages.js")

"use strict"

const testAddress = {
    addressLine1: '241 The Made Up Street',
    addressLine2: null,
    addressLine3: null,
    city: 'Some town',
    stateOrRegion: null,
    districtOrCounty: null,
    countryCode: 'GB',
    postalCode: 'CB24 6ZD'
}

const testPostcodeSearchResults = [{
    id: '100090161613',
    houseNumber: '241',
    street: 'The Made Up Street',
    town: 'Sometown',
    postCode: 'CB246ZD'
}]

describe('sessiondata', function() {
    let results
    let locationList
    describe("getPostcodeSearchFromSCDCWeb()", function(){
        this.slow(5000)
        it('fetching results - might fail if SCDC web is down',
            async function() {
            results = await Internal().getPostcodeSearchFromSCDCWeb('CB246ZD')
            results.length.should.be.greaterThan(0)
            results[0].should.have.property('id')
        })
    })
    describe("getPostcodeFromAddress()", function() {
        it('withspace', function() {
            Internal().getPostcodeFromAddress(testAddress).should.equal('CB246ZD')
        })
    })
    describe("Fetching collections", function() {
        it('getLocationListFromSearchResults()', function() {
            locationList = Internal().getLocationListFromSearchResults(testPostcodeSearchResults, testAddress)
            locationList[0].should.equal('100090161613')
        })
        it.skip("getCollectionsFromLocationList()", async function() {
            let r = await Internal().getCollectionsFromLocationList(locationList)
            r.collections.length.should.be.greaterThan(0)
        })
    })
})
