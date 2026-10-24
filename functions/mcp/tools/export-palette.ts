import {z} from "zod";
import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {paletteFromId} from "@engine/palette/palette-id.helper";
import {ExportFormat, exportAs} from "@engine/palette/palette-export.helper";
import {createShades, createTints} from "@engine/helpers/tints-and-shades.helper";
import {TOOL_ANNOTATION} from "../helper/annotation.helper";
import {paletteIdInput} from "../helper/tool-schemas.helper";


/**
 * Every format the export panel offers, with how the sentence names it and
 * what the schema tells the caller about it. A record rather than a list, so
 * a format added to `ExportFormat` does not compile until the tool offers it
 * too.
 */
const FORMATS: Record<ExportFormat, {label: string; description: string}> = {
  css: {label: "CSS", description: "custom properties on :root"},
  scss: {label: "SCSS", description: "Sass variables"},
  tailwind: {label: "Tailwind v4", description: "a Tailwind v4 @theme block"},
  json: {label: "JSON", description: "a plain object"},
  dtcg: {
    label: "DTCG",
    description: "W3C design tokens for Figma Variables, Tokens Studio and Style Dictionary"
  }
};

const EXPORT_FORMATS = Object.keys(FORMATS) as [ExportFormat, ...ExportFormat[]];

const formatInput = z.enum(EXPORT_FORMATS);

const inputSchema = {
  id: paletteIdInput
    .describe("The palette id from generate_palette or read_palette."),
  format: formatInput
    .describe(EXPORT_FORMATS
      .map(format => `${format}: ${FORMATS[format].description}.`)
      .join(" "))
};

const outputSchema = {
  format: formatInput,
  paletteName: z.string()
    .describe("The palette's name: style and base color, e.g. \"Triadic – Matisse\"."),
  code: z.string()
    .describe("The code the export panel copies for this palette: the base "
      + "color, the five palette colors with their roles, eleven tints and "
      + "eleven shades.")
};


/**
 * The ramps take the engine's defaults, Bezier and lightness correction on,
 * as `tints_and_shades` does. The panel's two switches are app state; a tool
 * that took them as inputs would need the caller to know what the panel is
 * set to.
 *
 * The base is the palette's first slot: a palette is built on the current
 * color and keeps it as `color0`, which is what the panel exports as the base.
 */
const callback: ToolCallback<typeof inputSchema> =
  ({id, format}) => {
    const palette = paletteFromId(id);
    const base = palette.color0.color;
    const code = exportAs(format, {
      base,
      palette,
      tints: createTints(base),
      shades: createShades(base)
    });

    const structuredContent = {
      format,
      paletteName: palette.name,
      code
    };

    return {
      content: [
        {
          type: "text",
          text: `The ${FORMATS[format].label} export of ${palette.name}, as the export panel copies it.`
        }
      ],
      structuredContent
    };
  };


export function registerExportPalette(server: McpServer) {
  server.registerTool(
    "export_palette",
    {
      title: "Export Palette",
      description: "Renders a palette as code – CSS custom properties, SCSS "
        + "variables, a Tailwind v4 theme, JSON or W3C design tokens – exactly "
        + "as the app's export panel copies it, with its names: base color, "
        + "the five palette colors with their roles, and both ramps. Use it "
        + "instead of writing the variables yourself.",
      inputSchema,
      outputSchema,
      annotations: TOOL_ANNOTATION
    },
    callback
  );
}
