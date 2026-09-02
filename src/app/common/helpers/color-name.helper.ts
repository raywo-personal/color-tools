import chroma, {Color} from "chroma-js";
import basic from "color-namer/lib/colors/basic";
import html from "color-namer/lib/colors/html";
import ntc from "color-namer/lib/colors/ntc";
import pantone from "color-namer/lib/colors/pantone";
import roygbiv from "color-namer/lib/colors/roygbiv";
import x11 from "color-namer/lib/colors/x11";

/**
 * How much further away a Pantone match may be and still win over the closest
 * match from any list. Pantone names read better than the generated ones.
 */
const PANTONE_TOLERANCE = 5;

interface NamedColor {
  name: string;
  hex: string;
}

/** A list entry with its Lab coordinates worked out once. */
interface Candidate {
  readonly name: string;
  readonly lab: readonly number[];
  readonly isPantone: boolean;
}

/**
 * The lists come from `color-namer`, but the distance math does not - see the
 * Color Libraries section in CLAUDE.md for why the package's own entry point is
 * bypassed. Order matters: on equal distance the first list wins, which is what
 * `color-namer` did with its stable sort.
 */
const LISTS: readonly NamedColor[][] = [basic, html, ntc, pantone, roygbiv, x11];

/**
 * The lists in the order above, each entry with its Lab values.
 *
 * Built on the first call rather than at import, so loading the module costs
 * nothing until a name is asked for. It exists because `chroma.distance()`
 * parses both of its arguments into a `Color` on every call - some 2 500
 * parses per name, about 2.5 ms, and the palette asks for six names on every
 * frame of a slider drag. With the candidates converted once, a name costs
 * one conversion and 2 500 subtractions.
 */
let candidates: readonly Candidate[] | undefined;


function allCandidates(): readonly Candidate[] {
  candidates ??= LISTS.flatMap(list => list.map(entry => ({
    name: entry.name,
    lab: chroma(entry.hex).lab(),
    isPantone: list === pantone
  })));

  return candidates;
}


/**
 * CIE76 delta E, the same sum `chroma.distance()` computes in its default
 * `lab` mode - so the closest name is the one that call would have found.
 */
function labDistance(a: readonly number[], b: readonly number[]): number {
  let sumOfSquares = 0;

  for (let i = 0; i < a.length; i++) {
    const d = (a[i] || 0) - (b[i] || 0);

    sumOfSquares += d * d;
  }

  return Math.sqrt(sumOfSquares);
}


export function colorName(color: Color): string {
  // Quantize to 8-bit RGB first. `color-namer` was fed `color.hex()`, so the
  // distances were measured from the rounded color; a chroma `Color` carries
  // unrounded channels and would name ~5 % of the colors differently.
  const lab = chroma(color.hex()).lab();

  let closest: Candidate | undefined;
  let closestDistance = Infinity;
  let closestPantone: Candidate | undefined;
  let closestPantoneDistance = Infinity;

  for (const candidate of allCandidates()) {
    const distance = labDistance(lab, candidate.lab);

    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }

    if (candidate.isPantone && distance < closestPantoneDistance) {
      closestPantone = candidate;
      closestPantoneDistance = distance;
    }
  }

  if (!closest) return "Unknown";

  if (closestPantone && closestPantoneDistance <= closestDistance + PANTONE_TOLERANCE) {
    return closestPantone.name;
  }

  return closest.name;
}
