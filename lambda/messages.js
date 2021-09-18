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

exports.messages = {
    NO_ADDRESS: 'It looks like you don\'t have an address set on this device. You can set your address in the Alexa app.',
    NO_DATA_RETURNED: "I'm sorry, the council's web site did not return any bin collections for your device's location, please check the address configured for this device in the Alexa app is correct.  The council website does not return results for some locations, in particular for some business addresses.",
    NOTIFY_MISSING_PERMISSIONS: 'I need to know where you live, so that I can look up your bin collection dates.  Please use the Alexa app to give the Bin Collections skill permission to access your address and post code.',
    ERROR: '<say-as interpret-as="interjection">uh oh</say-as>.  Something went wrong - please try again',
    NO_POSTCODE: 'It looks like you don\'t have a post code set.  You can set your address in the Alexa app.',
    POSTCODE_LOOKUP_FAIL: 'I couldn\'t find your post code in the council\'s database.  If you live in South Cambridgeshire, please use the Alexa app to check that the address configured for your device is correct.',
    LOCATION_FAILURE: 'There was an error with the Device Address API. Please try again.',
    NO_MORE: "Sorry, I don't know when the next collection after that is, yet.  Try again later.",
    HELP: "You can ask when a particular bin colour or waste category will be collected, or what type of bin it is today.",
    HELP_REPROMPT: "What do you want to know?",
    HELPCARD_TITLE: "Bin Collections Help",
    WEB_ERROR: 'I got an error code from the council web site, please try later',
    WEB_TIMEOUT: 'The council website took too long to respond.  Please try later.',
    WHOWHOWHO: "Who, Who Who Who",
    DID_YOU_MISS_IT: "  Did you miss it? Do you want to know about the next one?",
    SLIPPED_COLLECTION: "  This collection is not on your usual day.",
    GOT_FRESH_DATA: "  I'm up to date with the council.  What would you like to know about upcoming collections?",
    CONTACTING_SCDC:  "Please wait while I look that up.",
    BYE_THEN: "Bye then!",
    NO_QUESTION: "I didn't ask you a question."
};
