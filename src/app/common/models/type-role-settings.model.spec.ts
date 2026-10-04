import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";
import {
  APP_TYPE_FAMILY,
  appTypeFor,
  DEFAULT_TYPE_ROLES,
  familyNameFor,
  fontFamilyFor,
  fontsOf,
  weightStopsForRole
} from "@common/models/type-role-settings.model";
import {SelectedFont} from "@common/models/google-font.model";
import {DEFAULT_TYPE_SETTINGS_BY_ROLE, TYPE_ROLES} from "@engine/contrast/type-role.model";
import {WEIGHT_STOPS} from "@engine/contrast/type-settings.model";


function selection(family: string, weights: number[], category = "serif"): SelectedFont {
  return {family, category, variant: "regular", weights};
}


/** The weights `index.html` asks Google Fonts for, for one family. */
function loadedWeights(family: string): number[] {
  const html = readFileSync("src/index.html", "utf8");
  const axis = new RegExp(`family=${family.replace(/ /g, "\\+")}:wght@([\\d;]+)`).exec(html);

  expect(axis, `src/index.html loads no weight axis for ${family}`).not.toBeNull();

  return (axis?.[1] ?? "").split(";").map(Number);
}


describe("type role settings", () => {

  it("opens every role in the app's own type at the role's defaults", () => {
    for (const role of TYPE_ROLES) {
      expect(DEFAULT_TYPE_ROLES[role]).toEqual({font: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE[role]});
    }
  });


  it("names the app's own faces after the stylesheet's tokens", () => {
    // The names are copies of the first family in `--font-sans` and
    // `--font-mono`, which no compiler compares against this.
    const styles = readFileSync("src/styles.css", "utf8");
    const sans = /--font-sans:\s*"([^"]+)"/.exec(styles);
    const mono = /--font-mono:\s*"([^"]+)"/.exec(styles);

    expect(appTypeFor("body").family).toBe(sans?.[1]);
    expect(appTypeFor("body").family).toBe(APP_TYPE_FAMILY);
    expect(appTypeFor("mono").family).toBe(mono?.[1]);
  });


  it("stands the mono fallback on the weights the head loads for it, and no others", () => {
    // `index.html` asks for two weights of the mono face. A slider offering
    // the whole grid would rate a weight the browser has to synthesise.
    const loaded = loadedWeights(appTypeFor("mono").family);

    expect([...appTypeFor("mono").weights]).toEqual(loaded.filter(weight => WEIGHT_STOPS.includes(weight)));
  });


  it("offers the whole grid for the sans, whose loaded weights cover it", () => {
    const loaded = loadedWeights(appTypeFor("body").family);

    expect(appTypeFor("body").weights).toBe(WEIGHT_STOPS);
    for (const weight of WEIGHT_STOPS) expect(loaded).toContain(weight);
  });


  it("sets a role without a face in the app's own type for that role", () => {
    expect(fontFamilyFor("mono", null)).toBe("var(--font-mono)");
    expect(fontFamilyFor("display", null)).toBe("var(--font-sans)");
    expect(familyNameFor("mono", null)).toBe("IBM Plex Mono");
  });


  it("sets a role with a face in that face, category as the fallback", () => {
    const font = selection("Source Serif 4", [400, 600]);

    expect(fontFamilyFor("display", font)).toBe('"Source Serif 4", serif');
    expect(familyNameFor("display", font)).toBe("Source Serif 4");
  });


  it("narrows the weight stops to the chosen face, and to the app's face without one", () => {
    expect(weightStopsForRole("ui", selection("Merriweather", [300, 400, 700, 900]))).toEqual([300, 400, 700]);
    expect(weightStopsForRole("mono", null)).toEqual([400, 500]);
    expect(weightStopsForRole("ui", null)).toBe(WEIGHT_STOPS);
  });


  it("lists the faces in role order, nulls kept", () => {
    const font = selection("Lobster", [400], "display");

    expect(fontsOf({...DEFAULT_TYPE_ROLES, display: {font, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE.display}}))
      .toEqual([font, null, null, null]);
  });

});
