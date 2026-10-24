import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {beforeEach, describe, expect, it} from "vitest";
import {paletteFromId} from "@engine/palette/palette-id.helper";
import {ExportFormat, exportAs} from "@engine/palette/palette-export.helper";
import {createShades, createTints} from "@engine/helpers/tints-and-shades.helper";
import {connectedClient, structured, summary} from "../test-support/connected-client";


const FORMATS: ExportFormat[] = ["css", "scss", "tailwind", "json", "dtcg"];

function exportPalette(client: Client, id: string, format: string) {
  return client.callTool({name: "export_palette", arguments: {id, format}});
}

async function generatedPalette(client: Client, style = "triadic") {
  const generated = structured(await client.callTool({
    name: "generate_palette",
    arguments: {baseColor: "#3b6ea5", style, seed: 7}
  }));
  const colors = generated["colors"] as {hex: string}[];

  return {id: generated["id"] as string, baseHex: colors[0].hex};
}

function codeOf(payload: Record<string, unknown>): string {
  return payload["code"] as string;
}


describe("export_palette", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectedClient("export-palette.spec");
  });


  describe("tool listing", () => {

    it("should be listed as a read-only tool with an output schema", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "export_palette");

      expect(tool).toBeDefined();
      expect(tool!.annotations?.readOnlyHint).toBe(true);
      expect(tool!.outputSchema).toBeDefined();
      expect(tool!.description).toBeTruthy();
    });

    it("should ask for the id and the format", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "export_palette");

      expect(tool!.inputSchema.required).toEqual(["id", "format"]);
    });

    it("should offer every format the export panel offers", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "export_palette");
      const formats = (tool!.inputSchema.properties as {
        format: {enum: string[]}
      }).format.enum;

      expect(formats).toEqual(FORMATS);
    });

  });


  describe("the round trip from generate_palette", () => {

    it("should carry the base color in every format", async () => {
      const {id, baseHex} = await generatedPalette(client);

      for (const format of FORMATS) {
        const code = codeOf(structured(await exportPalette(client, id, format)));

        expect(code.toLowerCase(), format).toContain(baseHex.toLowerCase());
      }
    });

    it("should answer with the format asked for and the palette's name", async () => {
      const {id} = await generatedPalette(client);
      const payload = structured(await exportPalette(client, id, "scss"));

      expect(payload["format"]).toBe("scss");
      expect(payload["paletteName"]).toBe(paletteFromId(id).name);
    });

  });


  describe("the panel's code", () => {

    it("should return exactly what the export panel renders for the palette", async () => {
      // The panel renders exportAs() on the current color, the palette built
      // on it and both ramps; with the ramps at the engine's defaults the
      // tool and the panel cannot drift apart.
      const {id} = await generatedPalette(client, "analogous");
      const palette = paletteFromId(id);
      const base = palette.color0.color;
      const source = {base, palette, tints: createTints(base), shades: createShades(base)};

      for (const format of FORMATS) {
        const code = codeOf(structured(await exportPalette(client, id, format)));

        expect(code, format).toBe(exportAs(format, source));
      }
    });

    it("should hand out JSON and DTCG that parse", async () => {
      const {id} = await generatedPalette(client);

      for (const format of ["json", "dtcg"]) {
        const code = codeOf(structured(await exportPalette(client, id, format)));

        expect(() => JSON.parse(code), format).not.toThrow();
      }
    });

    it("should open each stylesheet format the way it is pasted", async () => {
      const {id} = await generatedPalette(client);
      const css = codeOf(structured(await exportPalette(client, id, "css")));
      const tailwind = codeOf(structured(await exportPalette(client, id, "tailwind")));
      const scss = codeOf(structured(await exportPalette(client, id, "scss")));

      expect(css.startsWith(":root {")).toBe(true);
      expect(tailwind.startsWith("@theme {")).toBe(true);
      expect(scss).toContain("$palette-base");
    });

  });


  describe("malformed input", () => {

    it("should reject an id of the right length in the wrong alphabet", async () => {
      const result = await exportPalette(client, "!".repeat(43), "css");

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

    it("should reject a style index no style answers to", async () => {
      // The decoder answers an unknown index with a random style, so the
      // same id would export two different palettes on two calls.
      const result = await exportPalette(client, `a${"0".repeat(42)}`, "css");

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

    it("should reject an id that is too short", async () => {
      const result = await exportPalette(client, "0".repeat(42), "css");

      expect(result.isError).toBe(true);
      expect(summary(result)).toContain("43 base62 characters");
    });

    it("should reject a format the panel does not offer", async () => {
      const {id} = await generatedPalette(client);
      const result = await exportPalette(client, id, "less");

      expect(result.isError).toBe(true);
    });

  });


  describe("the text summary", () => {

    it("should name the format and the palette rather than carry the code", async () => {
      const {id} = await generatedPalette(client);
      const result = await exportPalette(client, id, "css");
      const text = summary(result);

      expect(text).toContain("CSS");
      expect(text).toContain(structured(result)["paletteName"] as string);
      expect(text).not.toContain(":root");
    });

  });

});
