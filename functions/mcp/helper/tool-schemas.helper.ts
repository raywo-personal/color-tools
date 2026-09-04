import {isTranslucent, isHex} from "@common/helpers/color-format-parser.helper";
import {FONT_WEIGHTS} from "@contrast/models/apca-lookup-table.model";
import {z} from "zod";
import {PIXEL_FONT_SIZE_PATTERN} from "@common/helpers/font-size.helper";
import chroma from "chroma-js";


/**
 * A hex color the tools can answer for.
 *
 * isHex() also accepts the 8-digit alpha form, but every tool drops the
 * alpha byte: a translucent background has nothing behind it, and a
 * described color would lose the byte without a sign that anything was
 * discarded. So the schema refuses it up front instead of answering
 * silently wrong.
 *
 * @param role - How the tool names the color in its message, e.g. "Text color"
 */
export function opaqueHexColor(role: string) {
  return z.string()
    .refine(
      value => isHex(value) && !isTranslucent(chroma(value)),
      {message: `${role} must be a hex color without an alpha channel.`}
    )
    .describe(`${role} in CSS hex format without alpha channel.`);
}


/** Font size, the input the APCA lookup row depends on. */
export const fontSizeInput = z.string()
  .regex(PIXEL_FONT_SIZE_PATTERN, {message: "Font size must be a pixel value like '16px'."})
  .default("16px")
  .describe("Font size in CSS pixels, for example '16px'. The APCA requirement depends on it.");

/** Font weight, the input the APCA lookup row depends on. */
export const fontWeightInput = z.enum(FONT_WEIGHTS)
  .default("400")
  .describe("CSS font weight, for example '400' for regular or '700' for bold. The APCA requirement depends on it.");
