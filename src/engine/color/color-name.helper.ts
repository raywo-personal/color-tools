import chroma, {Color} from "chroma-js";
import {colornames} from "color-name-list/bestof";
import {CSS_COLOR_KEYWORDS} from "@engine/color/css-color-keywords.model";

/** A list entry with its Lab coordinates worked out once. */
interface Candidate {
  readonly name: string;
  readonly lab: readonly number[];
}

/**
 * `color-name-list`'s curated cut: every name denotes exactly one colour and
 * every colour carries exactly one name. That bijection is the point of the
 * list. A list that names two colours the same - as the merged `color-namer`
 * lists did, with "Green" on both `#00FF00` and `#1CAC78` - hands a
 * monochromatic palette or a tint ramp two swatches under one label, and a
 * screen reader then reads the same name twice for colours the eye separates.
 *
 * The full list is not taken: its ESM build is over a megabyte and would put
 * the initial bundle past its error budget, and moving it into a worker would
 * make `colorName()` asynchronous at every call site - among them the copy
 * gesture and four `computed()` that supply `aria-label`s. Against the
 * curated cut it buys a fraction of a name per eleven-step ramp.
 */
const LIST: readonly {name: string; hex: string}[] = colornames;

/**
 * The keyword spellings, lower cased.
 *
 * A list name that a keyword also spells - "Olive" against `olive`, "Bisque"
 * against `bisque` - is one word to a screen reader, which hears no case. The
 * two sit close enough in the space to land in one tint ramp, and the ramp
 * then reads the same name twice for colours the eye separates: the duplicate
 * this list was chosen to rule out, back through the keyword table. Roughly a
 * third of the keywords have such a twin, and it is the twin that leaves the
 * search rather than the keyword leaving the table - a keyword is what
 * identifies a colour to whoever pastes it into a stylesheet, and a twin gives
 * up one prose name out of thousands.
 */
const KEYWORD_SPELLINGS = new Set(
  Object.values(CSS_COLOR_KEYWORDS)
    .filter(keyword => keyword !== undefined)
    .map(keyword => keyword.toLowerCase())
);

/**
 * The searchable list with each entry's Lab values.
 *
 * Built on the first call rather than at import, so loading the module costs
 * nothing until a name is asked for. It exists because `chroma.distance()`
 * parses both of its arguments into a `Color` on every call - some 5 000
 * parses per name, and the palette asks for six names on every frame of a
 * slider drag. With the candidates converted once, a name costs one
 * conversion and 5 000 subtractions.
 */
let candidates: readonly Candidate[] | undefined;


function allCandidates(): readonly Candidate[] {
  candidates ??= LIST
    .filter(entry => !KEYWORD_SPELLINGS.has(entry.name.toLowerCase()))
    .map(entry => ({
      name: entry.name,
      lab: chroma(entry.hex).lab()
    }));

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
  // Quantize to 8-bit RGB first. The distances are measured from the rounded
  // color the user actually sees; a chroma `Color` carries unrounded channels
  // and would name ~5 % of the colors differently, so a color and its
  // palette-ID round trip (which goes through 8-bit RGB) could disagree.
  const hex = color.hex();
  const keyword = CSS_COLOR_KEYWORDS[hex];

  if (keyword) return keyword;

  const lab = chroma(hex).lab();

  let closest: Candidate | undefined;
  let closestDistance = Infinity;

  for (const candidate of allCandidates()) {
    const distance = labDistance(lab, candidate.lab);

    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }

  return closest?.name ?? "Unknown";
}
