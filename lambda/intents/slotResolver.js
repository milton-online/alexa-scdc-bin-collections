/* Copyright 2020-2022 Tim Cutts <tim@thecutts.org>

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

function resolveToCanonicalSlotValue(slot) {
  const resolutions = slot.resolutions;
  const hasResolutionDataOnSlot =
    resolutions &&
    resolutions.resolutionsPerAuthority &&
    resolutions.resolutionsPerAuthority.length > 0;
  const resolution = hasResolutionDataOnSlot
    ? slot.resolutions.resolutionsPerAuthority[0]
    : null;

  if (resolution && resolution.status.code === "ER_SUCCESS_MATCH") {
    return resolution.values[0].value.name;
  } else {
    return slot.value;
  }
}

module.exports = {
  resolveToCanonicalSlotValue,
};
