import {Color} from "chroma-js";
import {Palette, PALETTE_SLOTS} from "@palettes/models/palette.model";
import {roleCaptionFor} from "@palettes/helper/palette-role.helper";


export type ExportFormat = "css" | "tailwind" | "json";


/** What the export describes: the base color, the palette built on it, and its two ramps. */
export interface ExportSource {
  readonly base: Color;
  readonly palette: Palette;
  readonly tints: Color[];
  readonly shades: Color[];
}


/**
 * Renders the source in the given format, exactly as the export panel shows
 * it and `COPY ALL` copies it.
 */
export function exportAs(format: ExportFormat, source: ExportSource): string {
  switch (format) {
    case "css":
      return cssExport(source);
    case "tailwind":
      return tailwindExport(source);
    case "json":
      return jsonExport(source);
  }
}


/**
 * Custom properties on `:root`: the base, the five palette colors with their
 * role as a comment, and every step of both ramps.
 *
 * The ramp variables carry the step's position rather than its index -
 * `--tint-30`, not `--tint-3` - because that is how the ramps name a step on
 * screen and how a designer talks about one. Step 0 of each ramp is the base
 * color; it stays in so that both ramps have the same eleven entries and
 * `--tint-0` equals `--shade-0`, the way the two rows share their first step.
 */
export function cssExport(source: ExportSource): string {
  return [":root {", ...declarations(source, "--"), "}"].join("\n");
}


/**
 * The same declarations as design tokens for Tailwind v4: a `@theme` block
 * whose `--color-*` variables become utilities, `bg-palette-1` and
 * `text-tint-30` among them. The names are the CSS export's with the
 * namespace in front, so the two formats describe the same thing in the same
 * words. It is v4's own syntax and nothing else - `theme.extend.colors` for a
 * v3 `tailwind.config.js` is a different format, not a variant of this one.
 */
export function tailwindExport(source: ExportSource): string {
  return ["@theme {", ...declarations(source, "--color-"), "}"].join("\n");
}


/** The same content as an object: base, palette as role and hex, tints, shades. */
export function jsonExport({base, palette, tints, shades}: ExportSource): string {
  return JSON.stringify({
    base: hexOf(base),
    palette: PALETTE_SLOTS.map(slot => ({
      role: roleCaptionFor(palette.style, slot),
      hex: hexOf(palette[slot].color)
    })),
    tints: tints.map(hexOf),
    shades: shades.map(hexOf)
  }, null, 2);
}


/** The declarations both CSS formats share; `prefix` is what a name starts with. */
function declarations({base, palette, tints, shades}: ExportSource, prefix: string): string[] {
  return [
    `  ${prefix}base: ${hexOf(base)};`,
    ...PALETTE_SLOTS.map((slot, index) =>
      `  ${prefix}palette-${index + 1}: ${hexOf(palette[slot].color)};  /* ${roleCaptionFor(palette.style, slot)} */`),
    ...rampLines(`${prefix}tint`, tints),
    ...rampLines(`${prefix}shade`, shades)
  ];
}


function rampLines(name: string, colors: Color[]): string[] {
  const last = Math.max(colors.length - 1, 1);

  return colors.map((color, index) =>
    `  ${name}-${Math.round(index / last * 100)}: ${hexOf(color)};`);
}


/** Upper case, as every hex on screen and in the toast is written. */
function hexOf(color: Color): string {
  return color.hex("rgb").toUpperCase();
}
