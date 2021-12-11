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

module.exports = class SpeakableDate extends Date {
    addDays(days) {
        let result = new SpeakableDate(this);
        result.setDate(result.getDate() + days);
        return result;
    }

    setToMidnight() {
        this.setHours(0);
        this.setMinutes(0);
        this.setSeconds(0);
        this.setMilliseconds(0);
        return this;
    }

    isSameDateAs(somedate) {
        return (
            this.getDate() === somedate.getDate() &&
            this.getMonth() === somedate.getMonth() &&
            this.getFullYear() === somedate.getFullYear()
        );
    }

    isToday() {
        const today = new Date();
        return this.isSameDateAs(today);
    }

    isTomorrow() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return this.isSameDateAs(tomorrow);
    }

    getDateSpeech() {
        if (this.isToday()) {
            return "today.";
        } else if (this.isTomorrow()) {
            return "tomorrow.";
        } else {
            return `on ${this.toDateString().slice(0, -4)}.`;
        }
    }
};
