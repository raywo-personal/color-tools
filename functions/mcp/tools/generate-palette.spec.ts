import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {beforeEach, describe, expect, it} from "vitest";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {PaletteStylesWithoutRandom} from "@engine/palette/palette-style.model";
import {connectedClient, structured, summary} from "../test-support/connected-client";


interface GeneratePaletteArgs {
  baseColor: string;
  style: string;
  seed?: number;
}

interface PaletteEntry {
  slot: string;
  role: string;
  hex: string;
  name: string;
}

function generatePalette(client: Client, args: GeneratePaletteArgs) {
  return client.callTool({name: "generate_palette", arguments: {...args}});
}

function colorsOf(payload: Record<string, unknown>): PaletteEntry[] {
  return payload["colors"] as PaletteEntry[];
}


describe("generate_palette", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectedClient("generate-palette.spec");
  });


  describe("tool listing", () => {

    it("should be listed as a read-only tool with an output schema", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "generate_palette");

      expect(tool).toBeDefined();
      expect(tool!.annotations?.readOnlyHint).toBe(true);
      expect(tool!.outputSchema).toBeDefined();
      expect(tool!.description).toBeTruthy();
    });

    it("should ask for a base color and a style, and draw the seed itself", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "generate_palette");

      expect(tool!.inputSchema.required).toEqual(["baseColor", "style"]);
    });

  });


  describe("the seed", () => {

    it("should give the same palette for the same base, style and seed", async () => {
      // The generators vary each derived member through randomBetween(), and
      // only a withSeed() scope replays those draws. A seed that arrives as a
      // hue instead is dropped wherever color0 is set, and the same seed then
      // answers with a different palette on every call.
      const first = structured(await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "vibrant-balanced",
        seed: 12345
      }));
      const second = structured(await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "vibrant-balanced",
        seed: 12345
      }));

      expect(second["id"]).toBe(first["id"]);
      expect(colorsOf(second)).toEqual(colorsOf(first));
    });

    it("should give a different palette for a different seed", async () => {
      const first = structured(await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "vibrant-balanced",
        seed: 1
      }));
      const second = structured(await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "vibrant-balanced",
        seed: 2
      }));

      expect(second["id"]).not.toBe(first["id"]);
    });

    it("should return a drawn seed that reproduces the palette", async () => {
      // Without the seed in the answer an assistant cannot ask for the
      // palette it is talking about a second time.
      const drawn = structured(await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "vibrant-balanced"
      }));
      const again = structured(await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "vibrant-balanced",
        seed: drawn["seed"] as number
      }));

      expect(drawn["seed"]).toEqual(expect.any(Number));
      expect(again["id"]).toBe(drawn["id"]);
      expect(colorsOf(again)).toEqual(colorsOf(drawn));
    });

    it("should echo a passed seed unchanged", async () => {
      const payload = structured(await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "harmonic",
        seed: 42
      }));

      expect(payload["seed"]).toBe(42);
    });

  });


  describe("the palette", () => {

    it("should return the five slots in order", async () => {
      const payload = structured(await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "analogous",
        seed: 7
      }));

      expect(colorsOf(payload).map(color => color.slot)).toEqual([...PALETTE_SLOTS]);
    });

    it("should name every member and say what it is for", async () => {
      // The role is what lets an assistant write --accent: rather than five
      // colors in a row.
      const payload = structured(await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "split-complementary",
        seed: 7
      }));

      for (const color of colorsOf(payload)) {
        expect(color.role, color.slot).toBeTruthy();
        expect(color.name, color.slot).toBeTruthy();
        expect(color.hex, color.slot).toMatch(/^#[0-9a-f]{6}$/);
      }
    });

    it("should return the base color unchanged as color0", async () => {
      for (const style of PaletteStylesWithoutRandom) {
        const payload = structured(await generatePalette(client, {
          baseColor: "#3b6ea5",
          style,
          seed: 7
        }));

        expect(colorsOf(payload)[0].hex, style).toBe("#3b6ea5");
      }
    });

    it("should carry the style it was asked for and an id of the id's length", async () => {
      const payload = structured(await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "monochromatic",
        seed: 7
      }));

      expect(payload["style"]).toBe("monochromatic");
      expect(payload["id"]).toMatch(/^[0-9][0-9A-Za-z]{42}$/);
      expect(payload["name"]).toBeTruthy();
    });

    it("should answer every style it offers", async () => {
      for (const style of PaletteStylesWithoutRandom) {
        const result = await generatePalette(client, {
          baseColor: "#3b6ea5",
          style,
          seed: 7
        });

        expect(result.isError, style).toBeFalsy();
      }
    });

  });


  describe("the text summary", () => {

    it("should name the palette rather than repeat its colors", async () => {
      // The numbers are in structuredContent; the sentence is what an
      // assistant quotes.
      const result = await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "triadic",
        seed: 7
      });
      const payload = structured(result);
      const text = summary(result);

      expect(text).toContain(payload["name"] as string);

      for (const color of colorsOf(payload).slice(1)) {
        expect(text).not.toContain(color.hex);
      }
    });

  });


  describe("invalid input", () => {

    it("should reject a base color that is not a hex color", async () => {
      const result = await generatePalette(client, {
        baseColor: "dodgerblue",
        style: "triadic"
      });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

    it("should reject an 8-digit hex with an alpha byte", async () => {
      const result = await generatePalette(client, {
        baseColor: "#3b6ea580",
        style: "triadic"
      });

      expect(result.isError).toBe(true);
    });

    it("should not offer the random style", async () => {
      // A palette whose members are rolled independently of the base color
      // answers nothing an assistant asked for, and it cannot look at the
      // result and roll again.
      const result = await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "random"
      });

      expect(result.isError).toBe(true);
    });

    it("should reject a seed outside the 32-bit range", async () => {
      const negative = await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "triadic",
        seed: -1
      });
      const tooLarge = await generatePalette(client, {
        baseColor: "#3b6ea5",
        style: "triadic",
        seed: 2 ** 32
      });

      expect(negative.isError).toBe(true);
      expect(tooLarge.isError).toBe(true);
    });

  });

});
