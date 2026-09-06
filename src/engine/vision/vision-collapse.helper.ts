import chroma, {Color} from "chroma-js";
import {VisionModel} from "@engine/vision/vision.model";
import {simulateVision} from "@engine/vision/simulate-vision.helper";


/**
 * The Oklab distance below which two patches read as one colour.
 *
 * Oklab's own scale puts a just noticeable difference at about this value for
 * two large patches sharing an edge. The chips here are small and separated
 * by a gap, so the same figure is the conservative choice: what it names has
 * genuinely collapsed, and a borderline pair goes unmentioned rather than
 * being invented. A verdict that cries wolf is worth less than a quiet one.
 */
export const COLLAPSE_DISTANCE = 0.02;


/**
 * Groups of colors that a vision model cannot tell apart, given by their
 * index in the input.
 *
 * The finding is not "these sit close together" but "the model lost the
 * difference", so a group is reported only when normal vision did **not**
 * already show it as one block. Two palette members that already looked alike
 * are not news about deuteranopia, and under `"normal"` nothing is ever news.
 *
 * Groups rather than pairs: three colors landing on one produce three pairs
 * and one sentence, and the sentence is what the block prints.
 *
 * @param {readonly Color[]} colors - The colors as a trichromat sees them.
 * @param {VisionModel} vision - The vision model to judge under.
 * @return {number[][]} Index groups of two or more, each sorted ascending,
 *                      in the order their lowest index appears.
 */
export function collapsedGroups(this: void,
                                colors: readonly Color[],
                                vision: VisionModel): number[][] {
  const simulated = colors.map(color => simulateVision(color, vision));
  const before = blockOf(colors);
  const after = blockOf(simulated);

  return groupsIn(after)
    .filter(group => !group.every(index => before[index] === before[group[0]]));
}


/**
 * For each color, the index that identifies the block of indistinguishable
 * colors it belongs to.
 *
 * The relation is made transitive on purpose: a chain of three colors, each
 * within the distance of the next, is one indistinguishable band on screen
 * even though its ends are further apart than the threshold.
 */
function blockOf(this: void, colors: readonly Color[]): number[] {
  const parent = colors.map((_, index) => index);

  function root(index: number): number {
    let current = index;
    while (parent[current] !== current) current = parent[current];

    return current;
  }

  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      if (chroma.distance(colors[i], colors[j], "oklab") < COLLAPSE_DISTANCE) {
        parent[root(j)] = root(i);
      }
    }
  }

  return parent.map((_, index) => root(index));
}


function groupsIn(this: void, blocks: readonly number[]): number[][] {
  const groups = new Map<number, number[]>();

  blocks.forEach((block, index) => groups.set(block, [...groups.get(block) ?? [], index]));

  return [...groups.values()].filter(group => group.length > 1);
}
