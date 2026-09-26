import {z} from "zod";
import {adjustPhrase, fontSizeInput, fontWeightInput, opaqueHexColor, textKindInput, textKindPhrase} from "../helper/tool-schemas.helper";
import {APCA_POLARITIES, calculateAPCAContrast, getAPCAPolarity, getRequiredLc, TextKind} from "@engine/contrast/apca-rating.helper";
import {FONT_SIZES, FONT_WEIGHTS, FontSize, FontWeight} from "@engine/contrast/apca-lookup-table.model";
import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {TOOL_ANNOTATION} from "../helper/annotation.helper";
import {ADJUSTABLE_COLORS, AdjustableColor, adjustColorForContrast} from "@engine/contrast/contrast-adjustment.helper";
import {fontSizeKeyFrom} from "@engine/helpers/font-size.helper";
import {formatColor} from "@engine/color/color-format.helper";
import {toColor} from "@engine/color/color.helper";
import {colorName} from "@engine/color/color-name.helper";
import {Color} from "chroma-js";


const inputSchema = {
  textColor: opaqueHexColor("Text color"),
  backgroundColor: opaqueHexColor("Background color"),
  adjust: z.enum(ADJUSTABLE_COLORS)
    .default("background")
    .describe("Which of the two colors may move. The other one is held exactly."),
  fontSize: fontSizeInput,
  fontWeight: fontWeightInput,
  textKind: textKindInput
};

const outputSchema = {
  adjusted: z.enum(ADJUSTABLE_COLORS)
    .describe("Which of the two colors was moved. The other one was held exactly."),  // which one moved
  color: z.string()
    .describe("The shifted colour, hex, ready to paste."),                // the shifted colour, hex, ready to paste
  colorName: z.string()
    .describe("The name of the shifted color."),
  originalColor: z.string()
    .describe("The original color, hex."),
  originalColorName: z.string()
    .describe("The name of the original color."),
  lightnessDelta: z.number()
    .describe("Signed OKLch lightness move on a 0 to 1 scale: positive is lighter, negative darker. 0 where the pair already passed or nothing was changed, because the requirement couldn’t be met."),
  chroma: z.number()
    .describe("OKLch chroma of the result. Lower than originalChroma where sRGB cannot carry the original saturation at the new lightness – the color then looks duller."),
  originalChroma: z.number()
    .describe("OKLch chroma of the original color."),
  lc: z.number()
    .describe("APCA Lc of the resulting pair. Positive where the text is darker than the background, negative where it is lighter."),
  polarity: z.enum(APCA_POLARITIES)
    .describe("dark-on-light where the text is darker than the background, light-on-dark where it is lighter. It can differ from the original pair where the smaller move crossed the lightness of the color held."),
  requiredLc: z.number()
    .nullable()
    .describe("The Lc this font size and weight asks for. Null where no contrast makes text of this size and weight readable."),
  meetsRequirement: z.boolean()
    .describe("Whether the resulting pair reaches requiredLc. False means color is the closest attempt, not a fix; where requiredLc is null, color is the input, unmoved, since no color is readable at this size and weight."),
  fontSize: z.enum(FONT_SIZES),
  fontWeight: z.enum(FONT_WEIGHTS)
};

type Output = z.infer<z.ZodObject<typeof outputSchema>>;


function handleImpossibleLc(adjust: AdjustableColor,
                            textClr: Color,
                            bgClr: Color,
                            fontSizeKey: FontSize,
                            fontWeight: FontWeight,
                            textKind: TextKind): {
  structuredContent: Output,
  text: string
} {
  const adjustedColor = adjust === "text" ? textClr : bgClr;
  const color = formatColor(adjustedColor, "hex", false);
  const clrName = colorName(adjustedColor);
  const clrChroma = adjustedColor.oklch()[1];
  const lc = calculateAPCAContrast(textClr, bgClr);

  const structuredContent: Output = {
    adjusted: adjust,
    color,
    colorName: clrName,
    originalColor: color,
    originalColorName: clrName,
    lightnessDelta: 0,
    chroma: clrChroma,
    originalChroma: clrChroma,
    lc,
    polarity: getAPCAPolarity(lc),
    requiredLc: null,
    meetsRequirement: false,
    fontSize: fontSizeKey,
    fontWeight
  };

  const differentWeight =
    FONT_WEIGHTS.some(weight =>
      getRequiredLc(fontSizeKey, weight, textKind) !== null)
      ? " or a different weight" : "";
  const text = `No color is readable at ${fontSizeKey}, weight ${fontWeight}, ${textKindPhrase(textKind)} – moving ${clrName} would not change that. A larger size${differentWeight} would.`;

  return {structuredContent, text};
}


/**
 * How the sentence names the moved color.
 *
 * A small move often keeps the nearest name, and "from Sail On to Sail On"
 * reads as no move at all, so a shared name carries the direction instead.
 *
 * @param originalName - The name of the color before the move
 * @param newName - The name of the color after the move
 * @param lightnessDelta - The signed OKLch lightness move
 */
function movedColorName(originalName: string,
                        newName: string,
                        lightnessDelta: number): string {
  if (lightnessDelta === 0 || newName !== originalName) return newName;

  return `a ${lightnessDelta > 0 ? "lighter" : "darker"} ${newName}`;
}


const callback: ToolCallback<typeof inputSchema> =
  ({textColor, backgroundColor, adjust, fontSize, fontWeight, textKind}) => {
    const textClr = toColor(textColor);
    const bgClr = toColor(backgroundColor);
    const fontSizeKey = fontSizeKeyFrom(fontSize);
    const requiredLc = getRequiredLc(fontSizeKey, fontWeight, textKind);

    if (requiredLc === null) {
      const {structuredContent, text} =
        handleImpossibleLc(adjust, textClr, bgClr, fontSizeKey, fontWeight, textKind);

      return {
        content: [
          {
            type: "text",
            text
          }
        ],
        structuredContent
      };
    }

    const result = adjustColorForContrast(textClr, bgClr, adjust, requiredLc);
    const adjustedColor = adjust === "text" ? textClr : bgClr;
    const heldColor = adjust === "text" ? bgClr : textClr;
    const color = result.color;

    const structuredContent: Output = {
      adjusted: adjust,
      color: formatColor(color, "hex", false),
      colorName: colorName(color),
      originalColor: formatColor(adjustedColor, "hex", false),
      originalColorName: colorName(adjustedColor),
      lightnessDelta: result.lightnessDelta,
      chroma: result.chroma,
      originalChroma: result.originalChroma,
      lc: result.actualLc,
      polarity: result.lcPolarity,
      requiredLc,
      meetsRequirement: result.meetsRequirement,
      fontSize: fontSizeKey,
      fontWeight
    };

    // Every sentence opens on a fixed word: a CSS keyword name stays lower
    // case, so it cannot start one.
    const originalName = colorName(adjustedColor);
    const heldName = colorName(heldColor);
    const newName = movedColorName(originalName, colorName(color), result.lightnessDelta);
    const row = `${fontSizeKey}, weight ${fontWeight}, ${textKindPhrase(textKind)}`;

    if (result.lightnessDelta === 0 && result.meetsRequirement) {
      const text = `Leave it as it is: ${colorName(textClr)} text on ${colorName(bgClr)} already passes at ${row}.`;

      return {
        content: [
          {
            type: "text",
            text
          }
        ],
        structuredContent
      };
    }

    if (result.meetsRequirement) {
      const movement = result.lightnessDelta > 0 ? "lightening" : "darkening";
      const text = `Against ${heldName}, ${movement} ${adjustPhrase(adjust)} from ${originalName} to ${newName} makes the pair pass at ${row}.`;

      return {
        content: [
          {
            type: "text",
            text
          }
        ],
        structuredContent
      };
    }

    // An unmoved result has no direction to name: the color already sits at
    // the end of its range.
    const closest = result.lightnessDelta === 0
      ? `${newName}, left as it is,`
      : `${newName}, the ${result.lightnessDelta > 0 ? "lightest" : "darkest"} it goes,`;
    const text = `Against ${heldName}, no lightness of ${adjustPhrase(adjust)} ${originalName} makes the pair pass at ${row}; ${closest} comes closest.`;

    return {
      content: [
        {
          type: "text",
          text
        }
      ],
      structuredContent
    };
  };


export function registerAdjustColorForContrast(server: McpServer) {
  server.registerTool("adjust_color_for_contrast", {
      description: "Shifts one color of a text and background pair in OKLch lightness, by the smallest move that meets the APCA Lc requirement for the given font size and weight. The hue is kept, so the result still reads as the color the caller started with; the other color is held exactly. Use it when a color has to stay recognisably itself, such as a brand button whose label fails – find_text_color replaces the text color instead, usually with black or white. Where no lightness passes, the result is the closest one; where no color is readable at that size and weight at all, it is the color unmoved. meetsRequirement is false in both.",
      inputSchema,
      outputSchema,
      annotations: TOOL_ANNOTATION
    },
    callback
  );
}
