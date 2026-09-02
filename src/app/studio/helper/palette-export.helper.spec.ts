import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {generatePaletteFrom} from "@palettes/helper/palette.helper";
import {roleCaptionFor} from "@palettes/helper/palette-role.helper";
import {PALETTE_SLOTS} from "@palettes/models/palette.model";
import {createShades, createTints} from "@common/helpers/tints-and-shades.helper";
import {cssExport, exportAs, ExportSource, jsonExport, tailwindExport} from "@studio/helper/palette-export.helper";


describe("palette export", () => {

  const base = chroma("#3366CC");
  const palette = generatePaletteFrom(base, "triadic", 42);
  const source: ExportSource = {
    base,
    palette,
    tints: createTints(base),
    shades: createShades(base)
  };

  const hex = (color: chroma.Color) => color.hex("rgb").toUpperCase();

  // Tailwind's `text-` utility reads the color namespace as well as the
  // font-size scale, and the color wins. A `--color-<size>` therefore
  // replaces the built-in `text-<size>` wherever the block is pasted.
  const TAILWIND_TEXT_SIZES = [
    "xs", "sm", "base", "lg", "xl",
    "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl"
  ];


  describe("as CSS", () => {

    const lines = cssExport(source).split("\n");


    it("wraps everything in a :root block", () => {
      expect(lines[0]).toBe(":root {");
      expect(lines[lines.length - 1]).toBe("}");
    });


    it("starts with the base color", () => {
      expect(lines[1]).toBe("  --palette-base: #3366CC;");
    });


    it("lists the five palette colors with their role as a comment", () => {
      expect(lines.slice(2, 7)).toEqual(PALETTE_SLOTS.map((slot, index) =>
        `  --palette-${index + 1}: ${hex(palette[slot].color)};  /* ${roleCaptionFor("triadic", slot)} */`));
    });


    it("names each ramp step by its position, the base first", () => {
      const tints = lines.filter(line => line.includes("--tint-"));
      const shades = lines.filter(line => line.includes("--shade-"));
      const positions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      expect(tints).toEqual(positions.map((position, index) =>
        `  --tint-${position}: ${hex(source.tints[index])};`));
      expect(shades).toEqual(positions.map((position, index) =>
        `  --shade-${position}: ${hex(source.shades[index])};`));
      expect(tints[0]).toBe("  --tint-0: #3366CC;");
      expect(shades[0]).toBe("  --shade-0: #3366CC;");
    });


    it("holds nothing else", () => {
      // 1 base + 5 palette + 11 tints + 11 shades, between the braces.
      expect(lines).toHaveLength(2 + 1 + 5 + 11 + 11);
    });

  });


  describe("as Tailwind tokens", () => {

    const css = cssExport(source).split("\n");
    const tailwind = tailwindExport(source).split("\n");


    it("wraps everything in a @theme block", () => {
      expect(tailwind[0]).toBe("@theme {");
      expect(tailwind[tailwind.length - 1]).toBe("}");
    });


    it("puts the color namespace in front of every CSS name and changes nothing else", () => {
      // The two formats describe the same thing in the same words: a reader
      // who has seen the CSS finds every name again as a utility.
      expect(tailwind.slice(1, -1))
        .toEqual(css.slice(1, -1).map(line => line.replace("  --", "  --color-")));
      expect(tailwind[1]).toBe("  --color-palette-base: #3366CC;");
      expect(tailwind).toContain(`  --color-tint-30: ${hex(source.tints[3])};`);
    });


    it("names nothing after one of Tailwind's own font sizes", () => {
      // `--color-base` would turn `text-base` into a color utility and drop
      // the font size and line height it carries in every project the block
      // is pasted into - without a warning anywhere.
      const names = tailwindExport(source).split("\n")
        .map(line => /^ {2}--color-([a-z0-9-]+):/.exec(line)?.[1])
        .filter(name => name !== undefined);

      expect(names.length).toBeGreaterThan(0);
      expect(names.filter(name => TAILWIND_TEXT_SIZES.includes(name))).toEqual([]);
    });


    it("keeps the role beside each palette color", () => {
      expect(tailwind.filter(line => /--color-palette-\d/.test(line)).map(line => line.split("/*")[1]?.trim()))
        .toEqual(PALETTE_SLOTS.map(slot => `${roleCaptionFor("triadic", slot)} */`));
    });

  });


  describe("as JSON", () => {

    const parsed = JSON.parse(jsonExport(source)) as Record<string, unknown>;


    it("carries base, palette, tints and shades", () => {
      expect(Object.keys(parsed)).toEqual(["base", "palette", "tints", "shades"]);
      expect(parsed["base"]).toBe("#3366CC");
    });


    it("writes the palette as role and hex, in slot order", () => {
      expect(parsed["palette"]).toEqual(PALETTE_SLOTS.map(slot => ({
        role: roleCaptionFor("triadic", slot),
        hex: hex(palette[slot].color)
      })));
    });


    it("writes both ramps as eleven hex strings, the base first", () => {
      expect(parsed["tints"]).toEqual(source.tints.map(hex));
      expect(parsed["shades"]).toEqual(source.shades.map(hex));
      expect((parsed["tints"] as string[])[0]).toBe("#3366CC");
    });


    it("is indented, because the block is read on screen before it is pasted", () => {
      expect(jsonExport(source)).toContain("\n  \"base\": ");
    });

  });


  it("picks the renderer by format", () => {
    expect(exportAs("css", source)).toBe(cssExport(source));
    expect(exportAs("tailwind", source)).toBe(tailwindExport(source));
    expect(exportAs("json", source)).toBe(jsonExport(source));
  });


  it("writes every hex in upper case, as the screen does", () => {
    const hexes = (cssExport(source) + tailwindExport(source) + jsonExport(source))
      .match(/#[0-9a-fA-F]{6}/g) ?? [];

    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.filter(candidate => candidate !== candidate.toUpperCase())).toEqual([]);
  });

});
