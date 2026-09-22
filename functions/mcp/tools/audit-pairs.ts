import {z} from "zod";
import {fontSizeInput, fontWeightInput, opaqueHexColor} from "../helper/tool-schemas.helper";
import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {TOOL_ANNOTATION} from "../helper/annotation.helper";
import {Color} from "chroma-js";
import {fontSizeKeyFrom} from "@engine/helpers/font-size.helper";
import {calculateAPCAContrast, getRequiredLc, meetsRequiredLc, TextKind} from "@engine/contrast/apca-rating.helper";
import {FontSize, FontWeight} from "@engine/contrast/apca-lookup-table.model";
import {toColor} from "@engine/color/color.helper";
import {formatColor} from "@engine/color/color-format.helper";
import {colorName} from "@engine/color/color-name.helper";
import {findTextColor, MODES, OptimalColorConfigOptions} from "@engine/contrast/optimal-text-color.helper";


const PAIR = z.object({
  label: z.string()
    .max(80)
    .optional()
    .describe("How the pair is named in the summary, e.g. \"body-on-card\"."),
  textColor: opaqueHexColor("Text color"),
  backgroundColor: opaqueHexColor("Background color"),
  fontSize: fontSizeInput,
  fontWeight: fontWeightInput
});

const inputSchema = {
  pairs: z.array(PAIR)
    .min(1)
    .max(50)
    .describe("At most 50 pairs. Size and weight decide the requirement: 16px/400 asks for Lc 90, 24px/400 for 60.")
};


const auditResultSchema = z.object({
  label: z.string().nullable(),
  textColor: z.string(),
  backgroundColor: z.string(),
  fontSize: z.string(),          // the snapped table row
  fontWeight: z.string(),
  lc: z.number(),
  requiredLc: z.number().nullable(),
  meetsRequirement: z.boolean(),
  suggestion: z.object({
    textColor: z.string(),
    name: z.string(),
    lc: z.number(),
    appliedMode: z.enum(MODES),
    meetsRequirement: z.boolean()
  }).nullable()                  // null where the pair already passes
});
type AuditResult = z.infer<typeof auditResultSchema>;

const outputSchema = {
  passed: z.number().int(),
  failed: z.number().int(),
  results: z.array(auditResultSchema)
};


function evaluatePair(label: string | undefined,
                      textColor: Color,
                      backgroundColor: Color,
                      fontSize: FontSize,
                      fontWeight: FontWeight,
                      textKind: TextKind): AuditResult {
  const lc = calculateAPCAContrast(textColor, backgroundColor);
  const requiredLc = getRequiredLc(fontSize, fontWeight, textKind);

  const meetsRequirement = meetsRequiredLc(lc, requiredLc);

  const options: OptimalColorConfigOptions = {
    fontSize,
    fontWeight,
    textKind,
    includeColoredAlternatives: true
  };

  let suggestion = null;

  if (!meetsRequirement) {
    const foundTextColor = findTextColor(backgroundColor, "harmonic", options);

    suggestion = {
      textColor: formatColor(foundTextColor.color, "hex", false),
      name: colorName(foundTextColor.color),
      lc: foundTextColor.contrast,
      appliedMode: foundTextColor.appliedMode,
      meetsRequirement: foundTextColor.meetsRequirement
    };
  }

  return {
    label: label === undefined ? null : label,
    textColor: formatColor(textColor, "hex", false),
    backgroundColor: formatColor(backgroundColor, "hex", false),
    fontSize,
    fontWeight,
    lc,
    requiredLc,
    meetsRequirement,
    suggestion
  };
}


const callback: ToolCallback<typeof inputSchema> =
  ({pairs}) => {
    let passed = 0;
    let failed = 0;

    const results: AuditResult[] = pairs.map((pair) => {
      const fontSize = fontSizeKeyFrom(pair.fontSize);
      const fontWeight = pair.fontWeight;
      const textKind: TextKind = "spotText";

      const evalResult = evaluatePair(
        pair.label,
        toColor(pair.textColor),
        toColor(pair.backgroundColor),
        fontSize,
        fontWeight,
        textKind
      );

      if (evalResult.meetsRequirement) passed++;
      else failed++;

      return evalResult;
    });

    const failingLabels = results
      .filter((result) => !result.meetsRequirement)
      .map((result) => {
        if (!result.label) {
          return `(${result.textColor} on ${result.backgroundColor})`;
        }
        return result.label;
      });

    const structuredContent = {
      passed,
      failed,
      results
    };

    const text = failed === 0
      ? `All ${results.length} pairs pass at their given size and weight.`
      : `${failed} of ${results.length} pairs fail: ${failingLabels.join(", ")}.`;

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


export function registerAuditPairs(server: McpServer) {
  server.registerTool("audit_pairs", {
      title: "Audit Pairs",
      description: "Audit pairs of text and background color for contrast ratio. If harmonic contrast is not met, a color is suggested. If no color passes the test White or Black are suggested.",
      inputSchema,
      outputSchema,
      annotations: TOOL_ANNOTATION
    },
    callback);
}
