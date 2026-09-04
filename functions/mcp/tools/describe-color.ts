import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {colorName} from "@common/helpers/color-name.helper";
import chroma from "chroma-js";
import {formatColor} from "@common/helpers/color-format.helper";
import {maxChroma, usableLightness} from "@common/helpers/oklch.helper";
import {opaqueHexColor} from "../helper/tool-schemas.helper";


const inputSchema = {
  color: opaqueHexColor("Color")
};

const outputSchema = {
  name: z.string(),
  hex: z.string(),
  rgb: z.string(),
  hsl: z.string(),
  oklch: z.string(),
  lightness: z.number(),
  chroma: z.number(),
  hue: z.number().nullable(),
  maxChroma: z.number(),
  usableLightness: z.number()
};

const callback: ToolCallback<typeof inputSchema> =
  ({color}) => {
    const clr = chroma(color);
    const name = colorName(clr);
    const hex = formatColor(clr, "hex");
    const oklchElements = clr.oklch();
    const [lightness, chromaValue, rawHue] = oklchElements;
    const hue = Number.isNaN(rawHue) ? null : rawHue;

    const structuredContent = {
      name,
      hex,
      rgb: formatColor(clr, "rgb"),
      hsl: formatColor(clr, "hsl"),
      oklch: formatColor(clr, "oklch"),
      lightness,
      chroma: chromaValue,
      hue,
      maxChroma: maxChroma(lightness, rawHue),
      usableLightness: usableLightness(lightness)
    };

    return {
      content: [
        {
          type: "text",
          text: `${name} (${hex}) has an OKLch lightness of ${(lightness * 100).toFixed(1)} %.`
        }
      ],
      structuredContent
    };
  };

export function registerDescribeColor(server: McpServer): void {
  server.registerTool("describe_color", {
      title: "Describe a color",
      description: "Describe a color in a human readable format",
      inputSchema,
      outputSchema,
      annotations: {readOnlyHint: true, idempotentHint: true, openWorldHint: false}
    },
    callback
  );
}
