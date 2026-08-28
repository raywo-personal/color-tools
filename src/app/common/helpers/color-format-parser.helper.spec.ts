import {describe, expect, it} from "vitest";
import chroma from "chroma-js";
import {colorFrom, isHex, isHsl, isOklch, isRgb} from "@common/helpers/color-format-parser.helper";
import {maxChroma} from "@common/helpers/oklch.helper";


describe("isHex", () => {

  it("accepts the three hex lengths, with and without a hash", () => {
    expect(isHex("#abc")).toBe(true);
    expect(isHex("#aabbcc")).toBe(true);
    expect(isHex("#aabbccdd")).toBe(true);
    expect(isHex("aabbcc")).toBe(true);
  });


  it("rejects other lengths and non-hex digits", () => {
    expect(isHex("#abcd")).toBe(false);
    expect(isHex("#aabbc")).toBe(false);
    expect(isHex("#gghhii")).toBe(false);
  });

});


describe("isRgb", () => {

  it("accepts comma- and space-separated triples", () => {
    expect(isRgb("rgb(51,102,204)")).toBe(true);
    expect(isRgb("rgb(51, 102, 204)")).toBe(true);
    expect(isRgb("rgb(51 102 204)")).toBe(true);
  });


  it("rejects a channel of more than three digits", () => {
    expect(isRgb("rgb(5100 102 204)")).toBe(false);
  });

});


describe("isHsl", () => {

  it("accepts the forms chroma-js emits and the comma form", () => {
    expect(isHsl("hsl(220deg 60% 50%)")).toBe(true);
    expect(isHsl("hsl(220, 60%, 50%)")).toBe(true);
    expect(isHsl("hsl(220 0.6 0.5)")).toBe(true);
  });

});


describe("isOklch", () => {

  it("accepts what chroma-js emits", () => {
    expect(isOklch("oklch(53.25% 0.17 262.29deg)")).toBe(true);
  });


  it("accepts the CSS forms other tools emit", () => {
    // oklch.com, Tailwind theme files
    expect(isOklch("oklch(53.25% 0.17 262.29)")).toBe(true);
    // the computed value a browser reports
    expect(isOklch("oklch(0.5325 0.17 262.29)")).toBe(true);
    // a number without a leading zero is valid CSS
    expect(isOklch("oklch(.53 .17 262)")).toBe(true);
  });


  it("tolerates surrounding and repeated whitespace", () => {
    expect(isOklch("oklch(  53.25%  0.17  262.29 deg  )")).toBe(true);
  });


  it("rejects the comma form, which OKLch does not have in CSS", () => {
    expect(isOklch("oklch(53.25%, 0.17, 262.29)")).toBe(false);
  });


  it("rejects an alpha channel, as the other formats do", () => {
    expect(isOklch("oklch(53.25% 0.17 262.29 / 0.5)")).toBe(false);
  });


  it("rejects negative components", () => {
    expect(isOklch("oklch(-53.25% 0.17 262.29)")).toBe(false);
    expect(isOklch("oklch(53.25% -0.17 262.29)")).toBe(false);
    expect(isOklch("oklch(53.25% 0.17 -262.29)")).toBe(false);
  });

});


describe("colorFrom", () => {

  it("returns null for an empty or unparsable value", () => {
    expect(colorFrom(null)).toBeNull();
    expect(colorFrom("")).toBeNull();
    expect(colorFrom("rebeccapurple")).toBeNull();
  });


  it("parses hex, rgb and hsl to the same color", () => {
    expect(colorFrom("#3366cc")?.hex()).toBe("#3366cc");
    expect(colorFrom("rgb(51 102 204)")?.hex()).toBe("#3366cc");
    expect(colorFrom("hsl(220deg 60% 50%)")?.hex()).toBe("#3366cc");
  });


  it("rejects an rgb channel outside [0, 255]", () => {
    expect(colorFrom("rgb(256 102 204)")).toBeNull();
  });


  it("round-trips the OKLch string the copy button produces", () => {
    const color = chroma("#3366cc");
    const parsed = colorFrom(color.css("oklch"));

    expect(parsed).not.toBeNull();

    // The copy string carries two decimals per component, so a channel may
    // come back off by one. Anything larger means the string was misread.
    parsed?.rgb().forEach((channel, index) => {
      expect(Math.abs(channel - color.rgb()[index])).toBeLessThanOrEqual(1);
    });
  });


  it("reads percentage and fractional lightness as the same color", () => {
    const percent = colorFrom("oklch(53.25% 0.17 262.29)");
    const fraction = colorFrom("oklch(0.5325 0.17 262.29)");

    expect(percent).not.toBeNull();
    expect(fraction?.hex()).toBe(percent?.hex());
  });


  it("rejects lightness outside [0, 100] %", () => {
    expect(colorFrom("oklch(500% 0.17 262.29)")).toBeNull();
    // a bare number is a fraction, so 53.25 is not 53.25 %
    expect(colorFrom("oklch(53.25 0.17 262.29)")).toBeNull();
  });


  it("rejects a hue outside [0, 360]", () => {
    expect(colorFrom("oklch(53.25% 0.17 900)")).toBeNull();
  });


  it("pulls an out-of-gamut chroma back to the sRGB boundary", () => {
    const parsed = colorFrom("oklch(50% 0.9 145deg)");
    const clamped = chroma.oklch(0.5, maxChroma(0.5, 145), 145);

    expect(parsed?.hex()).toBe(clamped.hex());
    // per-channel clipping would land somewhere else
    expect(parsed?.hex()).not.toBe(chroma.oklch(0.5, 0.9, 145).hex());
  });


  it("keeps black and white parsable, where no chroma fits", () => {
    expect(colorFrom("oklch(0% 0 0)")?.hex()).toBe("#000000");
    expect(colorFrom("oklch(100% 0 0)")?.hex()).toBe("#ffffff");
  });

});
