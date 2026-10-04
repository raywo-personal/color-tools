import {Color} from "chroma-js";
import {Palette, PALETTE_SLOTS} from "@engine/palette/palette.model";
import {roleCaptionFor} from "@engine/palette/palette-role.helper";


export type ExportFormat = "css" | "scss" | "tailwind" | "json" | "dtcg";


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
    case "scss":
      return scssExport(source);
    case "tailwind":
      return tailwindExport(source);
    case "json":
      return jsonExport(source);
    case "dtcg":
      return dtcgExport(source);
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
  return [":root {", ...declarationLines(source, CSS_SYNTAX), "}"].join("\n");
}


/**
 * The same declarations as Sass variables. They sit at the top level of a
 * partial rather than inside a block, so they carry no indent, and the role
 * travels in a `//` comment: the CSS spelling is a loud comment in Sass, and
 * five of them on top-level variables land in the compiled CSS of whoever
 * pastes the block.
 *
 * **The base is `$palette-base`, not `$base`.** Every format names the same
 * color the same way, so a reader who has seen one finds it again in the
 * others - and `$base` is the kind of name a stylesheet already has, which
 * would make pasting the block silently overwrite it.
 */
export function scssExport(source: ExportSource): string {
  return declarationLines(source, SCSS_SYNTAX).join("\n");
}


/**
 * The same declarations as design tokens for Tailwind v4: a `@theme` block
 * whose `--color-*` variables become utilities, `bg-palette-1` and
 * `text-tint-30` among them. The names are the CSS export's with the
 * namespace in front, so the two formats describe the same thing in the same
 * words. It is v4's own syntax and nothing else - `theme.extend.colors` for a
 * v3 `tailwind.config.js` is a different format, not a variant of this one.
 *
 * **No exported name may be one of Tailwind's font sizes.** Its `text-`
 * utility reads the color namespace as well as the font-size scale, and the
 * color wins: a `--color-base` turns `text-base` into a color utility and
 * drops the built-in font size and line height, silently, everywhere in the
 * project the block is pasted into. That is why the base color is
 * `palette-base` and not `base` - see `TAILWIND_TEXT_SIZES` in the spec.
 */
export function tailwindExport(source: ExportSource): string {
  return ["@theme {", ...declarationLines(source, TAILWIND_SYNTAX), "}"].join("\n");
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


/**
 * The same content as W3C design tokens, the format Figma Variables, Tokens
 * Studio and Style Dictionary import. The groups are the JSON export's - base,
 * palette, tints, shades - and each color is a token with `$type: "color"`.
 * The role rides along as `$description`, which is the spec's field for text a
 * person reads; a comment has nowhere to go in JSON.
 *
 * Inside a group the ramps are named by position and the palette by slot, so a
 * token resolves as `{tints.30}` and `{palette.1}` - the CSS export's names
 * with the group taking the place of the prefix.
 *
 * **`$value` is the object the 2025 spec defines**, `colorSpace` and
 * `components` with `hex` beside them, not the older bare hex string. The
 * components are read off the same 8-bit color the hex carries, so the two
 * halves cannot disagree. A reader that only knows the string form sees an
 * object where it expects text: that is the cost of the choice, and it is
 * paid deliberately rather than by omission, so do not "fix" it by dropping
 * the object - `dtcgExport` is pinned to it in the spec.
 */
export function dtcgExport({base, palette, tints, shades}: ExportSource): string {
  return JSON.stringify({
    base: colorToken(base),
    palette: Object.fromEntries(PALETTE_SLOTS.map((slot, index) =>
      [`${index + 1}`, colorToken(palette[slot].color, roleCaptionFor(palette.style, slot))])),
    tints: rampTokens(tints),
    shades: rampTokens(shades)
  }, null, 2);
}


/** How a format spells one declaration. */
interface DeclarationSyntax {
  /** What every line starts with - a block indents, top-level variables do not. */
  readonly indent: string;
  /** What every name starts with. */
  readonly prefix: string;
  /** How the role beside a palette color is written. */
  readonly comment: (role: string) => string;
}


const cssComment = (role: string) => `/* ${role} */`;

const CSS_SYNTAX: DeclarationSyntax = {indent: "  ", prefix: "--", comment: cssComment};
const TAILWIND_SYNTAX: DeclarationSyntax = {indent: "  ", prefix: "--color-", comment: cssComment};
const SCSS_SYNTAX: DeclarationSyntax = {indent: "", prefix: "$", comment: role => `// ${role}`};


/** One exported color: what it is called, its hex, and what the slot is for. */
interface Declaration {
  readonly name: string;
  readonly value: string;
  /** Only the palette colors have a role; the base and the ramp steps do not. */
  readonly role?: string;
}


/**
 * What every format declares, in the order every format writes it. The three
 * variable formats differ in syntax alone, so the names, the values and the
 * roles are decided here once.
 */
function declarations({base, palette, tints, shades}: ExportSource): Declaration[] {
  return [
    {name: "palette-base", value: hexOf(base)},
    ...PALETTE_SLOTS.map((slot, index) => ({
      name: `palette-${index + 1}`,
      value: hexOf(palette[slot].color),
      role: roleCaptionFor(palette.style, slot)
    })),
    ...rampDeclarations("tint", tints),
    ...rampDeclarations("shade", shades)
  ];
}


function declarationLines(source: ExportSource, syntax: DeclarationSyntax): string[] {
  return declarations(source).map(({name, value, role}) =>
    `${syntax.indent}${syntax.prefix}${name}: ${value};`
    + (role === undefined ? "" : `  ${syntax.comment(role)}`));
}


function rampDeclarations(name: string, colors: Color[]): Declaration[] {
  return colors.map((color, index) => ({
    name: `${name}-${rampStep(index, colors.length)}`,
    value: hexOf(color)
  }));
}


function rampTokens(colors: Color[]): Record<string, ColorToken> {
  return Object.fromEntries(colors.map((color, index) =>
    [`${rampStep(index, colors.length)}`, colorToken(color)]));
}


/** Where the step sits on its ramp, 0 to 100, as both the variables and the tokens name it. */
function rampStep(index: number, count: number): number {
  return Math.round(index / Math.max(count - 1, 1) * 100);
}


/** One DTCG color token. `$description` drops out of the JSON where there is no role. */
interface ColorToken {
  readonly $type: "color";
  readonly $description?: string;
  readonly $value: {
    readonly colorSpace: "srgb";
    readonly components: number[];
    readonly hex: string;
  };
}


function colorToken(color: Color, role?: string): ColorToken {
  return {
    $type: "color",
    $description: role,
    $value: {colorSpace: "srgb", components: componentsOf(color), hex: hexOf(color)}
  };
}


/**
 * The channels as the spec writes them: sRGB in 0 to 1, taken from the same
 * rounded 8-bit color as the hex. Four places resolve every one of the 255
 * steps, and stop a third of the file being trailing digits.
 */
function componentsOf(color: Color): number[] {
  return color.rgb().map(channel => Math.round(channel / 255 * 10000) / 10000);
}


/** Upper case, as every hex on screen and in the toast is written. */
function hexOf(color: Color): string {
  return color.hex("rgb").toUpperCase();
}
