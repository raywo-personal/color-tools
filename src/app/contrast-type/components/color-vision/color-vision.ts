import {Component, computed, inject} from "@angular/core";
import {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {PALETTE_SLOTS, PaletteSlot} from "@engine/palette/palette.model";
import {roleCaptionFor} from "@engine/palette/palette-role.helper";
import {colorName} from "@engine/color/color-name.helper";
import {VISION_MODELS, VisionModel, visionCaption} from "@engine/vision/vision.model";
import {simulateVision} from "@engine/vision/simulate-vision.helper";
import {collapsedGroups} from "@engine/vision/vision-collapse.helper";
import {InfoButton} from "@common/components/info-button/info-button";


interface Chip {
  readonly slot: PaletteSlot;
  readonly background: string;
  readonly label: string;
}


/**
 * One group of members a vision model can no longer tell apart: which slots
 * it covers, and the sentence that names them.
 */
interface Collapse {
  readonly marks: readonly boolean[];
  readonly sentence: string;
}


interface Row {
  readonly vision: VisionModel;
  readonly caption: string;
  readonly chips: readonly Chip[];
  readonly collapses: readonly Collapse[];
}


/**
 * The current palette as four colour-vision deficiencies deliver it.
 *
 * **It simulates the palette, not the pair.** APCA reads lightness, and none
 * of the three dichromacies moves lightness far, so a simulated pair would
 * report an Lc within a point or two of the one above it and say nothing the
 * rating does not already say. What a deficiency does cost is the difference
 * between two palette members, and that is a finding the rest of the screen
 * has no way to reach.
 *
 * **The block says so behind the caption's `i`.** Five rows of the palette
 * invite the question why the pair is not among them, and it has to be
 * answerable - but it is asked once, and standing over the rows the paragraph
 * cost the column four lines every time. `InfoButton` is where it lives now.
 * What stays on the page is the finding: a row that lost a difference says so
 * under itself.
 *
 * Nothing here is a control: no chip is focusable, so the hit area and the
 * ring offset that every visitor-colour surface otherwise carries do not
 * apply. What replaces them is the name - twenty-five coloured blocks with no
 * text is the failure this app measures, so each chip says which member it
 * stands for and which colour that member becomes.
 *
 * The collapse line under a row is the verdict the picture cannot give: two
 * members landing on one colour is what a visitor comes here to find out, and
 * leaving it to the eye leaves out everyone reading by ear. A row without one
 * lost nothing, which is what the introduction's last clause defines.
 *
 * **The line names colours, so something has to point at them.** `Cerise and
 * Sunglo become the same color` is unanswerable on this screen alone - the
 * names live in the chips' own text, which is for speech, and no palette
 * member is labelled where a visitor can read it. A caret under each member
 * of the group carries that: the sentence says which colours, the carets say
 * which chips. They are `aria-hidden`, because the sentence is already the
 * spoken form of the same thing.
 *
 * A row can lose two differences at once, and two groups under one row make
 * a single strip of carets ambiguous. So a group brings its own strip and its
 * own sentence, and the two sit together.
 */
@Component({
  selector: "ct-color-vision",
  imports: [InfoButton],
  templateUrl: "./color-vision.html",
  host: {
    "class": "block"
  }
})
export class ColorVision {

  readonly #stateStore = inject(AppStateStore);

  protected readonly rows = computed<Row[]>(() => {
    const palette = this.#stateStore.currentPalette();
    const colors = PALETTE_SLOTS.map(slot => palette[slot].color);
    // Named once for all five rows: the member is identified by the colour it
    // has in normal vision, which is the row a visitor compares against.
    const names = colors.map(color => colorName(color));
    const roles = PALETTE_SLOTS.map(slot => roleCaptionFor(palette.style, slot));

    return VISION_MODELS.map(vision => {
      const simulated = colors.map(color => simulateVision(color, vision));

      return {
        vision,
        caption: visionCaption(vision),
        chips: PALETTE_SLOTS.map((slot, index) => ({
          slot,
          background: simulated[index].hex("rgb"),
          label: vision === "normal"
            ? `${roles[index]}, ${names[index]}`
            : `${roles[index]}, ${names[index]} appears as ${colorName(simulated[index])}`
        })),
        collapses: collapsesIn(colors, names, vision)
      };
    });
  });

}


function collapsesIn(this: void,
                     colors: readonly Color[],
                     names: readonly string[],
                     vision: VisionModel): Collapse[] {
  return collapsedGroups(colors, vision).map(group => ({
    marks: PALETTE_SLOTS.map((_, index) => group.includes(index)),
    sentence: `${joinNames(group.map(index => names[index]))} become the same color.`
  }));
}


/** `A and B`, `A, B and C`. A group is never shorter than two. */
function joinNames(this: void, names: readonly string[]): string {
  const last = names[names.length - 1];
  const rest = names.slice(0, -1);

  return `${rest.join(", ")} and ${last}`;
}
