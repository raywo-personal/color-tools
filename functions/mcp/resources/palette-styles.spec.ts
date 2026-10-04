import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {beforeEach, describe, expect, it} from "vitest";
import {
  PaletteStyle,
  PaletteStylesWithoutRandom,
  styleCaptionFor,
  styleDescriptionFor
} from "@engine/palette/palette-style.model";
import {connectedClient} from "../test-support/connected-client";


const URI = "colortools://palette-styles";

interface StyleEntry {
  style: PaletteStyle;
  label: string;
  description: string;
}

async function styleEntries(client: Client): Promise<StyleEntry[]> {
  const {contents} = await client.readResource({uri: URI});
  const [content] = contents;

  if (!("text" in content)) {
    throw new Error("The resource answered with a blob, not with text");
  }

  return JSON.parse(content.text as string) as StyleEntry[];
}


describe("the palette-styles resource", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectedClient("palette-styles.spec");
  });


  describe("resource listing", () => {

    it("should be listed with its uri, a title and a description", async () => {
      const {resources} = await client.listResources();
      const resource = resources.find(candidate => candidate.uri === URI);

      expect(resource).toBeDefined();
      expect(resource!.name).toBe("palette-styles");
      expect(resource!.title).toBeTruthy();
      expect(resource!.description).toBeTruthy();
      expect(resource!.mimeType).toBe("application/json");
    });

    it("should answer a read with json under the uri that was asked for", async () => {
      const {contents} = await client.readResource({uri: URI});

      expect(contents).toHaveLength(1);
      expect(contents[0].uri).toBe(URI);
      expect(contents[0].mimeType).toBe("application/json");
    });

  });


  describe("the styles", () => {

    it("should list every style a caller may ask for", async () => {
      const entries = await styleEntries(client);

      expect(entries.map(entry => entry.style))
        .toEqual([...PaletteStylesWithoutRandom]);
    });

    it("should label and describe each one in the app's own words", async () => {
      // Written once in the engine and read here: a second wording would
      // drift away from what the app shows for the same style.
      const entries = await styleEntries(client);

      for (const entry of entries) {
        expect(entry.label, entry.style).toBe(styleCaptionFor(entry.style));
        expect(entry.description, entry.style).toBe(styleDescriptionFor(entry.style));
        expect(entry.label, entry.style).toBeTruthy();
        expect(entry.description, entry.style).toBeTruthy();
      }
    });

    it("should describe exactly the styles generate_palette accepts", async () => {
      // The enum is what makes the model pick a valid style; the resource is
      // what lets it pick a sensible one. A style in one and not the other
      // leaves it guessing either way.
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "generate_palette");
      const offered = (tool!.inputSchema.properties as {
        style: {enum: string[]}
      }).style.enum;
      const entries = await styleEntries(client);

      expect(entries.map(entry => entry.style)).toEqual(offered);
    });

  });

});
