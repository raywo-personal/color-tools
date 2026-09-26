import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import chroma from "chroma-js";
import {beforeEach, describe, expect, it} from "vitest";
import {BODY_COPY_MIN_LC, calculateAPCAContrast, meetsAPCARequirement, TEXT_KINDS} from "@engine/contrast/apca-rating.helper";
import {FONT_SIZES, FONT_WEIGHTS} from "@engine/contrast/apca-lookup-table.model";
import {connectedClient, structured, summary} from "../test-support/connected-client";


interface AdjustColorArgs {
  textColor: string;
  backgroundColor: string;
  adjust?: string;
  fontSize?: string;
  fontWeight?: string;
  textKind?: string;
}

function adjustColor(client: Client, args: AdjustColorArgs) {
  return client.callTool({name: "adjust_color_for_contrast", arguments: {...args}});
}

/** The angle between two hues, in degrees, across the 0/360 seam. */
function hueDistance(a: string, b: string): number {
  return Math.abs(((chroma(a).oklch()[2] - chroma(b).oklch()[2] + 540) % 360) - 180);
}


describe("adjust_color_for_contrast", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectedClient("adjust-color-for-contrast.spec");
  });


  describe("tool listing", () => {

    it("should be listed as a read-only tool with an output schema", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "adjust_color_for_contrast");

      expect(tool).toBeDefined();
      expect(tool!.annotations?.readOnlyHint).toBe(true);
      expect(tool!.outputSchema).toBeDefined();
      expect(tool!.description).toBeTruthy();
    });

    it("should ask for the two colors only", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "adjust_color_for_contrast");

      expect(tool!.inputSchema.required).toEqual(["textColor", "backgroundColor"]);
    });

  });


  describe("a pair a lightness can fix", () => {

    it("should hand back a pair that meets the requirement at the requested row", async () => {
      const result = structured(await adjustColor(client, {textColor: "#000000", backgroundColor: "#3b6ea5"}));

      expect(result["meetsRequirement"]).toBe(true);
      expect(meetsAPCARequirement("#000000", result["color"] as string, "16px", "400", "spotText")).toBe(true);
    });

    it("should move the background unless told otherwise, and hold the text", async () => {
      const result = structured(await adjustColor(client, {textColor: "#000000", backgroundColor: "#3b6ea5"}));

      expect(result["adjusted"]).toBe("background");
      expect(result["originalColor"]).toBe("#3b6ea5");
      expect(result["lc"]).toBe(calculateAPCAContrast("#000000", result["color"] as string));
    });

    it("should move the text and hold the background when asked to", async () => {
      const result = structured(await adjustColor(client, {textColor: "#3b6ea5", backgroundColor: "#ffffff", adjust: "text"}));

      expect(result["adjusted"]).toBe("text");
      expect(result["originalColor"]).toBe("#3b6ea5");
      expect(result["lc"]).toBe(calculateAPCAContrast(result["color"] as string, "#ffffff"));
      expect(meetsAPCARequirement(result["color"] as string, "#ffffff", "16px", "400", "spotText")).toBe(true);
    });

    it("should keep the moved color's hue", async () => {
      const result = structured(await adjustColor(client, {textColor: "#000000", backgroundColor: "#3b6ea5"}));

      expect(hueDistance(result["color"] as string, "#3b6ea5")).toBeLessThan(3);
    });

    it("should sign the move by the direction it went", async () => {
      const result = structured(await adjustColor(client, {textColor: "#000000", backgroundColor: "#3b6ea5"}));
      const moved = chroma(result["color"] as string).oklch()[0] - chroma("#3b6ea5").oklch()[0];

      expect(result["lightnessDelta"] as number).toBeGreaterThan(0);
      expect(result["lightnessDelta"]).toBeCloseTo(moved, 6);
    });

    it("should say which color moved against which, and leave the numbers to the payload", async () => {
      const response = await adjustColor(client, {textColor: "#000000", backgroundColor: "#3b6ea5"});
      const result = structured(response);
      const text = summary(response);

      expect(text).toMatch(/^Against /);
      expect(text).toContain("lightening the background");
      expect(text).toContain(result["originalColorName"] as string);
      expect(text).not.toContain("#");
    });

    it("should name the direction where a short move keeps the color's name", async () => {
      // A small move often lands on the same nearest name, and "from X to X"
      // reads as no move at all. White on these grounds sits close to Lc 75,
      // so body copy at 24px/400 moves some of them a little.
      const grounds = ["#d35400", "#e84393", "#16a085", "#c0392b", "#8e44ad"];
      const kept = [];

      for (const backgroundColor of grounds) {
        const response = await adjustColor(client, {textColor: "#ffffff", backgroundColor, fontSize: "24px", textKind: "bodyCopy"});
        const result = structured(response);

        if (result["lightnessDelta"] === 0 || result["colorName"] !== result["originalColorName"]) continue;

        kept.push(backgroundColor);
        expect(summary(response)).toContain(`to a darker ${result["colorName"]}`);
      }

      // The case has to occur, or it tests nothing.
      expect(kept.length).toBeGreaterThan(0);
    });

  });


  describe("a pair that already passes", () => {

    it("should come back unmoved and say to leave it", async () => {
      const response = await adjustColor(client, {textColor: "#000000", backgroundColor: "#ffffff"});
      const result = structured(response);

      expect(result["color"]).toBe(result["originalColor"]);
      expect(result["lightnessDelta"]).toBe(0);
      expect(result["meetsRequirement"]).toBe(true);
      expect(summary(response)).toMatch(/^Leave it as it is: /);
    });

  });


  describe("a requirement no lightness meets", () => {

    it("should answer with the closest pole, not an error", async () => {
      const response = await adjustColor(client, {textColor: "#808080", backgroundColor: "#3b6ea5"});
      const result = structured(response);

      expect(result["meetsRequirement"]).toBe(false);
      expect(["#000000", "#ffffff"]).toContain(result["color"]);
      expect(summary(response)).toContain("comes closest");
    });

    it("should not name a direction where the closest is the color itself", async () => {
      const response = await adjustColor(client, {textColor: "#777777", backgroundColor: "#ffffff"});
      const result = structured(response);

      expect(result["lightnessDelta"]).toBe(0);
      expect(summary(response)).toContain("left as it is");
    });

  });


  describe("a size and weight at which nothing is readable", () => {

    it("should hand back the pair unmoved, not an error", async () => {
      const result = structured(await adjustColor(client, {textColor: "#ffffff", backgroundColor: "#3b6ea5", fontSize: "12px"}));

      expect(result["requiredLc"]).toBeNull();
      expect(result["meetsRequirement"]).toBe(false);
      expect(result["color"]).toBe("#3b6ea5");
      expect(result["lightnessDelta"]).toBe(0);
    });

    it("should point to a larger size only where no weight is readable at this size", async () => {
      const response = await adjustColor(client, {textColor: "#ffffff", backgroundColor: "#3b6ea5", fontSize: "12px"});

      expect(summary(response)).toMatch(/^No color is readable/);
      expect(summary(response)).toContain("A larger size would.");
    });

    it("should point to a different weight too where one is readable at this size", async () => {
      // At 14px, 800 is as unreadable as 100, while 400 to 700 are not: the
      // weight to name is not necessarily a heavier one.
      const response = await adjustColor(client, {textColor: "#ffffff", backgroundColor: "#3b6ea5", fontSize: "14px", fontWeight: "800"});

      expect(summary(response)).toContain("A larger size or a different weight would.");
    });

  });


  describe("the requirement", () => {

    it("should report the table row the size was snapped to", async () => {
      const result = structured(await adjustColor(client, {textColor: "#000000", backgroundColor: "#3b6ea5", fontSize: "13px"}));

      expect(result["fontSize"]).toBe("14px");
    });

    it("should hold body copy to the floor", async () => {
      const result = structured(await adjustColor(client, {textColor: "#000000", backgroundColor: "#3b6ea5", fontSize: "48px", textKind: "bodyCopy"}));

      expect(result["requiredLc"] as number).toBeGreaterThanOrEqual(BODY_COPY_MIN_LC);
    });

    it("should answer every size and weight without an output error", async () => {
      // Each branch fills the whole schema; a field one of them forgets fails
      // the SDK's validation only for the rows that reach that branch.
      for (const fontSize of FONT_SIZES) {
        for (const fontWeight of FONT_WEIGHTS) {
          for (const textKind of TEXT_KINDS) {
            const response = await adjustColor(client, {textColor: "#ffffff", backgroundColor: "#3b6ea5", fontSize, fontWeight, textKind});

            expect(response.isError, `${fontSize}/${fontWeight}/${textKind}`).toBeFalsy();
          }
        }
      }
    });

  });


  describe("the colors", () => {

    it("should answer the hex values in lower case, as the other tools do", async () => {
      const result = structured(await adjustColor(client, {textColor: "#000000", backgroundColor: "#3B6EA5"}));

      expect(result["originalColor"]).toBe("#3b6ea5");
      expect(result["color"]).toBe((result["color"] as string).toLowerCase());
    });

    it("should reject a color with an alpha channel", async () => {
      const result = await adjustColor(client, {textColor: "#000000", backgroundColor: "#3b6ea580"});

      expect(result.isError).toBe(true);
    });

  });

});
