import {opaqueHexColor} from "../helper/tool-schemas.helper";
import {z} from "zod";
import {VISION_MODELS} from "@engine/vision/vision.model";
import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {TOOL_ANNOTATION} from "../helper/annotation.helper";
import {COLLAPSE_DISTANCE} from "@engine/vision/vision-collapse.helper";


const DEFICIENCIES = VISION_MODELS
  .filter(deficiency => deficiency !== "normal");
type Deficiency = typeof DEFICIENCIES[number];


const inputSchema = {
  colors: z.array(opaqueHexColor("Color"))
    .min(1)
    .max(10)
    .describe("Colors that appear together and must stay apart, such as a chart's series or a palette. At most ten; every result keeps this order."),
  deficiency: z.enum(DEFICIENCIES)
    .optional()
    .describe("One deficiency to simulate. Omit to get all four, in the order listed.")
};

const colorTuple = {hex: z.string(), name: z.string()};

const deficiencySimulationDetails = z.object({
  deficiency: z.enum(DEFICIENCIES)
    .describe("The simulated deficiency."),
  colors: z.array(z.object(colorTuple))
    .describe("The input colors as simulated under this deficiency, each named anew, in input order."),
  collisions: z.array(z.object({
      members: z.array(z.number().int()).min(2)
        .describe("Indices into the input list, ascending.")
    })
  ).describe(`Groups of input colors that read as one under this deficiency although normal vision tells them apart. Members are linked in a chain, each within an Oklab distance of ${COLLAPSE_DISTANCE} of another, so the ends of a group can lie further apart. Empty when every color stays distinguishable.`)
});

const outputSchema = {
  colors: z.array(z.object(colorTuple))
    .describe("The input colors with their names, in input order."),
  simulations: z.array(deficiencySimulationDetails)
    .describe("One entry per simulated deficiency, in the order of the deficiency list; a single entry when one was asked for.")
};

type Output = z.infer<z.ZodObject<typeof outputSchema>>;

const callback: ToolCallback<typeof inputSchema> =
  ({colors, deficiency}) => {
    const structuredContent: Output = {} as Output;
    const text = "This is a placeholder text.";

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

export function registerSimulateColorVision(server: McpServer) {
  server.registerTool("simulate_color_vision", {
      title: "Simulate color vision",
      description: "Shows how colors that appear together – a chart's series, a palette, status colors – reach a viewer with a color-vision deficiency, and which of them merge. Each color comes back as simulated under deuteranopia and protanopia (red–green), tritanopia (blue–yellow) and achromatopsia (no color vision). A collision is a group of colors that normal vision tells apart and the deficiency does not; colors that already look alike are not reported. Each simulation is the complete form of the deficiency, the worst case – the milder, far more common forms merge fewer colors. Whether text is readable on a background is check_contrast.",
      inputSchema,
      outputSchema,
      annotations: TOOL_ANNOTATION
    },
    callback
  );
}
