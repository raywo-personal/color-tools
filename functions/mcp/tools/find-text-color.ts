import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {FONT_SIZES, FONT_WEIGHTS} from "@engine/contrast/apca-lookup-table.model";
import {APCA_POLARITIES, getAPCAPolarity, lightestPassingFontWeight, smallestPassingFontSize} from "@engine/contrast/apca-rating.helper";
import {colorName} from "@engine/color/color-name.helper";
import chroma from "chroma-js";
import {findTextColor, MODES} from "@engine/contrast/optimal-text-color.helper";
import {fontSizeKeyFrom} from "@engine/helpers/font-size.helper";
import {opaqueHexColor, fontSizeInput, fontWeightInput} from "../helper/tool-schemas.helper";


const inputSchema = {
  backgroundColor: opaqueHexColor("Background color"),
  mode: z.enum(MODES)
    .default("optimal")
    .describe("optimal: black or white, maximum contrast; minimum: the softest grey that still passes; harmonic: a muted color on the background's own hue."),
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
    .describe("The smallest font size at which the returned contrast meets the table at this weight - what would make a failing pair pass. Null where no row does."),
  lightestPassingFontWeight: z.enum(FONT_WEIGHTS)
    .nullable()
    .describe("The lightest font weight at which the returned contrast meets the table at this size - what would make a failing pair pass. Null where no cell does."),
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

    // The payload carries appliedMode; the sentence has to carry it too, or an
    // assistant quoting the prose passes white on as a color on the hue.
    const modeNote = foundResult.appliedMode === mode
      ? ""
      : `; ${mode} could not answer, so this is the ${foundResult.appliedMode} result`;

    const text = foundResult.meetsRequirement
      ? `${textColorName} on ${backgroundColorName} is readable at ${fontSizeKey}, weight ${fontWeight}${modeNote}.`
      : `No text color is readable on ${backgroundColorName} at ${fontSizeKey}, weight ${fontWeight}; ${textColorName} is the closest${modeNote}.`;

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
