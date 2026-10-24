import {z} from "zod";
import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {PaletteStyles} from "@engine/palette/palette-style.model";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {paletteFromId} from "@engine/palette/palette-id.helper";
import {colorName} from "@engine/color/color-name.helper";
import {roleCaptionFor} from "@engine/palette/palette-role.helper";
import {TOOL_ANNOTATION} from "../helper/annotation.helper";
import {paletteIdInput} from "../helper/tool-schemas.helper";
import {formatColor} from "@engine/color/color-format.helper";


const inputSchema = {
  id: paletteIdInput
};

const outputSchema = {
  id: z.string()
    .describe("43 characters, decodes back to this palette."),
  name: z.string()
    .describe("The palette's name: style and base color, e.g. \"Triadic – Matisse\"."),
  style: z.enum(PaletteStyles)
    .describe("Palette style. Read the palette-styles resource for what each one does. A palette rolled in the app carries the style \"random\", which the resource does not list and generate_palette does not offer."),
  colors: z.array(z.object({
    slot: z.enum(PALETTE_SLOTS)
      .describe("color0 … color4"),
    role: z.string()
      .describe("What the slot is for in this style, e.g. \"Accent\" or \"Background\"."),
    hex: z.string(),
    name: z.string()
      .describe("This color's own name.")
  }))
    .length(5)
};


const callback: ToolCallback<typeof inputSchema> =
  ({id}) => {
    const palette = paletteFromId(id);
    const colors = PALETTE_SLOTS.map(slot => {
      const paletteColor = palette[slot].color;

      return {
        slot,
        role: roleCaptionFor(palette.style, slot),
        hex: formatColor(paletteColor, "hex", false),
        name: colorName(paletteColor)
      };
    });

    const structuredContent = {
      id,
      name: palette.name,
      style: palette.style,
      colors
    };

    return {
      content: [
        {
          type: "text",
          text: `${palette.name} is a five-slot palette restored from its id.`
        }
      ],
      structuredContent
    };
  };


export function registerReadPalette(server: McpServer) {
  server.registerTool(
    "read_palette",
    {
      title: "Read Palette",
      description: "Generates a palette from a given ID identical to the one 'generate_palette' would have generated.",
      inputSchema,
      outputSchema,
      annotations: TOOL_ANNOTATION
    },
    callback
  );
}
