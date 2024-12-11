// Copyright 2020-2022 Tim Cutts <tim@thecutts.org>
// SPDX-FileCopyrightText: 2024 Tim Cutts <tim@thecutts.org>
//
// SPDX-License-Identifier: Apache-2.0

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
