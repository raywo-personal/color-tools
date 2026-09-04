import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {beforeEach, describe, expect, it} from "vitest";
import {FONT_SIZES, FONT_WEIGHTS} from "@contrast/models/apca-lookup-table.model";
import {connectedClient, structured, summary} from "../test-support/connected-client";


interface CheckContrastArgs {
  textColor: string;
  backgroundColor: string;
  fontSize?: string;
  fontWeight?: string;
}

function checkContrast(client: Client, args: CheckContrastArgs) {
  return client.callTool({name: "check_contrast", arguments: {...args}});
}


describe("check_contrast", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectedClient("check-contrast.spec");
  });


  describe("tool listing", () => {

    it("should be listed as a read-only tool with an output schema", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "check_contrast");

      expect(tool).toBeDefined();
      expect(tool!.annotations?.readOnlyHint).toBe(true);
      expect(tool!.outputSchema).toBeDefined();
      expect(tool!.description).toBeTruthy();
    });

    it("should ask for the two colors only", async () => {
      // Font size and weight carry a default, so an assistant that knows
      // nothing about the type can still get a body-text verdict.
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "check_contrast");

      expect(tool!.inputSchema.required)
        .toEqual(["textColor", "backgroundColor"]);
    });

  });


  describe("the verdict", () => {

    it("should rate black on white as good for body text", async () => {
      // 16px/400 asks for 90 and black on white reaches about 106 - past the
      // requirement, but not past 130% of it. A rating of 3 is unreachable
      // at this size, see apca-rating.helper.spec.ts.
      const result = structured(await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff",
        fontSize: "16px",
        fontWeight: "400"
      }));

      expect(result["requiredLc"]).toBe(90);
      expect(result["rating"]).toBe(2);
      expect(result["meetsRequirement"]).toBe(true);
    });

    it("should keep the sign of the contrast and name the polarity", async () => {
      const darkOnLight = structured(await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff"
      }));
      const lightOnDark = structured(await checkContrast(client, {
        textColor: "#ffffff",
        backgroundColor: "#000000"
      }));

      expect(darkOnLight["lc"] as number).toBeGreaterThan(0);
      expect(darkOnLight["polarity"]).toBe("dark-on-light");
      expect(lightOnDark["lc"] as number).toBeLessThan(0);
      expect(lightOnDark["polarity"]).toBe("light-on-dark");
    });

    it("should call two identical colors dark on light and not readable", async () => {
      // Lc is 0 and there is no polarity to name; dark-on-light is the
      // convention rather than a third word every caller would have to
      // handle. The pair fails at every size, so the verdict says so.
      const result = structured(await checkContrast(client, {
        textColor: "#3366cc",
        backgroundColor: "#3366cc"
      }));

      expect(result["lc"]).toBe(0);
      expect(result["polarity"]).toBe("dark-on-light");
      expect(result["meetsRequirement"]).toBe(false);
      expect(result["rating"]).toBe(0);
    });

    it("should read the pair in the order it was given", async () => {
      // APCA is directional: chroma-js reports a different magnitude
      // depending on which color is the text, so a swapped pair is a
      // different question, not the same one.
      const result = structured(await checkContrast(client, {
        textColor: "#ffffff",
        backgroundColor: "#000000"
      }));
      const swapped = structured(await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff"
      }));

      expect(result["textColorName"]).toBe(swapped["backgroundColorName"]);
      expect(result["lc"]).not.toBe(swapped["lc"]);
    });

    it("should name both colors the way the app does", async () => {
      const result = structured(await checkContrast(client, {
        textColor: "#1e90ff",
        backgroundColor: "#ffffff"
      }));

      expect(result["textColorName"]).toBeTruthy();
      expect(result["backgroundColorName"]).toBeTruthy();
      expect(result["textColorName"]).not.toBe(result["backgroundColorName"]);
    });

    it("should never let the rating and the verdict contradict", async () => {
      // The pair check_contrast would otherwise hand an assistant inside one
      // payload: a rating that says the text reads and a verdict that says
      // it does not.
      const pairs = [
        {textColor: "#000000", backgroundColor: "#ffffff"},
        {textColor: "#767676", backgroundColor: "#ffffff"},
        {textColor: "#aaaaaa", backgroundColor: "#ffffff"},
        {textColor: "#ffffff", backgroundColor: "#000000"},
        {textColor: "#595959", backgroundColor: "#ffffff"}
      ];
      const sizes = ["12px", "14px", "16px", "18px", "24px", "48px"];

      for (const pair of pairs) {
        for (const fontSize of sizes) {
          const result = structured(await checkContrast(client, {...pair, fontSize}));
          const rating = result["rating"] as number;
          const label = `${pair.textColor} on ${pair.backgroundColor} at ${fontSize}`;

          if (result["meetsRequirement"]) {
            expect(rating, label).toBeGreaterThanOrEqual(2);
          } else {
            expect(rating, label).toBeLessThanOrEqual(1);
          }
        }
      }
    });

  });


  describe("font size and weight", () => {

    it("should default to body text", async () => {
      const result = structured(await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff"
      }));

      expect(result["fontSize"]).toBe("16px");
      expect(result["fontWeight"]).toBe("400");
    });

    it("should echo the row it evaluated, not the size it was handed", async () => {
      // Without this a caller cannot tell why 17 and 18 answer alike.
      const result = structured(await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff",
        fontSize: "17px"
      }));

      expect(result["fontSize"]).toBe("18px");
    });

    it("should clamp a size beyond the table to its largest row", async () => {
      const result = structured(await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff",
        fontSize: "400px"
      }));

      expect(result["fontSize"]).toBe("96px");
    });

    it("should report no requirement where no text is readable", async () => {
      // Not a missing value and not an error: at 12px the table has no
      // requirement, so no pair of colors can satisfy it.
      const result = structured(await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff",
        fontSize: "12px"
      }));

      expect(result["requiredLc"]).toBeNull();
      expect(result["meetsRequirement"]).toBe(false);
      expect(result["rating"]).toBe(0);
    });

    it("should report no requirement for a weight the table leaves out", async () => {
      const result = structured(await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff",
        fontSize: "16px",
        fontWeight: "100"
      }));

      expect(result["requiredLc"]).toBeNull();
      expect(result["rating"]).toBe(0);
    });

    it("should answer every size and weight of the table", async () => {
      // The lookup is keyed by strings while the tool takes pixels; a row or
      // a weight the snapping misses comes back as undefined and fails the
      // output validation rather than the call.
      for (const fontSize of FONT_SIZES) {
        for (const fontWeight of FONT_WEIGHTS) {
          const result = await checkContrast(client, {
            textColor: "#000000",
            backgroundColor: "#ffffff",
            fontSize,
            fontWeight
          });

          expect(result.isError, `${fontSize}/${fontWeight}`).toBeFalsy();
        }
      }
    });

  });


  describe("the text summary", () => {

    it("should carry the verdict in words, not the rating as a number", async () => {
      // The sentence is what an assistant quotes; the numbers are in
      // structuredContent and are not repeated here.
      const result = await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff"
      });
      const text = summary(result);
      const payload = structured(result);

      expect(text).toContain(payload["ratingLabel"]);
      expect(text).not.toContain(String(payload["lc"]));
      expect(text).not.toContain(String(payload["requiredLc"]));
    });

    it("should name the size and weight that were evaluated", async () => {
      // They qualify the verdict, so a quoted sentence has to agree with the
      // payload about which row it is talking about.
      const result = await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff",
        fontSize: "17px",
        fontWeight: "700"
      });
      const payload = structured(result);

      expect(summary(result)).toContain(payload["fontSize"] as string);
      expect(summary(result)).toContain(payload["fontWeight"] as string);
    });

  });


  describe("invalid input", () => {

    it("should reject a text color that is not a hex color", async () => {
      const result = await checkContrast(client, {
        textColor: "dodgerblue",
        backgroundColor: "#ffffff"
      });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

    it("should reject a background color that is not a hex color", async () => {
      const result = await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "white"
      });

      expect(result.isError).toBe(true);
    });

    it("should reject an 8-digit hex with an alpha byte", async () => {
      // A translucent background has nothing behind it, so the verdict would
      // describe a color that is never rendered.
      const result = await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff80"
      });

      expect(result.isError).toBe(true);
    });

    it("should reject a font weight outside the table", async () => {
      const result = await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff",
        fontWeight: "450"
      });

      expect(result.isError).toBe(true);
    });

    it("should reject a font size that is not a pixel value", async () => {
      const result = await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff",
        fontSize: "1rem"
      });

      expect(result.isError).toBe(true);
    });

    it("should accept a three-digit hex, the way the app does", async () => {
      const short = structured(await checkContrast(client, {
        textColor: "#000",
        backgroundColor: "#fff"
      }));
      const long = structured(await checkContrast(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff"
      }));

      expect(short).toEqual(long);
    });

  });

});
