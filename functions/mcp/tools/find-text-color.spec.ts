import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import chroma from "chroma-js";
import {beforeEach, describe, expect, it} from "vitest";
import {MODES} from "@contrast/helper/optimal-text-color.helper";
import {apcaLookup} from "@contrast/helper/apca-look-up-table.helper";
import {FONT_SIZES, FONT_WEIGHTS, FontSize, FontWeight} from "@contrast/models/apca-lookup-table.model";
import {connectedClient, structured, summary} from "../test-support/connected-client";


interface FindTextColorArgs {
  backgroundColor: string;
  mode?: string;
  fontSize?: string;
  fontWeight?: string;
}

function findTextColor(client: Client, args: FindTextColorArgs) {
  return client.callTool({name: "find_text_color", arguments: {...args}});
}

function isGray(hex: string): boolean {
  const [r, g, b] = chroma(hex).rgb();

  return r === g && g === b;
}


describe("find_text_color", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectedClient("find-text-color.spec");
  });


  describe("tool listing", () => {

    it("should be listed as a read-only tool with an output schema", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "find_text_color");

      expect(tool).toBeDefined();
      expect(tool!.annotations?.readOnlyHint).toBe(true);
      expect(tool!.outputSchema).toBeDefined();
      expect(tool!.description).toBeTruthy();
    });

    it("should ask for the background color only", async () => {
      // Mode, size and weight carry defaults, so an assistant that knows
      // nothing but the background still gets a body-text answer.
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "find_text_color");

      expect(tool!.inputSchema.required).toEqual(["backgroundColor"]);
    });

  });


  describe("the polarity", () => {

    it("should put white on black", async () => {
      // The one case a sign error in the black-or-white decision gets wrong:
      // every mode then treats black as light and answers black on black.
      const result = structured(await findTextColor(client, {backgroundColor: "#000000"}));

      expect(result["textColor"]).toBe("#ffffff");
      expect(result["polarity"]).toBe("light-on-dark");
      expect(result["lc"] as number).toBeLessThan(0);
      expect(result["meetsRequirement"]).toBe(true);
    });

    it("should put black on white", async () => {
      const result = structured(await findTextColor(client, {backgroundColor: "#ffffff"}));

      expect(result["textColor"]).toBe("#000000");
      expect(result["polarity"]).toBe("dark-on-light");
      expect(result["lc"] as number).toBeGreaterThan(0);
      expect(result["meetsRequirement"]).toBe(true);
    });

    it("should answer every mode with light text on a dark background", async () => {
      for (const mode of MODES) {
        const result = structured(await findTextColor(client, {backgroundColor: "#000000", mode}));

        expect(result["polarity"], mode).toBe("light-on-dark");
        expect(chroma(result["textColor"] as string).luminance(), mode).toBeGreaterThan(0.5);
      }
    });

    it("should pick the pole with the larger contrast, not the one luminance suggests", async () => {
      // APCA flips from white to black text around a luminance of 0.37; a
      // decision made at 0.5 hands out white on grays where black reads
      // better.
      for (const backgroundColor of ["#a0a0a0", "#a4a4a4", "#bbbbbb"]) {
        const result = structured(await findTextColor(client, {backgroundColor, mode: "optimal"}));
        const other = result["textColor"] === "#000000" ? "#ffffff" : "#000000";
        const otherLc = Math.abs(chroma.contrastAPCA(other, backgroundColor));

        expect(Math.abs(result["lc"] as number), backgroundColor).toBeGreaterThanOrEqual(otherLc);
      }
    });

  });


  describe("the modes", () => {

    it("should default to optimal", async () => {
      const result = structured(await findTextColor(client, {backgroundColor: "#3366cc"}));

      expect(result["mode"]).toBe("optimal");
      expect(result["appliedMode"]).toBe("optimal");
    });

    it("should answer grayscale with a gray that is not a pole where one passes", async () => {
      const result = structured(await findTextColor(client, {
        backgroundColor: "#000000",
        mode: "grayscale",
        fontSize: "24px"
      }));
      const textColor = result["textColor"] as string;

      expect(result["appliedMode"]).toBe("grayscale");
      expect(result["meetsRequirement"]).toBe(true);
      expect(isGray(textColor)).toBe(true);
      expect(["#000000", "#ffffff"]).not.toContain(textColor);
    });

    it("should answer minimum with a softer gray than optimal", async () => {
      const minimum = structured(await findTextColor(client, {backgroundColor: "#ffffff", mode: "minimum"}));
      const optimal = structured(await findTextColor(client, {backgroundColor: "#ffffff", mode: "optimal"}));

      expect(minimum["appliedMode"]).toBe("minimum");
      expect(minimum["meetsRequirement"]).toBe(true);
      expect(Math.abs(minimum["lc"] as number)).toBeLessThan(Math.abs(optimal["lc"] as number));
    });

    it("should answer harmonic on the background's own hue", async () => {
      const backgroundColor = "#3366cc";
      const result = structured(await findTextColor(client, {
        backgroundColor,
        mode: "harmonic",
        fontSize: "24px"
      }));
      const [bgHue] = chroma(backgroundColor).hsl();
      const [textHue] = chroma(result["textColor"] as string).hsl();
      const hueDiff = Math.abs(bgHue - textHue);

      expect(result["appliedMode"]).toBe("harmonic");
      expect(result["meetsRequirement"]).toBe(true);
      expect(Math.min(hueDiff, 360 - hueDiff)).toBeLessThan(30);
    });

    it("should answer harmonic on a gray with a gray and name minimum", async () => {
      // A white or gray surface has no hue to harmonise with. #109 names the
      // case: the tool degrades to minimum and says so, rather than handing
      // out a red-brown "on the background's own hue".
      for (const backgroundColor of ["#ffffff", "#000000", "#808080"]) {
        const result = structured(await findTextColor(client, {
          backgroundColor,
          mode: "harmonic",
          fontSize: "24px"
        }));

        expect(result["mode"], backgroundColor).toBe("harmonic");
        expect(result["appliedMode"], backgroundColor).toBe("minimum");
        expect(isGray(result["textColor"] as string), backgroundColor).toBe(true);
      }
    });

    it("should fall back to optimal and name it where the mode finds nothing", async () => {
      // Body text on mid-gray: no gray reaches 90. The caller asked for
      // grayscale and gets the pole - and is told which mode answered.
      const result = structured(await findTextColor(client, {
        backgroundColor: "#808080",
        mode: "grayscale",
        fontSize: "16px",
        fontWeight: "400"
      }));

      expect(result["mode"]).toBe("grayscale");
      expect(result["appliedMode"]).toBe("optimal");
      expect(result["meetsRequirement"]).toBe(false);
      expect(["#000000", "#ffffff"]).toContain(result["textColor"]);
    });

    it("should describe the color it returns, not the search that failed", async () => {
      const result = structured(await findTextColor(client, {
        backgroundColor: "#808080",
        mode: "harmonic",
        fontSize: "14px"
      }));
      const lc = chroma.contrastAPCA(result["textColor"] as string, "#808080");

      expect(result["appliedMode"]).toBe("optimal");
      expect(result["lc"]).toBe(lc);
    });

  });


  describe("font size and weight", () => {

    it("should default to body text", async () => {
      const result = structured(await findTextColor(client, {backgroundColor: "#ffffff"}));

      expect(result["fontSize"]).toBe("16px");
      expect(result["fontWeight"]).toBe("400");
      expect(result["requiredLc"]).toBe(90);
    });

    it("should echo the row it evaluated, not the size it was handed", async () => {
      const result = structured(await findTextColor(client, {backgroundColor: "#ffffff", fontSize: "17px"}));

      expect(result["fontSize"]).toBe("18px");
    });

    it("should report no requirement where no text is readable", async () => {
      // Not an error: at 12px the table has no requirement, so the tool
      // still names the stronger pole and says it does not pass.
      const result = structured(await findTextColor(client, {backgroundColor: "#000000", fontSize: "12px"}));

      expect(result["requiredLc"]).toBeNull();
      expect(result["meetsRequirement"]).toBe(false);
      expect(result["textColor"]).toBe("#ffffff");
    });

    it("should answer every mode at every size without an output error", async () => {
      // A NaN or an undefined in the payload fails the SDK's output
      // validation rather than the call, so every combination is exercised.
      for (const mode of MODES) {
        for (const fontSize of ["12px", "14px", "16px", "24px", "96px"]) {
          const result = await findTextColor(client, {backgroundColor: "#808080", mode, fontSize});

          expect(result.isError, `${mode} at ${fontSize}`).toBeFalsy();
        }
      }
    });

  });


  describe("the remedies", () => {

    // The two fields answer "the pair fails, what would make it pass": the
    // smallest size at the given weight, and the lightest weight at the given
    // size, at which the returned contrast meets the table. Each is read off
    // the table here so a retuned finder cannot move the expectation.
    function passes(lc: number, size: FontSize, weight: FontWeight): boolean {
      const required = apcaLookup[size][weight].contrast;

      return required !== null && Math.abs(lc) >= required;
    }

    it("should name the smallest passing size and the lightest passing weight for a failing pair", async () => {
      // Body text on a light gray: black is the answer and still misses 90.
      const result = structured(await findTextColor(client, {
        backgroundColor: "#bbbbbb",
        fontSize: "16px",
        fontWeight: "400"
      }));
      const lc = result["lc"] as number;
      const size = result["smallestPassingFontSize"] as FontSize;
      const weight = result["lightestPassingFontWeight"] as FontWeight;

      expect(result["meetsRequirement"]).toBe(false);
      expect(passes(lc, size, "400")).toBe(true);
      expect(FONT_SIZES.filter(candidate => parseInt(candidate, 10) < parseInt(size, 10))
        .some(smaller => passes(lc, smaller, "400"))).toBe(false);
      expect(passes(lc, "16px", weight)).toBe(true);
      expect(FONT_WEIGHTS.filter(candidate => parseInt(candidate, 10) < parseInt(weight, 10))
        .some(lighter => passes(lc, "16px", lighter))).toBe(false);
    });

    it("should leave the weight empty where no weight helps and still name a size", async () => {
      // At 12px every cell is null, so no weight makes the pair pass; a
      // larger size does. The two levers are independent.
      const result = structured(await findTextColor(client, {
        backgroundColor: "#bbbbbb",
        fontSize: "12px",
        fontWeight: "400"
      }));

      expect(result["lightestPassingFontWeight"]).toBeNull();
      expect(result["smallestPassingFontSize"]).not.toBeNull();
    });

    it("should name the levers for a passing pair too", async () => {
      // The fields describe the returned contrast, not the failure: for a
      // pair that passes they say how far it could be pushed, and neither
      // can name a row or cell stricter than the one that already passes.
      const result = structured(await findTextColor(client, {
        backgroundColor: "#ffffff",
        fontSize: "16px",
        fontWeight: "400"
      }));

      expect(result["meetsRequirement"]).toBe(true);
      expect(parseInt(result["smallestPassingFontSize"] as string, 10)).toBeLessThanOrEqual(16);
      expect(parseInt(result["lightestPassingFontWeight"] as string, 10)).toBeLessThanOrEqual(400);
    });

    it("should scan the whole row and column, not up to the first empty cell", async () => {
      // At 16px the weights 100 to 300 are null and 900 is null again; at
      // weight 400 the 12px row is null. A scan that stopped at the first
      // miss would answer null for both fields on a pair that passes at 700.
      const result = structured(await findTextColor(client, {
        backgroundColor: "#ffffff",
        mode: "grayscale",
        fontSize: "16px",
        fontWeight: "700"
      }));

      expect(result["meetsRequirement"]).toBe(true);
      expect(result["smallestPassingFontSize"]).not.toBeNull();
      expect(result["lightestPassingFontWeight"]).not.toBeNull();
    });

  });


  describe("the text summary", () => {

    it("should name both colors and leave the numbers to the payload", async () => {
      const result = await findTextColor(client, {backgroundColor: "#3366cc"});
      const text = summary(result);
      const payload = structured(result);

      expect(text).toContain(payload["textColorName"] as string);
      expect(text).toContain(payload["backgroundColorName"] as string);
      expect(text).not.toContain(String(payload["lc"]));
      expect(text).not.toContain(String(payload["requiredLc"]));
    });

    it("should say when nothing is readable", async () => {
      const result = await findTextColor(client, {backgroundColor: "#808080", fontSize: "16px"});

      expect(structured(result)["meetsRequirement"]).toBe(false);
      expect(summary(result)).toMatch(/^No text color is readable/);
    });

  });


  describe("invalid input", () => {

    it("should reject a background color that is not a hex color", async () => {
      const result = await findTextColor(client, {backgroundColor: "white"});

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

    it("should reject an 8-digit hex with an alpha byte", async () => {
      const result = await findTextColor(client, {backgroundColor: "#ffffff80"});

      expect(result.isError).toBe(true);
    });

    it("should reject a mode outside the list", async () => {
      const result = await findTextColor(client, {backgroundColor: "#ffffff", mode: "vivid"});

      expect(result.isError).toBe(true);
    });

    it("should reject a font weight outside the table", async () => {
      const result = await findTextColor(client, {backgroundColor: "#ffffff", fontWeight: "450"});

      expect(result.isError).toBe(true);
    });

    it("should accept a three-digit hex, the way the app does", async () => {
      const short = structured(await findTextColor(client, {backgroundColor: "#fff"}));
      const long = structured(await findTextColor(client, {backgroundColor: "#ffffff"}));

      expect(short).toEqual(long);
    });

  });

});
