import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {beforeEach, describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {PaletteStyles} from "@engine/palette/palette-style.model";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {bigIntToBase62} from "@engine/helpers/base62.helper";
import {connectedClient, structured, summary} from "../test-support/connected-client";


interface PaletteEntry {
  slot: string;
  role: string;
  hex: string;
  name: string;
}

function readPalette(client: Client, id: string) {
  return client.callTool({name: "read_palette", arguments: {id}});
}

function generate(client: Client, style: string, seed = 7) {
  return client.callTool({
    name: "generate_palette",
    arguments: {baseColor: "#3b6ea5", style, seed}
  });
}

function colorsOf(payload: Record<string, unknown>): PaletteEntry[] {
  return payload["colors"] as PaletteEntry[];
}

/** An id the way the app writes one, for a style the tool does not offer. */
function idFromTheApp(style: typeof PaletteStyles[number]): string {
  return generatePaletteFrom(chroma("#3b6ea5"), style, 7).id;
}


describe("read_palette", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectedClient("read-palette.spec");
  });


  describe("tool listing", () => {

    it("should be listed as a read-only tool with an output schema", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "read_palette");

      expect(tool).toBeDefined();
      expect(tool!.annotations?.readOnlyHint).toBe(true);
      expect(tool!.outputSchema).toBeDefined();
      expect(tool!.description).toBeTruthy();
    });

    it("should ask for the id alone", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "read_palette");

      expect(tool!.inputSchema.required).toEqual(["id"]);
    });

  });


  describe("the round trip", () => {

    it("should return what generate_palette returned", async () => {
      const generated = structured(await generate(client, "triadic"));
      const read = structured(await readPalette(client, generated["id"] as string));

      expect(read["id"]).toBe(generated["id"]);
      expect(read["style"]).toBe(generated["style"]);
      expect(read["name"]).toBe(generated["name"]);
      expect(colorsOf(read)).toEqual(colorsOf(generated));
    });

    it("should answer flat, with the five slots in order", async () => {
      const generated = structured(await generate(client, "analogous"));
      const read = structured(await readPalette(client, generated["id"] as string));

      expect(colorsOf(read).map(color => color.slot)).toEqual([...PALETTE_SLOTS]);

      for (const color of colorsOf(read)) {
        expect(color.role, color.slot).toBeTruthy();
        expect(color.name, color.slot).toBeTruthy();
      }
    });

    it("should come back the same for every style generate_palette offers", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "generate_palette");
      const styles = (tool!.inputSchema.properties as {
        style: {enum: string[]}
      }).style.enum;

      for (const style of styles) {
        const generated = structured(await generate(client, style));
        const read = structured(await readPalette(client, generated["id"] as string));

        expect(colorsOf(read).map(color => color.hex), style)
          .toEqual(colorsOf(generated).map(color => color.hex));
      }
    });

  });


  describe("ids the app writes", () => {

    it("should restore a palette of every style, random included", async () => {
      // The style travels in the id, and the app rolls palettes this tool
      // does not offer. A style missing from the output schema fails the
      // call at the SDK's validation, after the handler is through.
      for (const style of PaletteStyles) {
        const result = await readPalette(client, idFromTheApp(style));

        expect(result.isError, style).toBeFalsy();
        expect(structured(result)["style"], style).toBe(style);
      }
    });

  });


  describe("malformed ids", () => {

    it("should reject an id of the right length in the wrong alphabet", async () => {
      // The decoder restores this one: it reads no byte from the foreign
      // characters and pads to 31 zeroes, so a mistyped id would answer with
      // an invented palette of five blacks rather than fail.
      const result = await readPalette(client, "!".repeat(43));

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

    it("should reject a style index no style answers to", async () => {
      // styleFromPaletteId answers an unknown index with a random style, so
      // the same id could otherwise come back as two different palettes. The
      // style character is base62, so what rules this one out is the index it
      // reads - 36 - naming no style, not the character being a letter.
      const result = await readPalette(client, `a${"0".repeat(42)}`);

      expect(result.isError).toBe(true);
    });

    it("should reject an id that is too short or too long", async () => {
      // The wrong length is answered with the shape the caller asked about,
      // not with what the decoder says when it is handed one anyway.
      const short = await readPalette(client, "0".repeat(42));
      const long = await readPalette(client, "0".repeat(44));

      expect(short.isError).toBe(true);
      expect(long.isError).toBe(true);
      expect(summary(short)).toContain("43 base62 characters");
      expect(summary(long)).toContain("43 base62 characters");
    });

    it("should reject an empty id", async () => {
      const result = await readPalette(client, "");

      expect(result.isError).toBe(true);
    });

    it("should reject an id that decodes to more than 31 bytes", async () => {
      // 42 base62 characters reach past the 2^248 that 31 bytes hold. The
      // decoder pads a short value and never truncates a long one, so the
      // five colors would be read from a window shifted by one and the
      // pinned mask would fall to 0 - an invented palette, not an error.
      const result = await readPalette(client, `0${"z".repeat(42)}`);

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

    it("should accept the largest id the encoder can write", async () => {
      // The bound is exclusive: 31 bytes of 0xff still decode.
      const largest = bigIntToBase62(256n ** 31n - 1n, 42);
      const result = await readPalette(client, `1${largest}`);

      expect(result.isError).toBeFalsy();
    });

  });


  describe("the text summary", () => {

    it("should name the palette rather than repeat its colors", async () => {
      const generated = structured(await generate(client, "complementary"));
      const result = await readPalette(client, generated["id"] as string);
      const text = summary(result);

      expect(text).toContain(structured(result)["name"] as string);

      for (const color of colorsOf(structured(result)).slice(1)) {
        expect(text).not.toContain(color.hex);
      }
    });

  });

});
