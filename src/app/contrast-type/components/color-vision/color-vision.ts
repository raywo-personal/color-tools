import {Component, computed, inject} from "@angular/core";
import {Color} from "chroma-js";
import {AppStateStore} from "@core/app-state.store";
import {PALETTE_SLOTS, PaletteSlot} from "@engine/palette/palette.model";
import {roleCaptionFor} from "@engine/palette/palette-role.helper";
import {colorName} from "@engine/color/color-name.helper";
import {VISION_MODELS, VisionModel, visionCaption} from "@engine/vision/vision.model";
import {simulateVision} from "@engine/vision/simulate-vision.helper";
import {collapsedGroups} from "@engine/vision/vision-collapse.helper";


interface Chip {
  readonly slot: PaletteSlot;
  readonly background: string;
  readonly label: string;
}


interface Row {
  readonly vision: VisionModel;
  readonly caption: string;
  readonly chips: readonly Chip[];
  readonly collapse: string | null;
}


/**
 * The current palette as four colour-vision deficiencies deliver it.
 *
 * **It simulates the palette, not the pair.** APCA reads lightness, and none
 * of the three dichromacies moves lightness far, so a simulated pair would
 * report an Lc within a point or two of the one above it and say nothing the
 * rating does not already say. What a deficiency does cost is the difference
 * between two palette members, and that is a finding the rest of the screen
 * has no way to reach. The caption says so, because a block that shows five
 * rows of the palette invites the question why the pair is not among them.
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
 * lost nothing, which is what the caption's last clause defines.
 */
@Component({
  selector: "ct-color-vision",
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
        collapse: collapseText(colors, names, vision)
      };
    });
  });

}


function collapseText(this: void,
                      colors: readonly Color[],
                      names: readonly string[],
                      vision: VisionModel): string | null {
  const groups = collapsedGroups(colors, vision);

  if (groups.length === 0) return null;

  const sentences = groups
    .map(group => `${joinNames(group.map(index => names[index]))} become the same color`);

  return `${sentences.join("; ")}.`;
}


/** `A and B`, `A, B and C`. A group is never shorter than two. */
function joinNames(this: void, names: readonly string[]): string {
  const last = names[names.length - 1];
  const rest = names.slice(0, -1);

  return `${rest.join(", ")} and ${last}`;
}
