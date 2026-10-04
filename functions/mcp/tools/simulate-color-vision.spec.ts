import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import chroma from "chroma-js";
import {beforeEach, describe, expect, it} from "vitest";
import {connectedClient, structured, summary} from "../test-support/connected-client";
import {sentenceNames} from "./simulate-color-vision";


interface NamedColor {
  hex: string;
  name: string;
}

interface Simulation {
  deficiency: string;
  colors: NamedColor[];
  collisions: {members: number[]}[];
}

interface SimulateArgs {
  colors: string[];
  deficiency?: string;
}

function simulate(client: Client, args: SimulateArgs) {
  return client.callTool({name: "simulate_color_vision", arguments: {...args}});
}

async function simulations(client: Client, args: SimulateArgs): Promise<Simulation[]> {
  return structured(await simulate(client, args))["simulations"] as Simulation[];
}

function distance(a: string, b: string): number {
  return chroma.distance(a, b, "oklab");
}

// A red and a teal on one deutan confusion line, a quarter of the Oklab
// space apart in normal vision - the pair the engine's own spec collapses.
const RED = chroma.oklch(0.62, 0.12, 0).hex();
const TEAL = chroma.oklch(0.62, 0.12, 170).hex();
const BLUE = chroma.oklch(0.62, 0.12, 250).hex();


describe("simulate_color_vision", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectedClient("simulate-color-vision.spec");
  });


  describe("tool listing", () => {

    it("should be listed as a read-only tool with an output schema", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "simulate_color_vision");

      expect(tool).toBeDefined();
      expect(tool!.annotations?.readOnlyHint).toBe(true);
      expect(tool!.outputSchema).toBeDefined();
      expect(tool!.description).toBeTruthy();
    });

    it("should ask for the colors only", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "simulate_color_vision");

      expect(tool!.inputSchema.required).toEqual(["colors"]);
    });

  });


  describe("the simulations", () => {

    it("should simulate all four deficiencies in the enum's order where none is asked for", async () => {
      const result = await simulations(client, {colors: [RED, TEAL]});

      expect(result.map(simulation => simulation.deficiency))
        .toEqual(["deuteranopia", "protanopia", "tritanopia", "achromatopsia"]);
    });

    it("should simulate only the deficiency asked for", async () => {
      const result = await simulations(client, {colors: [RED, TEAL], deficiency: "tritanopia"});

      expect(result.map(simulation => simulation.deficiency)).toEqual(["tritanopia"]);
    });

    it("should answer every color in input order, named, under every deficiency", async () => {
      const colors = [RED, TEAL, BLUE, "#000000", "#ffffff"];
      const result = structured(await simulate(client, {colors}));

      expect((result["colors"] as NamedColor[]).map(color => color.hex)).toEqual(colors);

      for (const simulation of result["simulations"] as Simulation[]) {
        expect(simulation.colors).toHaveLength(colors.length);
        simulation.colors.forEach(color => expect(color.name).toBeTruthy());
      }
    });

    it("should return a grey unchanged under every deficiency", async () => {
      const greys = ["#000000", "#777777", "#ffffff"];

      for (const simulation of await simulations(client, {colors: greys})) {
        simulation.colors.forEach((color, index) =>
          expect(distance(color.hex, greys[index]), simulation.deficiency).toBeLessThan(0.005)
        );
      }
    });

    it("should leave no chroma under achromatopsia", async () => {
      const result = await simulations(client, {colors: [RED, TEAL, BLUE, "#ffcc00"], deficiency: "achromatopsia"});

      result[0].colors.forEach(color => expect(chroma(color.hex).oklch()[1]).toBeLessThan(0.001));
    });

    it("should bring red and green closer under the red-green deficiencies", async () => {
      const colors = ["#ff0000", "#00ff00"];

      for (const deficiency of ["protanopia", "deuteranopia"]) {
        const [simulation] = await simulations(client, {colors, deficiency});

        expect(distance(simulation.colors[0].hex, simulation.colors[1].hex), deficiency)
          .toBeLessThan(distance(colors[0], colors[1]));
      }
    });

    it("should bring blue and yellow closer under tritanopia", async () => {
      const colors = ["#0000ff", "#ffff00"];
      const [simulation] = await simulations(client, {colors, deficiency: "tritanopia"});

      expect(distance(simulation.colors[0].hex, simulation.colors[1].hex))
        .toBeLessThan(distance(colors[0], colors[1]));
    });

    it("should answer the hex values in lower case, as the other tools do", async () => {
      const result = structured(await simulate(client, {colors: ["#3B6EA5"]}));
      const simulated = (result["simulations"] as Simulation[]).flatMap(simulation => simulation.colors);

      expect((result["colors"] as NamedColor[])[0].hex).toBe("#3b6ea5");
      simulated.forEach(color => expect(color.hex).toBe(color.hex.toLowerCase()));
    });

  });


  describe("the collisions", () => {

    it("should name the colors a deficiency merges by their index", async () => {
      const [simulation] = await simulations(client, {colors: [RED, TEAL, BLUE], deficiency: "deuteranopia"});

      expect(simulation.collisions).toEqual([{members: [0, 1]}]);
    });

    it("should report colors that land on one as a single group", async () => {
      const sameLightness = [
        chroma.oklch(0.6, 0.1, 30).hex(),
        chroma.oklch(0.6, 0.1, 150).hex(),
        chroma.oklch(0.6, 0.1, 270).hex()
      ];
      const [simulation] = await simulations(client, {colors: sameLightness, deficiency: "achromatopsia"});

      expect(simulation.collisions).toEqual([{members: [0, 1, 2]}]);
    });

    it("should not report colors that already looked alike", async () => {
      const result = await simulations(client, {colors: ["#3366cc", "#3466cb"]});

      result.forEach(simulation => expect(simulation.collisions, simulation.deficiency).toEqual([]));
    });

  });


  describe("the sentence", () => {

    it("should name the merging colors and the deficiency, and leave the numbers to the payload", async () => {
      const response = await simulate(client, {colors: [RED, TEAL, BLUE], deficiency: "deuteranopia"});
      const names = (structured(response)["colors"] as NamedColor[]).map(color => color.name);
      const text = summary(response);

      expect(text).toBe(`Under deuteranopia, ${names[0]} and ${names[1]} become the same color.`);
    });

    it("should name every group a deficiency merges, joined by a comma and an and", async () => {
      // Two red-green pairs on deutan confusion lines, one dark and one light.
      const colors = [
        chroma.oklch(0.45, 0.1, 30).hex(),
        chroma.oklch(0.45, 0.1, 150).hex(),
        chroma.oklch(0.8, 0.1, 30).hex(),
        chroma.oklch(0.8, 0.1, 150).hex()
      ];
      const response = await simulate(client, {colors, deficiency: "deuteranopia"});
      const names = (structured(response)["colors"] as NamedColor[]).map(color => color.name);

      expect((structured(response)["simulations"] as Simulation[])[0].collisions)
        .toEqual([{members: [0, 1]}, {members: [2, 3]}]);
      expect(summary(response)).toBe(
        `Under deuteranopia, ${names[0]} and ${names[1]} become the same color, and ${names[2]} and ${names[3]} become the same color.`
      );
    });

    it("should say that the other simulations merge none", async () => {
      const response = await simulate(client, {colors: [RED, TEAL, BLUE]});
      const text = summary(response);

      expect(text).toMatch(/^Under deuteranopia, /);
      expect(text).toMatch(/; the other (simulation merges|two simulations merge|three simulations merge) none\.$/);
      expect(text).not.toContain("#");
    });

    it("should say so where no deficiency merges anything", async () => {
      const text = summary(await simulate(client, {colors: ["#000000", "#ffffff"]}));

      expect(text).toBe("No simulated deficiency merges two of these colors that normal vision tells apart.");
    });

    it("should not call colors as distinct as before that a deficiency only brings closer", async () => {
      // Red and green on a deutan confusion line: far closer under
      // deuteranopia, yet not close enough to count as one.
      const text = summary(await simulate(client, {colors: ["#d62728", "#2ca02c"]}));

      expect(text).not.toContain("distinct");
      expect(text).toBe("No simulated deficiency merges two of these colors that normal vision tells apart.");
    });

    it("should not call colors distinguishable that normal vision already merges", async () => {
      const text = summary(await simulate(client, {colors: ["#ff0000", "#ff0000", "#109d7b"], deficiency: "tritanopia"}));

      expect(text).not.toContain("distinguishable");
      expect(text).toBe("Tritanopia merges none of these colors that normal vision tells apart.");
    });

    it("should name the one deficiency asked for where nothing merges", async () => {
      const text = summary(await simulate(client, {colors: ["#000000", "#777777", "#ffffff"], deficiency: "protanopia"}));

      expect(text).toBe("Protanopia merges none of these colors that normal vision tells apart.");
    });

    it("should not call a single color distinguishable from others", async () => {
      const text = summary(await simulate(client, {colors: ["#3b6ea5"]}));

      expect(text).toBe("A single color has no other to merge with.");
    });

  });


  describe("the input", () => {

    it("should accept ten colors", async () => {
      const colors = Array.from({length: 10}, (_, index) => chroma.oklch(0.6, 0.1, index * 36).hex());
      const result = structured(await simulate(client, {colors}));

      expect(result["simulations"] as Simulation[]).toHaveLength(4);
    });

    it("should reject eleven colors", async () => {
      const colors = Array.from({length: 11}, () => "#3b6ea5");

      expect((await simulate(client, {colors})).isError).toBe(true);
    });

    it("should reject a color with an alpha channel", async () => {
      expect((await simulate(client, {colors: ["#3b6ea580"]})).isError).toBe(true);
    });

  });

});


describe("sentenceNames", () => {

  it("should name a color by its name alone where the name is unique", () => {
    expect(sentenceNames([{hex: "#ff0000", name: "Red"}, {hex: "#00ff00", name: "Green"}]))
      .toEqual(["Red", "Green"]);
  });

  it("should add the hex where two colors share a name", () => {
    expect(sentenceNames([
      {hex: "#1d7fb0", name: "Cerulean"},
      {hex: "#2a7ab8", name: "Cerulean"},
      {hex: "#ff0000", name: "Red"}
    ])).toEqual(["Cerulean (#1d7fb0)", "Cerulean (#2a7ab8)", "Red"]);
  });

});
