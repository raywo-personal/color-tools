import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import chroma from "chroma-js";
import {colorName} from "@common/helpers/color-name.helper";
import {FONT_WEIGHTS} from "@contrast/models/apca-lookup-table.model";
import {APCA_POLARITIES, getAPCAPolarity, getAPCARating, getAPCARatingLabel, getRequiredLc} from "@contrast/helper/apca-rating.helper";
import {calculateAPCAContrast, meetsAPCARequirement} from "@contrast/helper/optimal-text-color.helper";
import {fontSizeKeyFrom} from "@common/helpers/font-size.helper";
import {opaqueHexColor, fontSizeInput, fontWeightInput} from "../helper/tool-schemas.helper";


const inputSchema = {
  textColor: opaqueHexColor("Text color"),
  backgroundColor: opaqueHexColor("Background color"),
  fontSize: fontSizeInput,
  fontWeight: fontWeightInput,
};

const outputSchema = {
  lc: z.number(),
  polarity: z.enum(APCA_POLARITIES),
  fontSize: z.string(),
  fontWeight: z.enum(FONT_WEIGHTS),
  requiredLc: z.number().nullable(),
  meetsRequirement: z.boolean(),
  rating: z.number().int().min(0).max(3),
  ratingLabel: z.string(),
  textColorName: z.string(),
  backgroundColorName: z.string()
};

const callback: ToolCallback<typeof inputSchema> =
  ({textColor, backgroundColor, fontSize, fontWeight}) => {
    const textClr = chroma(textColor);
    const backgroundClr = chroma(backgroundColor);
    const fontSizeKey = fontSizeKeyFrom(fontSize);
    const lc = calculateAPCAContrast(textClr, backgroundClr);
    const requiredLc = getRequiredLc(fontSizeKey, fontWeight);
    const apcaRating = getAPCARating(lc, fontSizeKey, fontWeight);

    const structuredContent = {
      lc,
      polarity: getAPCAPolarity(lc),
      fontSize: fontSizeKey,
      fontWeight,
      requiredLc,
      meetsRequirement: meetsAPCARequirement(textClr, backgroundClr, fontSizeKey, fontWeight),
      rating: apcaRating,
      ratingLabel: getAPCARatingLabel(apcaRating),
      textColorName: colorName(textClr),
      backgroundColorName: colorName(backgroundClr)
    };

    return {
      content: [
        {
          type: "text",
          text: `${structuredContent.textColorName} on ${structuredContent.backgroundColorName} is "${structuredContent.ratingLabel}" at ${fontSizeKey}, weight ${fontWeight}.`
        }
      ],
      structuredContent
    };
  };


export function registerCheckContrast(server: McpServer) {
  server.registerTool("check_contrast", {
      title: "Check Contrast",
      description: "Check contrast between two colors",
      inputSchema,
      outputSchema,
      annotations: {readOnlyHint: true, idempotentHint: true, openWorldHint: false}
    },
    callback);
}
