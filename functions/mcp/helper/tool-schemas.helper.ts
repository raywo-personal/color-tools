import {isTranslucent, isHex} from "@engine/color/color-format-parser.helper";
import {FONT_WEIGHTS} from "@engine/contrast/apca-lookup-table.model";
import {BODY_COPY_MIN_LC, TEXT_KINDS, TextKind} from "@engine/contrast/apca-rating.helper";
import {z} from "zod";
import {PIXEL_FONT_SIZE_PATTERN} from "@engine/helpers/font-size.helper";
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

/**
 * Whether the text is a column of body copy, which the APCA table holds to a
 * higher Lc than anything read in passing.
 *
 * `spotText` is the default because it is the table as written, and because it
 * is the answer for most of what a tool is asked about - a button, a label, a
 * heading. An assistant rating a paragraph has to say so, which is what the
 * description is for.
 */
export const textKindInput = z.enum(TEXT_KINDS)
  .default("spotText")
  .describe(`bodyCopy: a column of text read fluently, such as a paragraph or an article - held to at least Lc ${BODY_COPY_MIN_LC}. spotText: text read in passing, such as a heading, a button, a label, a caption, a copyright line or a placeholder - held to the plain requirement for its size and weight.`);


/**
 * How a tool's sentence names the kind of text it rated.
 *
 * The payload carries `textKind`; the sentence has to carry it too. It is the
 * one input that changes the verdict without changing anything else the
 * sentence names, so two calls that differ only in it read as a
 * contradiction about the same colors at the same size and weight.
 *
 * @param textKind - The kind of text the tool was asked about
 */
export function textKindPhrase(textKind: TextKind): string {
  return textKind === "bodyCopy" ? "as body copy" : "as spot text";
}
