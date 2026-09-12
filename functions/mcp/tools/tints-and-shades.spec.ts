import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import chroma from "chroma-js";
import {beforeEach, describe, expect, it} from "vitest";
import {colorName} from "@engine/color/color-name.helper";
import {connectedClient, structured, summary} from "../test-support/connected-client";


const BASE = "#3b6ea5";

type Step = {step: number; hex: string; name: string};

function tintsAndShades(client: Client, color: string) {
  return client.callTool({name: "tints_and_shades", arguments: {color}});
}


function ramp(result: Record<string, unknown>, key: "tints" | "shades"): Step[] {
  return result[key] as Step[];
}


describe("tints_and_shades", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectedClient("tints-and-shades.spec");
  });


  describe("tool listing", () => {

    it("should be listed as a read-only tool with an output schema", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "tints_and_shades");

      expect(tool).toBeDefined();
      expect(tool!.annotations?.readOnlyHint).toBe(true);
      expect(tool!.outputSchema).toBeDefined();
      expect(tool!.description).toBeTruthy();
    });

  });


  describe("the two ramps", () => {

    it("should return eleven steps per ramp, numbered from zero", async () => {
      const result = structured(await tintsAndShades(client, BASE));

      for (const key of ["tints", "shades"] as const) {
        const steps = ramp(result, key);

        expect(steps).toHaveLength(11);
        expect(steps.map(step => step.step)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      }
    });

    it("should start both ramps at the color it was given", async () => {
      const result = structured(await tintsAndShades(client, BASE));

      // The app draws both ramps from the base, so the two arrays share it:
      // 21 distinct colors, not 22. The field descriptions say so.
      expect(ramp(result, "tints")[0].hex).toBe(BASE);
      expect(ramp(result, "shades")[0].hex).toBe(BASE);
      expect(result["baseColor"]).toBe(BASE);
    });

    it("should end the tints at white and the shades at black", async () => {
      const result = structured(await tintsAndShades(client, BASE));

      expect(ramp(result, "tints")[10].hex).toBe("#ffffff");
      expect(ramp(result, "shades")[10].hex).toBe("#000000");
    });

    it("should name every step the way the app does", async () => {
      const result = structured(await tintsAndShades(client, BASE));

      for (const key of ["tints", "shades"] as const) {
        for (const step of ramp(result, key)) {
          expect(step.name).toBe(colorName(chroma(step.hex)));
          expect(step.name).not.toBe("");
        }
      }

      expect(result["baseColorName"]).toBe(colorName(chroma(BASE)));
    });

    it("should walk each ramp towards its end without turning back", async () => {
      const result = structured(await tintsAndShades(client, BASE));
      const lightness = (steps: Step[]) => steps.map(step => chroma(step.hex).oklch()[0]);

      // What a caller asks a tool for instead of interpolating in the head:
      // every step moves further from the base, none doubles back.
      const tints = lightness(ramp(result, "tints"));
      const shades = lightness(ramp(result, "shades"));

      for (let index = 1; index < 11; index++) {
        expect(tints[index]).toBeGreaterThan(tints[index - 1]);
        expect(shades[index]).toBeLessThan(shades[index - 1]);
      }
    });

    it("should answer the same ramps for the same color", async () => {
      const first = structured(await tintsAndShades(client, BASE));
      const second = structured(await tintsAndShades(client, BASE));

      expect(second).toEqual(first);
    });

  });


  describe("the summary", () => {

    it("should quote the base color's name and hex", async () => {
      const result = await tintsAndShades(client, BASE);
      const expected = structured(result);

      expect(summary(result)).toContain(expected["baseColorName"] as string);
      expect(summary(result)).toContain(expected["baseColor"] as string);
    });

  });


  describe("achromatic input", () => {

    it("should build both ramps from white", async () => {
      const result = structured(await tintsAndShades(client, "#ffffff"));

      // A base that already is one end of a ramp still answers eleven steps,
      // so a caller's indexing does not depend on the color it passed.
      expect(ramp(result, "tints")).toHaveLength(11);
      expect(ramp(result, "shades")).toHaveLength(11);
      expect(ramp(result, "shades")[10].hex).toBe("#000000");
    });

  });


  describe("invalid input", () => {

    it("should reject a value that is not a hex color", async () => {
      const result = await tintsAndShades(client, "dodgerblue");

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

    it("should reject an 8-digit hex with a translucent alpha byte", async () => {
      const result = await tintsAndShades(client, "#3b6ea580");

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

  });

});
