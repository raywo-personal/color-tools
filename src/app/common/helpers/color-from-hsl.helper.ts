import chroma, {Color} from "chroma-js";
import {HSL} from "@palettes/models/hsl.model";
import {clamp01, hueWrap} from "./hsl.helper";


export function fromHsl(hsl: HSL): Color {
  return chroma.hsl(hueWrap(hsl.h), clamp01(hsl.s), clamp01(hsl.l));
}
