import {PaletteStylesWithoutRandom} from "@engine/palette/palette-style.model";
import {PALETTE_SLOTS, PaletteColors} from "@engine/palette/palette.model";
import {opaqueHexColor} from "../helper/tool-schemas.helper";
import {z} from "zod";
import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {generatePalette} from "@engine/palette/palette.helper";
import {paletteColorFrom} from "@engine/palette/palette-color.model";
import chroma from "chroma-js";
import {roleCaptionFor} from "@engine/palette/palette-role.helper";
import {colorName} from "@engine/color/color-name.helper";
import {randomBetween} from "@engine/helpers/random.helper";
import {TOOL_ANNOTATION} from "../helper/annotation.helper";


const inputSchema = {
  baseColor: opaqueHexColor("Base color")
    .describe("The color the palette is built on. It becomes color0 and is returned unchanged."),
  style: z.enum(PaletteStylesWithoutRandom)
    .describe("Palette style. Read the palette-styles resource for what each one does."),
  seed: z.number()
    .int()
    .min(0)
    .max(4294967295)
    .optional()
    .describe("Reproduces an earlier palette. Omit to have one drawn and returned.")
};

const outputSchema = {
  id: z.string()
    .describe("43 characters, decodes back to this palette."),
  name: z.string()
    .describe("The palette's name: style and base color, e.g. \"Triadic – Matisse\"."),
  style: z.enum(PaletteStylesWithoutRandom)
    .describe("Palette style. Read the palette-styles resource for what each one does."),
  seed: z.number()
    .int()
    .describe("Pass it back to generate_palette to get this palette again."),
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
  ({baseColor, style, seed}) => {
    const base = chroma(baseColor);
    const effectiveSeed = seed ?? randomBetween(0, 360);
    const color0 = paletteColorFrom(base, "color0");
    const paletteColors: Partial<PaletteColors> = {color0};
    const palette = generatePalette(style, paletteColors, effectiveSeed);
    const colors = PALETTE_SLOTS.map(slot => {
      const paletteColor = palette[slot].color;

      return {
        slot,
        role: roleCaptionFor(style, slot),
        hex: paletteColor.hex(),
        name: colorName(paletteColor)
      };
    });

    const structuredContent = {
      id: palette.id,
      name: palette.name,
      style: palette.style,
      seed: effectiveSeed,
      colors
    };

    return {
      content: [
        {
          type: "text",
          text: `${palette.name} is a five-slot palette built on ${baseColor}; its id reproduces it through read_palette.`
        }
      ],
      structuredContent
    };
  };


export function registerGeneratePalette(server: McpServer) {
  server.registerTool(
    "generate_palette",
    {
      title: "Generate Palette",
      description: "Generates a palette from a given base color, style and seed.",
      inputSchema,
      outputSchema,
      annotations: TOOL_ANNOTATION
    },
    callback
  );
}
