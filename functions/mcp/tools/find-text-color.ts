import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {FONT_SIZES, FONT_WEIGHTS} from "@contrast/models/apca-lookup-table.model";
import {APCA_POLARITIES, getAPCAPolarity, lightestPassingFontWeight, smallestPassingFontSize} from "@contrast/helper/apca-rating.helper";
import {colorName} from "@common/helpers/color-name.helper";
import chroma from "chroma-js";
import {findTextColor, MODES} from "@contrast/helper/optimal-text-color.helper";
import {fontSizeKeyFrom} from "@common/helpers/font-size.helper";
import {opaqueHexColor, fontSizeInput, fontWeightInput} from "../helper/tool-schemas.helper";


const inputSchema = {
  backgroundColor: opaqueHexColor("Background color"),
  mode: z.enum(MODES)
    .default("optimal")
    .describe("optimal: black or white, maximum contrast; minimum: the palest grey that still passes; harmonic: a muted color on the background's own hue."),
  fontSize: fontSizeInput,
  fontWeight: fontWeightInput
};

const outputSchema = {
  textColor: z.string(),
  textColorName: z.string(),
  backgroundColorName: z.string(),
  lc: z.number(),
  polarity: z.enum(APCA_POLARITIES),
  requiredLc: z.number().nullable(),
  meetsRequirement: z.boolean(),
  mode: z.enum(MODES),
  appliedMode: z.enum(MODES),
  fontSize: z.enum(FONT_SIZES),
  fontWeight: z.enum(FONT_WEIGHTS),
  smallestPassingFontSize: z.enum(FONT_SIZES)
    .nullable()
    .describe("The smallest font size that meets the APCA requirement. Maybe null if none meets the requirement."),
  lightestPassingFontWeight: z.enum(FONT_WEIGHTS)
    .nullable()
    .describe("The smallest font weight that meets the APCA requirement. Maybe null if none meets the requirement."),
};

export function registerFindTextColor(server: McpServer) {
  server.registerTool("find_text_color", {
      title: "Find Text Color",
      description: "Find the text color for a given background color according to the selected mode.",
      inputSchema,
      outputSchema,
      annotations: {readOnlyHint: true, idempotentHint: true, openWorldHint: false}
    },
    callback
  );
}


const callback: ToolCallback<typeof inputSchema> =
  ({backgroundColor, mode, fontSize, fontWeight}) => {
    const backgroundClr = chroma(backgroundColor);
    const backgroundColorName = colorName(backgroundClr);
    const fontSizeKey = fontSizeKeyFrom(fontSize);

    const config = {fontSize: fontSizeKey, fontWeight};
    const foundResult = findTextColor(backgroundClr, mode, config);
    const textColor = foundResult.color;
    const textColorName = colorName(textColor);

    const meetsRequirement = foundResult.meetsRequirement;

    const structuredContent = {
        textColor: textColor.hex(),
        textColorName,
        backgroundColorName,
        lc: foundResult.contrast,
        polarity: getAPCAPolarity(foundResult.contrast),
        requiredLc: foundResult.requiredContrast,
        meetsRequirement,
        mode,
        appliedMode: foundResult.appliedMode,
        fontSize: fontSizeKey,
        fontWeight: fontWeight,
        smallestPassingFontSize: smallestPassingFontSize(foundResult.contrast, fontWeight),
        lightestPassingFontWeight: lightestPassingFontWeight(foundResult.contrast, fontSizeKey)
      }
    ;

    let text: string;

    if (!foundResult.meetsRequirement) {
      text = `No text color is readable on ${backgroundColorName} at ${fontSizeKey}, weight ${fontWeight}; ${textColorName} is the closest.`;
    } else {
      text = `${textColorName} on ${backgroundColorName} is readable at ${fontSizeKey}, weight ${fontWeight}.`;
    }

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
