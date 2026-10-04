import {z} from "zod";
import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {PaletteStyles} from "@engine/palette/palette-style.model";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {isRestorablePaletteId, paletteFromId, styleIndexFromPaletteId} from "@engine/palette/palette-id.helper";
import {colorName} from "@engine/color/color-name.helper";
import {roleCaptionFor} from "@engine/palette/palette-role.helper";
import {TOOL_ANNOTATION} from "../helper/annotation.helper";
import {formatColor} from "@engine/color/color-format.helper";


/**
 * The id's shape is the whole guard. `paletteFromId()` throws on an id it
 * cannot read, and answers a style index it does not know with a random style
 * rather than an error - that id would decode into an invented palette, and
 * the same id twice into two different ones. Rejected here, nothing reaches
 * the decoder that it cannot restore, so the handler needs no try/catch: keep
 * all three checks if the handler stays that way.
 *
 * The style index is one base62 character like the rest of the id, so the
 * alphabet alone says nothing about it: what makes it a guard is the index
 * naming a style this version holds.
 *
 * The length alone does not make the guard either: 42 base62 characters reach
 * past the 31 bytes the colors and the pinned mask fill, and
 * `isRestorablePaletteId()` is the check the decoder itself applies. Asked
 * here, an id out of range is answered with the sentence that says so rather
 * than with the decoder's error.
 *
 * The shape check aborts: zod runs the refinements even after a check failed,
 * and both of them read an id of this length - `styleIndexFromPaletteId()`
 * throws on any other, which would answer a mistyped id with the decoder's
 * own wording instead of the sentence that says what an id looks like.
 */
const inputSchema = {
  id: z.string()
    .regex(/^[0-9A-Za-z]{43}$/,
      {
        abort: true,
        message: "A palette id is 43 base62 characters: one for the style, then 42 for the colors."
      }
    )
    .refine(id => styleIndexFromPaletteId(id) < PaletteStyles.length,
      {message: "This palette id names a style that does not exist."}
    )
    .refine(id => isRestorablePaletteId(id),
      {message: "This palette id is out of range: the 42 characters after the style character encode more than 31 bytes."}
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
