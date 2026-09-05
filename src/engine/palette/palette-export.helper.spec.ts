import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {generatePaletteFrom} from "@engine/palette/palette.helper";
import {roleCaptionFor} from "@engine/palette/palette-role.helper";
import {PALETTE_SLOTS} from "@engine/palette/palette.model";
import {createShades, createTints} from "@engine/helpers/tints-and-shades.helper";
import {
  cssExport,
  dtcgExport,
  exportAs,
  ExportSource,
  jsonExport,
  scssExport,
  tailwindExport
} from "@engine/palette/palette-export.helper";


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


  describe("as SCSS", () => {

    const css = cssExport(source).split("\n");
    const scss = scssExport(source).split("\n");


    it("declares at the top level, without a wrapping block", () => {
      expect(scss[0]).toBe("$palette-base: #3366CC;");
      expect(scss.filter(line => line.startsWith(" "))).toEqual([]);
      expect(scss.filter(line => line.includes("{") || line.includes("}"))).toEqual([]);
    });


    it("lists the five palette colors with their role in a silent comment", () => {
      // The CSS spelling is a loud comment in Sass and would show up in the
      // compiled output of whoever pastes the block.
      expect(scss.slice(1, 6)).toEqual(PALETTE_SLOTS.map((slot, index) =>
        `$palette-${index + 1}: ${hex(palette[slot].color)};  // ${roleCaptionFor("triadic", slot)}`));
      expect(scssExport(source)).not.toContain("/*");
    });


    it("names each ramp step by its position, the base first", () => {
      const positions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      expect(scss.filter(line => line.startsWith("$tint-"))).toEqual(positions.map((position, index) =>
        `$tint-${position}: ${hex(source.tints[index])};`));
      expect(scss.filter(line => line.startsWith("$shade-"))).toEqual(positions.map((position, index) =>
        `$shade-${position}: ${hex(source.shades[index])};`));
    });


    it("declares the same colors under the same names as the CSS export", () => {
      // A reader who has seen one format finds every name again in the other.
      expect(scss).toEqual(css.slice(1, -1).map(line => line
        .replace(/^ {2}--/, () => "$")
        .replace(/\/\* (.+) \*\//, "// $1")));
    });


    it("keeps the base out of a name a stylesheet already has", () => {
      // `$base` is the kind of variable a partial defines itself, and pasting
      // the block would overwrite it without a word.
      expect(scss).not.toContain("$base: #3366CC;");
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


  describe("as DTCG design tokens", () => {

    interface ParsedToken {
      readonly $type: string;
      readonly $description?: string;
      readonly $value: {
        readonly colorSpace: string;
        readonly components: number[];
        readonly hex: string;
      };
    }

    const parsed = JSON.parse(dtcgExport(source)) as Record<string, unknown>;
    const baseToken = parsed["base"] as ParsedToken;
    const group = (name: string) => parsed[name] as Record<string, ParsedToken>;
    const every = [
      baseToken,
      ...Object.values(group("palette")),
      ...Object.values(group("tints")),
      ...Object.values(group("shades"))
    ];


    it("carries the JSON export's groups, in the same order", () => {
      expect(Object.keys(parsed)).toEqual(["base", "palette", "tints", "shades"]);
    });


    it("types every color as a color token", () => {
      expect(every).toHaveLength(1 + 5 + 11 + 11);
      expect(every.filter(token => token.$type !== "color")).toEqual([]);
    });


    it("writes $value as the object the 2025 spec defines, not as a hex string", () => {
      // The choice is deliberate: a reader that only knows the older string
      // form sees an object here. Dropping the object is a decision, not a fix.
      expect(baseToken.$value).toEqual({
        colorSpace: "srgb",
        components: [0.2, 0.4, 0.8],
        hex: "#3366CC"
      });
    });


    it("reads the components off the same 8-bit color as the hex", () => {
      // The two halves of $value cannot disagree, whatever a reader picks.
      for (const {$value} of every) {
        expect($value.components.map(channel => Math.round(channel * 255)))
          .toEqual(chroma($value.hex).rgb());
      }
    });


    it("keys the palette by slot and carries the role as $description", () => {
      expect(Object.keys(group("palette"))).toEqual(["1", "2", "3", "4", "5"]);
      expect(Object.values(group("palette")).map(token => token.$description))
        .toEqual(PALETTE_SLOTS.map(slot => roleCaptionFor("triadic", slot)));
      expect(Object.values(group("palette")).map(token => token.$value.hex))
        .toEqual(PALETTE_SLOTS.map(slot => hex(palette[slot].color)));
    });


    it("keys both ramps by position, the base first", () => {
      const positions = ["0", "10", "20", "30", "40", "50", "60", "70", "80", "90", "100"];

      expect(Object.keys(group("tints"))).toEqual(positions);
      expect(Object.keys(group("shades"))).toEqual(positions);
      expect(Object.values(group("tints")).map(token => token.$value.hex))
        .toEqual(source.tints.map(hex));
      expect(Object.values(group("shades")).map(token => token.$value.hex))
        .toEqual(source.shades.map(hex));
    });


    it("leaves $description out where there is no role", () => {
      // Only the palette colors have one; a null description is not a
      // description, and the spec has no use for an empty one.
      expect(dtcgExport(source).match(/\$description/g)).toHaveLength(5);
      expect(baseToken.$description).toBeUndefined();
    });


    it("is indented, because the block is read on screen before it is pasted", () => {
      expect(dtcgExport(source)).toContain("\n  \"base\": {");
    });

  });


  it("picks the renderer by format", () => {
    expect(exportAs("css", source)).toBe(cssExport(source));
    expect(exportAs("scss", source)).toBe(scssExport(source));
    expect(exportAs("tailwind", source)).toBe(tailwindExport(source));
    expect(exportAs("json", source)).toBe(jsonExport(source));
    expect(exportAs("dtcg", source)).toBe(dtcgExport(source));
  });


  it("writes every hex in upper case, as the screen does", () => {
    const hexes = [cssExport, scssExport, tailwindExport, jsonExport, dtcgExport]
      .map(render => render(source)).join("")
      .match(/#[0-9a-fA-F]{6}/g) ?? [];

    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes.filter(candidate => candidate !== candidate.toUpperCase())).toEqual([]);
  });

});
