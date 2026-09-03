import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {isHex} from "@common/helpers/color-format-parser.helper";
import {z} from "zod";
import {hasAlpha} from "../helper/color-helper";
import chroma from "chroma-js";
import {colorName} from "@common/helpers/color-name.helper";
import {FONT_SIZES, FONT_WEIGHTS} from "@contrast/models/apca-lookup-table.model";
import {APCA_POLARITIES, findClosestSizeKey, getAPCAPolarity, getAPCARating, getAPCARatingLabel, getRequiredLc} from "@contrast/helper/apca-rating.helper";


export function registerCheckContrast(server: McpServer) {
  server.registerTool("check_contrast", {
      title: "Check Contrast",
      description: "Check contrast between two colors",
      inputSchema: {
        textColor: z.string()
          .refine(
            value => isHex(value) && !hasAlpha(value),
            {message: "Text color must be a valid hex color without alpha channel"}
          )
          .describe("Text color in CSS hex format without alpha channel"),
        backgroundColor: z.string()
          .refine(
            value => isHex(value) && !hasAlpha(value),
            {message: "Background color must be a valid hex color without alpha channel"}
          )
          .describe("Background color in CSS hex format without alpha channel"),
        fontSize: z.string()
          .regex(/^\d+px$/, {message: "Font size must be a pixel value like '16px'."})
          .default("16px")
          .describe("Font size in CSS pixels, for example '16px'"),
        fontWeight: z.enum(FONT_WEIGHTS)
          .default("400")
          .describe("CSS font weight, for example '400' for regular or '700' for bold.")
      },
      outputSchema: {
        lc: z.number(),
        polarity: z.enum(APCA_POLARITIES),
        fontSize: z.string(),
        fontWeight: z.string(),
        requiredLc: z.number().nullable(),
        meetsRequirement: z.boolean(),
        rating: z.number().int().min(0).max(3),
        ratingLabel: z.string(),
        textColorName: z.string(),
        backgroundColorName: z.string()
      },
      annotations: {readOnlyHint: true, idempotentHint: true, openWorldHint: false}
    },
    ({textColor, backgroundColor, fontSize, fontWeight}) => {
      const textClr = chroma(textColor);
      const backgroundClr = chroma(backgroundColor);
      const fontSizeNumber = parseInt(fontSize, 10);
      const fontSizeKey = findClosestSizeKey(fontSizeNumber, FONT_SIZES);
      const lc = chroma.contrastAPCA(textClr, backgroundClr);
      const requiredLc = getRequiredLc(fontSizeNumber, fontWeight);
      const apcaRating = getAPCARating(lc, fontSizeNumber, fontWeight);

      const structuredContent = {
        lc,
        polarity: getAPCAPolarity(lc),
        fontSize: fontSizeKey,
        fontWeight,
        requiredLc,
        meetsRequirement: apcaRating >= 2,
        rating: apcaRating,
        ratingLabel: getAPCARatingLabel(apcaRating),
        textColorName: colorName(textClr),
        backgroundColorName: colorName(backgroundClr)
      };

      return {
        content: [
          {
            type: "text",
            text: `With a font size of ${fontSize} and font weight of ${fontWeight} the colors ${(colorName(textClr))} and ${(colorName(backgroundClr))} have APCA rating of "${structuredContent.ratingLabel}"`
          }
        ],
        structuredContent
      };
    });
}
