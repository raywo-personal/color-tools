import {z} from "zod";
import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {PaletteStyles} from "@engine/palette/palette-style.model";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {paletteFromId} from "@engine/palette/palette-id.helper";
import {colorName} from "@engine/color/color-name.helper";
import {roleCaptionFor} from "@engine/palette/palette-role.helper";


const inputSchema = {
  id: z.string()
    .regex(/^[0-9][0-9A-Za-z]{42}$/,
      {message: "A palette id is 43 characters: one digit for the style, then 42 base62 characters."}
    )
};

const paletteOutputSchema = z.object({
  id: z.string()
    .describe("43 characters, decodes back to this palette."),
  name: z.string()
    .describe("The palette's name: style and base color, e.g. \"Triadic – Matisse\"."),
  style: z.enum(PaletteStyles)
    .describe("Palette style. Read the palette-styles resource for what each one does."),
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
});

const outputSchema = {
  ok: z.boolean()
    .describe("Whether the palette id could be restored."),
  error: z.string()
    .nullable()
    .describe("Why the palette could not be restored. Null when ok is true."),
  palette: paletteOutputSchema
    .nullable()
    .describe("The restored palette. Null when ok is false.")
};

const callback: ToolCallback<typeof inputSchema> =
  ({id}) => {
    try {
      const palette = paletteFromId(id);
      const colors = PALETTE_SLOTS.map(slot => {
        const paletteColor = palette[slot].color;

        return {
          slot,
          role: roleCaptionFor(palette.style, slot),
          hex: paletteColor.hex(),
          name: colorName(paletteColor)
        };
      });

      const structuredContent = {
        ok: true,
        error: null,
        palette: {
          id,
          name: palette.name,
          style: palette.style,
          colors
        }
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
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error("Unknown error");

      const structuredContent = {
        ok: false,
        error: error.message,
        palette: null
      };

      return {
        content: [
          {
            type: "text",
            text: "This is not a restorable palette id."
          }
        ],
        structuredContent
      };
    }
  };

export function registerReadPalette(server: McpServer) {
  server.registerTool("read_palette", {
      title: "Read Palette",
      description: "Generates a palette from a given ID identical to the one 'generate_palette' would have generated.",
      inputSchema,
      outputSchema
    },
    callback
  );
}
