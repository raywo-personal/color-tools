import {opaqueHexColor} from "../helper/tool-schemas.helper";
import {z} from "zod";
import {VISION_MODELS} from "@engine/vision/vision.model";
import {McpServer, ToolCallback} from "@modelcontextprotocol/sdk/server/mcp.js";
import {TOOL_ANNOTATION} from "../helper/annotation.helper";
import {COLLAPSE_DISTANCE, collapsedGroups} from "@engine/vision/vision-collapse.helper";
import {simulateVision} from "@engine/vision/simulate-vision.helper";
import {toColor} from "@engine/color/color.helper";
import {formatColor} from "@engine/color/color-format.helper";
import {colorName} from "@engine/color/color-name.helper";
import {Color} from "chroma-js";


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
  ).describe(`Groups of input colors that read as one under this deficiency although normal vision tells them apart. Members are linked in a chain, each within an Oklab distance of ${COLLAPSE_DISTANCE} of another, so the ends of a group can lie further apart. Empty when the deficiency merges nothing that normal vision tells apart.`)
});

const outputSchema = {
  colors: z.array(z.object(colorTuple))
    .describe("The input colors with their names, in input order."),
  simulations: z.array(deficiencySimulationDetails)
    .describe("One entry per simulated deficiency, in the order of the deficiency list; a single entry when one was asked for.")
};

type Output = z.infer<z.ZodObject<typeof outputSchema>>;
type Simulation = Output["simulations"][number];


const COUNT_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];


function colorTupleOf(this: void, color: Color): {hex: string; name: string} {
  return {hex: formatColor(color, "hex", false), name: colorName(color)};
}


/**
 * How the sentence names each input color.
 *
 * The name alone where it is unique in the list. Two inputs can take the
 * same nearest name without sitting close enough to count as one, and
 * `Cerulean and Cerulean become the same color` leaves the assistant unable
 * to say which two - so a repeated name carries its hex.
 *
 * Exported for the spec alone. Which inputs share a nearest name is up to
 * the name list, so a call through the protocol cannot be relied on to reach
 * this case.
 */
export function sentenceNames(this: void, tuples: readonly {hex: string; name: string}[]): string[] {
  return tuples.map(({hex, name}) =>
    tuples.filter(other => other.name === name).length > 1 ? `${name} (${hex})` : name
  );
}


/**
 * `A and B`, `A, B and C` - or with `, and` before the last, where the
 * parts already contain an `and` of their own.
 */
function joinWords(this: void, words: readonly string[], conjunction = " and "): string {
  if (words.length < 2) return words.join("");

  return `${words.slice(0, -1).join(", ")}${conjunction}${words[words.length - 1]}`;
}


function capitalized(this: void, text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}


/**
 * The collisions and nothing else: which colors merge under which
 * deficiency, and that the rest merge none. Indices and distances stay in
 * the payload.
 *
 * Measured against normal vision, never stated outright: "stay
 * distinguishable" would call two identical inputs distinguishable, because
 * `collapsedGroups()` does not report what normal vision already merged.
 * And it says what was measured, merging, not that no difference shrank:
 * red and green come far closer under deuteranopia without merging, and
 * "as distinct as in normal vision" reads as a yes to using them together.
 */
function summaryOf(this: void, names: readonly string[], simulations: readonly Simulation[]): string {
  if (names.length === 1) return "A single color has no other to merge with.";

  const colliding = simulations.filter(simulation => simulation.collisions.length > 0);

  if (colliding.length === 0) {
    return simulations.length === 1
      ? `${capitalized(simulations[0].deficiency)} merges none of these colors that normal vision tells apart.`
      : "No simulated deficiency merges two of these colors that normal vision tells apart.";
  }

  const clauses = colliding.map(simulation => {
    const groups = simulation.collisions
      .map(({members}) => `${joinWords(members.map(index => names[index]))} become the same color`);

    return `under ${simulation.deficiency}, ${joinWords(groups, ", and ")}`;
  });

  const rest = simulations.length - colliding.length;
  const lossless = rest === 0
    ? []
    : [rest === 1
      ? "the other simulation merges none"
      : `the other ${COUNT_WORDS[rest]} simulations merge none`];

  return `${capitalized([...clauses, ...lossless].join("; "))}.`;
}


const callback: ToolCallback<typeof inputSchema> =
  ({colors, deficiency}) => {
    const inputs = colors.map(color => toColor(color));
    const tuples = inputs.map(color => colorTupleOf(color));
    const deficiencies: readonly Deficiency[] = deficiency === undefined ? DEFICIENCIES : [deficiency];

    const simulations: Simulation[] = deficiencies.map(simulated => ({
      deficiency: simulated,
      colors: inputs.map(color => colorTupleOf(simulateVision(color, simulated))),
      collisions: collapsedGroups(inputs, simulated).map(members => ({members}))
    }));

    const structuredContent: Output = {colors: tuples, simulations};
    const text = summaryOf(sentenceNames(tuples), simulations);

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
