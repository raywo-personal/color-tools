import {describe, expect, it} from "vitest";
import {apcaLookup} from "@engine/contrast/apca-look-up-table.helper";
import {FontWeight} from "@engine/contrast/apca-lookup-table.model";
import {
  DEFAULT_TYPE_SETTINGS,
  FONT_SIZE_RANGE,
  FONT_WEIGHT_RANGE,
  LINE_HEIGHT_RANGE,
  normalizedTypeSettings,
  TypeSettings
} from "@engine/contrast/type-settings.model";


/** The three axes with everything at its default but the one under test. */
function withFontSize(fontSize: number): TypeSettings {
  return {...DEFAULT_TYPE_SETTINGS, fontSize};
}


function withFontWeight(fontWeight: number): TypeSettings {
  return {...DEFAULT_TYPE_SETTINGS, fontWeight};
}


function withLineHeight(lineHeight: number): TypeSettings {
  return {...DEFAULT_TYPE_SETTINGS, lineHeight};
}


describe("normalizedTypeSettings", () => {

  it("leaves the default alone", () => {
    expect(normalizedTypeSettings(DEFAULT_TYPE_SETTINGS)).toEqual(DEFAULT_TYPE_SETTINGS);
  });


  it("holds every axis inside its own range", () => {
    const below = normalizedTypeSettings({fontSize: 4, fontWeight: 100, lineHeight: 0.5});
    const above = normalizedTypeSettings({fontSize: 99, fontWeight: 900, lineHeight: 4});

    expect(below).toEqual({
      fontSize: FONT_SIZE_RANGE.min,
      fontWeight: FONT_WEIGHT_RANGE.min,
      lineHeight: LINE_HEIGHT_RANGE.min
    });

    expect(above).toEqual({
      fontSize: FONT_SIZE_RANGE.max,
      fontWeight: FONT_WEIGHT_RANGE.max,
      lineHeight: LINE_HEIGHT_RANGE.max
    });
  });


  it("puts a weight on a row the lookup table actually has", () => {
    // This is the one normalization that prevents a crash rather than a wrong
    // look: `apcaLookup[size][weight]` is undefined for a weight off the grid,
    // and the rating reads `.contrast` off it.
    const weight = normalizedTypeSettings(withFontWeight(437)).fontWeight;

    expect(weight).toBe(400);
    expect(apcaLookup["16px"][String(weight) as FontWeight]).toBeDefined();
  });


  it("puts every weight the slider can produce on such a row", () => {
    for (let weight = FONT_WEIGHT_RANGE.min; weight <= FONT_WEIGHT_RANGE.max; weight += FONT_WEIGHT_RANGE.step) {
      const normalized = normalizedTypeSettings(withFontWeight(weight)).fontWeight;

      expect(normalized, `weight ${weight} is not on the slider's own grid`).toBe(weight);
      expect(apcaLookup["16px"][String(normalized) as FontWeight]).toBeDefined();
    }
  });


  it("rounds a size to whole pixels", () => {
    expect(normalizedTypeSettings(withFontSize(17.4)).fontSize).toBe(17);
    expect(normalizedTypeSettings(withFontSize(17.6)).fontSize).toBe(18);
  });


  it("writes a leading that survives being read back at two decimals", () => {
    // 1.2 + 3 * 0.05 is 1.3500000000000003 in binary floating point, and that
    // is the value that would reach `line-height` and localStorage.
    const leading = normalizedTypeSettings(withLineHeight(1.34)).lineHeight;

    expect(leading).toBe(1.35);
    expect(leading.toFixed(2)).toBe("1.35");
  });


  it("falls back to the default where a stored value is not a number at all", () => {
    // localStorage is editable by hand, and `SettingsMap` promises a number
    // rather than enforcing one.
    const garbage = {
      fontSize: Number.NaN,
      fontWeight: "bold",
      lineHeight: undefined
    } as unknown as TypeSettings;

    expect(normalizedTypeSettings(garbage)).toEqual(DEFAULT_TYPE_SETTINGS);
  });


  it("keeps its own default inside its own ranges", () => {
    // The default is what an out-of-range value falls back to, so a default
    // outside a range would put the value it repairs back out of it.
    expect(DEFAULT_TYPE_SETTINGS.fontSize).toBeGreaterThanOrEqual(FONT_SIZE_RANGE.min);
    expect(DEFAULT_TYPE_SETTINGS.fontSize).toBeLessThanOrEqual(FONT_SIZE_RANGE.max);
    expect(DEFAULT_TYPE_SETTINGS.lineHeight).toBeGreaterThanOrEqual(LINE_HEIGHT_RANGE.min);
    expect(DEFAULT_TYPE_SETTINGS.lineHeight).toBeLessThanOrEqual(LINE_HEIGHT_RANGE.max);
  });

});
