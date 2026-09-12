import {z} from "zod";
import {opaqueHexColor} from "../helper/tool-schemas.helper";
import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import chroma from "chroma-js";
import {colorName} from "@engine/color/color-name.helper";
import {createShades, createTints} from "@engine/helpers/tints-and-shades.helper";
import {TOOL_ANNOTATION} from "../helper/annotation.helper";


const ARRAY_LENGTH = 11;

const colorObjectSchema = z.object({
  step: z.number()
    .int()
    .describe("0 is the base color, 10 is white or black."),
  hex: z.string(),
  name: z.string()
});
type ColorObject = z.infer<typeof colorObjectSchema>;

const inputSchema = {
  color: opaqueHexColor(
    "Base color",
    "It is step 0 of both ramps."
  )
};

const outputSchema = {
  baseColor: z.string(),
  baseColorName: z.string(),
  tints: z.array(colorObjectSchema)
    .length(ARRAY_LENGTH)
    .describe("Eleven steps from the base color to white. Step 0 is the base "
      + "color itself, and so is step 0 of the shades: the two ramps hold 21 "
      + "distinct colors, not 22."),
  shades: z.array(colorObjectSchema)
    .length(ARRAY_LENGTH)
    .describe("Eleven steps from the base color to black. Step 0 is the base "
      + "color itself, and so is step 0 of the tints: the two ramps hold 21 "
      + "distinct colors, not 22.")
};

const callback: ToolCallback<typeof inputSchema> =
  ({color}) => {
    const clr = chroma(color);
    const baseColorName = colorName(clr);
    const tints = createTints(clr, true, true, ARRAY_LENGTH)
      .map((color, index): ColorObject => ({
        step: index,
        hex: color.hex(),
        name: colorName(color)
      }));
    const shades = createShades(clr, true, true, ARRAY_LENGTH)
      .map((color, index): ColorObject => ({
        step: index,
        hex: color.hex(),
        name: colorName(color)
      }));

    const structuredContent = {
      baseColor: clr.hex(),
      baseColorName: baseColorName,
      tints,
      shades
    };

    return {
      content: [
        {
          type: "text",
          text: `Eleven tints and eleven shades of ${baseColorName} (${clr.hex()}), each ramp starting at the base color itself.`
        }
      ],
      structuredContent
    };
  };


export function registerTintsAndShades(server: McpServer) {
  server.registerTool("tints_and_shades",
    {
      title: "Tints and shades",
      description: "Two eleven-step ramps from one color: one towards white, "
        + "one towards black. The steps are perceptually even, not a linear "
        + "blend, so they hold up as a 50–950 scale or as a hover state one "
        + "step darker.",
      inputSchema,
      outputSchema,
      annotations: TOOL_ANNOTATION
    },
    callback
  );
}
