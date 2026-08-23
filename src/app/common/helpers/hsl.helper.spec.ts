import {describe, expect, it} from "vitest";
import {clamp01, clampHue, hueWrap} from "@common/helpers/hsl.helper";


describe("clamp01", () => {

  it("passes a fraction through untouched", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(0.99)).toBe(0.99);
    expect(clamp01(1)).toBe(1);
  });


  it("caps an overshoot at 1", () => {
    expect(clamp01(1.0005)).toBe(1);
    expect(clamp01(1.05)).toBe(1);
    expect(clamp01(42)).toBe(1);
  });


  it("caps an undershoot at 0", () => {
    expect(clamp01(-0.01)).toBe(0);
    expect(clamp01(-3)).toBe(0);
  });

});


describe("clampHue", () => {

  it("wraps a hue into [0, 360)", () => {
    expect(clampHue(0)).toBe(0);
    expect(clampHue(180)).toBe(180);
    expect(clampHue(400)).toBe(40);
    expect(clampHue(-30)).toBe(330);
  });

});


describe("hueWrap", () => {

  it("maps a full turn back to zero", () => {
    expect(hueWrap(360)).toBe(0);
    expect(hueWrap(720)).toBe(0);
  });


  it("leaves an in-range hue alone", () => {
    expect(hueWrap(359)).toBe(359);
    expect(hueWrap(38.66)).toBeCloseTo(38.66, 10);
  });

});
