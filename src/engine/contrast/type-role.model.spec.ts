import {describe, expect, it} from "vitest";
import {
  DEFAULT_TYPE_SETTINGS_BY_ROLE,
  DISPLAY_FONT_SIZE_RANGE,
  fontSizeRangeFor,
  normalizedTypeSettingsFor,
  TYPE_ROLES,
  typeRoleCaption,
  typeRoleName
} from "@engine/contrast/type-role.model";
import {FONT_SIZE_RANGE, LINE_HEIGHT_RANGE, WEIGHT_STOPS} from "@engine/contrast/type-settings.model";


describe("type roles", () => {

  it("names four roles, display first and UI last", () => {
    // The order is the order of the segments, and `body` is what the single
    // typeface of the earlier preview maps onto.
    expect(TYPE_ROLES).toEqual(["display", "body", "mono", "ui"]);
  });


  it("captions every role in caps and names it for a sentence", () => {
    for (const role of TYPE_ROLES) {
      expect(typeRoleCaption(role)).toBe(typeRoleCaption(role).toUpperCase());
      expect(typeRoleName(role).length).toBeGreaterThan(0);
    }
  });


  it("keeps every default inside its role's ranges and on the weight grid", () => {
    // A first visit would otherwise open on a value the sliders cannot reach.
    for (const role of TYPE_ROLES) {
      const defaults = DEFAULT_TYPE_SETTINGS_BY_ROLE[role];
      const range = fontSizeRangeFor(role);

      expect(defaults.fontSize, `${role} size`).toBeGreaterThanOrEqual(range.min);
      expect(defaults.fontSize, `${role} size`).toBeLessThanOrEqual(range.max);
      expect(defaults.lineHeight, `${role} leading`).toBeGreaterThanOrEqual(LINE_HEIGHT_RANGE.min);
      expect(defaults.lineHeight, `${role} leading`).toBeLessThanOrEqual(LINE_HEIGHT_RANGE.max);
      expect(WEIGHT_STOPS, `${role} weight`).toContain(defaults.fontWeight);
    }
  });


  it("moves the display size over its own range and the rest over body text's", () => {
    expect(fontSizeRangeFor("display")).toBe(DISPLAY_FONT_SIZE_RANGE);
    expect(fontSizeRangeFor("body")).toBe(FONT_SIZE_RANGE);
    expect(fontSizeRangeFor("mono")).toBe(FONT_SIZE_RANGE);
    expect(fontSizeRangeFor("ui")).toBe(FONT_SIZE_RANGE);
  });


  it("normalizes a display size against the display range", () => {
    // 18px is body text's default and well inside body text's range, but a
    // headline at 18px is below what the display range allows.
    const settings = {fontSize: 18, fontWeight: 500, lineHeight: 1.1};

    expect(normalizedTypeSettingsFor("display", settings).fontSize).toBe(DISPLAY_FONT_SIZE_RANGE.min);
    expect(normalizedTypeSettingsFor("body", settings).fontSize).toBe(18);
  });


  it("falls back to the role's own defaults, not to body text's", () => {
    const garbage = {fontSize: Number.NaN, fontWeight: Number.NaN, lineHeight: Number.NaN};

    for (const role of TYPE_ROLES) {
      expect(normalizedTypeSettingsFor(role, garbage)).toEqual(DEFAULT_TYPE_SETTINGS_BY_ROLE[role]);
    }
  });


  it("snaps the weight to the stops it is handed", () => {
    // The face a role is set in narrows the grid, and a weight the family does
    // not ship would be synthesised by the browser.
    const settings = {...DEFAULT_TYPE_SETTINGS_BY_ROLE.ui, fontWeight: 650};

    expect(normalizedTypeSettingsFor("ui", settings, [400, 700]).fontWeight).toBe(700);
  });

});
