import {z} from "zod";
import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {PaletteStyles} from "@engine/palette/palette-style.model";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {paletteFromId} from "@engine/palette/palette-id.helper";
import {colorName} from "@engine/color/color-name.helper";
import {roleCaptionFor} from "@engine/palette/palette-role.helper";
import {base62ToBigInt} from "@engine/helpers/base62.helper";
import {TOOL_ANNOTATION} from "../helper/annotation.helper";


/**
 * What a palette id carries after the style digit: 30 RGB channels and the
 * pinned mask, one byte each.
 */
const PALETTE_ID_LIMIT = 256n ** 31n;

/**
 * The id's shape is the whole guard. `paletteFromId()` restores any string of
 * the right length and alphabet, and answers a leading digit it does not know
 * with a random style rather than an error - a malformed id would decode into
 * an invented palette, and the same id twice into two different ones. Rejected
 * here, nothing reaches the decoder that it cannot restore, so the handler
 * needs no try/catch: keep both checks if the handler stays that way.
 *
 * The length alone does not make the guard: 42 base62 characters reach past
 * `PALETTE_ID_LIMIT`, and the decoder pads a value that is too short but
 * never truncates one that is too long. A value above the limit would be
 * read from a window shifted by a byte, with the pinned mask fallen to 0.
 */
const inputSchema = {
  id: z.string()
    .regex(/^[0-9][0-9A-Za-z]{42}$/,
      {message: "A palette id is 43 characters: one digit for the style, then 42 base62 characters."}
    )
    .refine(id => base62ToBigInt(id.substring(1)) < PALETTE_ID_LIMIT,
      {message: "This palette id is out of range: the 42 characters after the style digit encode more than 31 bytes."}
    )
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
        hex: paletteColor.hex(),
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
