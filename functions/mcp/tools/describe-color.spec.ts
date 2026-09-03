import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import chroma from "chroma-js";
import {beforeEach, describe, expect, it} from "vitest";
import {colorName} from "@common/helpers/color-name.helper";
import {connectedClient, structured, summary} from "../test-support/connected-client";


function describeColor(client: Client, color: string) {
  return client.callTool({name: "describe_color", arguments: {color}});
}


describe("describe_color", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectedClient("describe-color.spec");
  });


  describe("tool listing", () => {

    it("should be listed as a read-only tool with an output schema", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "describe_color");

      expect(tool).toBeDefined();
      expect(tool!.annotations?.readOnlyHint).toBe(true);
      expect(tool!.outputSchema).toBeDefined();
      expect(tool!.description).toBeTruthy();
    });

  });


  describe("a chromatic color", () => {

    it("should return every format of the color it was given", async () => {
      const result = structured(await describeColor(client, "#1e90ff"));

      // The hex is the app's own spelling of the same color, so it round-trips.
      expect(chroma(result["hex"] as string).hex()).toBe("#1e90ff");
      expect(result["rgb"]).toMatch(/^rgb\(/);
      expect(result["hsl"]).toMatch(/^hsl\(/);
      expect(result["oklch"]).toMatch(/^oklch\(/);
    });

    it("should name the color the way the app does", async () => {
      const result = structured(await describeColor(client, "#1e90ff"));

      expect(result["name"]).toBe(colorName(chroma("#1e90ff")));
    });

    it("should report OKLch lightness, chroma and hue as numbers in range", async () => {
      const result = structured(await describeColor(client, "#1e90ff"));

      expect(result["lightness"]).toBeGreaterThan(0);
      expect(result["lightness"]).toBeLessThan(1);
      expect(result["chroma"]).toBeGreaterThan(0);
      expect(result["hue"]).toBeGreaterThanOrEqual(0);
      expect(result["hue"]).toBeLessThan(360);
    });

    it("should report a maximum chroma the color itself does not exceed", async () => {
      const result = structured(await describeColor(client, "#1e90ff"));

      // Within the search resolution of maxChroma(): an in-gamut color cannot
      // sit meaningfully above the gamut boundary at its own lightness and hue.
      expect(result["maxChroma"]).toBeGreaterThan(0);
      expect(result["chroma"] as number).toBeLessThanOrEqual((result["maxChroma"] as number) + 1e-3);
    });

    it("should quote the name and the hex in the text summary", async () => {
      const result = await describeColor(client, "#1e90ff");
      const text = summary(result);
      const expected = structured(result);

      expect(text).toContain(expected["name"]);
      expect(text).toContain(expected["hex"]);
    });

    it("should accept the hex without a leading hash", async () => {
      const withHash = structured(await describeColor(client, "#1e90ff"));
      const withoutHash = structured(await describeColor(client, "1e90ff"));

      expect(withoutHash).toEqual(withHash);
    });

  });


  describe("an achromatic color", () => {

    it("should report the hue as null and the maximum chroma as zero", async () => {
      const result = structured(await describeColor(client, "#808080"));

      // Grey has no hue; chroma-js says NaN, which JSON cannot carry.
      expect(result["hue"]).toBeNull();
      expect(result["maxChroma"]).toBe(0);
    });

    it("should clamp pure black into the usable lightness band", async () => {
      const result = structured(await describeColor(client, "#000000"));

      expect(result["lightness"]).toBe(0);
      expect(result["usableLightness"]).toBeGreaterThan(0);
    });

    it("should clamp pure white into the usable lightness band", async () => {
      const result = structured(await describeColor(client, "#ffffff"));

      expect(result["lightness"]).toBeCloseTo(1, 5);
      expect(result["usableLightness"]).toBeLessThan(1);
    });

  });


  describe("invalid input", () => {

    it("should reject a value that is not a hex color", async () => {
      const result = await describeColor(client, "dodgerblue");

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

    it("should reject a hex of the wrong length", async () => {
      const result = await describeColor(client, "#1e90f");

      expect(result.isError).toBe(true);
    });

    it("should reject an 8-digit hex with an alpha byte", async () => {
      const result = await describeColor(client, "#1e90ff80");

      // Every output field drops the alpha byte, so answering it as an
      // opaque color would silently misdescribe the input.
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

  });

});
