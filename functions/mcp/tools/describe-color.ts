import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {isHex} from "@common/helpers/color-format-parser.helper";
import {z} from "zod";
import {colorName} from "@common/helpers/color-name.helper";
import chroma from "chroma-js";
import {formatColor} from "@common/helpers/color-format.helper";
import {maxChroma, usableLightness} from "@common/helpers/oklch.helper";


function hasAlpha(this: void, value: string): boolean {
  const hex = value.startsWith("#") ? value.slice(1) : value;

  return hex.length === 8;
}


export function registerDescribeColor(server: McpServer): void {
  server.registerTool("describe_color", {
      title: "Describe a color",
      description: "Describe a color in a human readable format",
      inputSchema: {
        // isHex() also accepts the 8-digit alpha form, but every output field
        // below drops the alpha byte (formatColor() writes hex(), rgb(), hsl()
        // and oklch() without it) - so an alpha hex would be described as an
        // opaque color with no sign that anything was discarded. Reject it
        // here instead of answering silently wrong.
        color: z.string().refine(
          value => isHex(value) && !hasAlpha(value),
          {message: "Invalid hex color. Alpha (8-digit hex) is not supported: describe_color reports opaque colors only."}
        )
      },
      outputSchema: {
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
      },
      annotations: {readOnlyHint: true, idempotentHint: true, openWorldHint: false}
    },
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
    }
  );
}
