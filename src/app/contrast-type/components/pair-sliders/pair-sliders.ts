import {Component, computed, inject, model} from "@angular/core";
import {Color} from "chroma-js";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {ContrastColorRole} from "@engine/contrast/contrast-color.model";
import {ColorSliders} from "@common/components/color-sliders/color-sliders";


/** One half of the pair, as the selector beside the caption offers it. */
interface TargetOption {
  readonly role: ContrastColorRole;
  readonly caption: string;
}


const TARGET_OPTIONS: readonly TargetOption[] = [
  {role: "text", caption: "TEXT"},
  {role: "background", caption: "BACKGROUND"}
];


/**
 * The Studio's slider panel, on the half of the pair being edited.
 *
 * A pairing that is nearly right needed a trip to the Studio, a guess at which
 * slider to touch and a trip back to the one place the result is visible. The
 * panel is `ColorSliders`, which edits the colour it is handed and says nothing
 * about where it came from - so this component is the whole of what the screen
 * adds: which colour goes in, and which events come out.
 *
 * **The events are the contrast domain's, not the converter's.** They have to
 * be: the converter's colour events rebuild the palette, drag frames included,
 * and moving the text colour is no statement about the palette the chips are
 * drawn from - `contrastEvents.textColorAdjusted` says the rest.
 *
 * **The target is this panel's own, and its selector sits in this panel's
 * header.** It says which of two colours the three tracks move, which is a
 * statement about this block and nothing else - a selector one block away
 * would be read as steering the chip row too, and the chips ask nothing about
 * a half: `PaletteChips` says why a press there names its outcome instead. The
 * two segments are the app's own idiom for a choice of two - one joined box,
 * as `TypeRoles` and the space switch beside them are drawn - and they carry
 * `aria-pressed`, so the selection does not rest on the inversion alone.
 *
 * **The caption is `ADJUST` and the segments finish the sentence.** The mode
 * has one carrier, on the row that holds it: a caption reading
 * `ADJUST BACKGROUND` above a pressed `BACKGROUND` segment would be the same
 * state written twice, one of which cannot be pressed.
 *
 * **A press on a chip aims it as well.** The half a visitor has just set is
 * the one they are most likely to nudge, so `colorApplied` moves the target
 * with it - that is a consequence of an action, not a second control, and the
 * segments show where it landed.
 *
 * **The target goes in beside the colour, as the panel's subject.** The panel
 * keeps the slider values a colour cannot hold and gives them up on a colour it
 * did not itself produce - a comparison in three bytes, which two halves of a
 * pair that coincide pass. Aiming at the other half then has to say so, or the
 * tracks stand at the hue of the half no longer being edited.
 *
 * A switch of target is not announced: the visitor is standing on the button
 * that switched it, and it carries its own name and `aria-pressed`. A drag is
 * not announced either - the visitor is holding the control that causes it,
 * exactly as in the Studio.
 */
@Component({
  selector: "ct-pair-sliders",
  imports: [ColorSliders],
  template: `
    <ct-color-sliders [color]="color()"
                      [subject]="target()"
                      caption="ADJUST"
                      (colorAdjusted)="adjust($event)"
                      (commit)="commit()">
      <!-- One box with a hairline round it, as the space switch on the other
           side of this same row is drawn: two controls of one kind in one row
           have to be one shape. The overflow is hidden so the pressed
           segment's fill is clipped to the rounded corners, and the box itself
           does not wrap - a joined box broken over two lines is no longer one
           control. The row it sits in wraps instead. -->
      <div role="group"
           aria-label="Adjust which half of the pair"
           class="flex overflow-hidden rounded-xs border border-line">
        @for (option of options; track option.role) {
          <button type="button"
                  class="h-11 cursor-pointer px-3 font-sans text-base focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
                  [class.bg-text]="target() === option.role"
                  [class.text-bg]="target() === option.role"
                  [class.text-text]="target() !== option.role"
                  [attr.aria-pressed]="target() === option.role"
                  (click)="pickTarget(option.role)">{{ option.caption }}</button>
        }
      </div>
    </ct-color-sliders>
  `,
  host: {
    "class": "block"
  }
})
export class PairSliders {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(contrastEvents);

  /**
   * Which half of the pair the sliders move.
   *
   * The background to begin with, which is the half a palette colour is
   * usually tried as - the text colour then follows from whether it reads on
   * it. A `model()` because `ContrastType` holds the value and a press on a
   * chip moves it too; the default is kept here as well, so the panel still
   * reads as intended when it stands alone, and the host's is the one a screen
   * opens on - change both or neither.
   */
  readonly target = model<ContrastColorRole>("background");

  protected readonly options = TARGET_OPTIONS;

  protected readonly color = computed(() => {
    const pair = this.#stateStore.contrastColors();

    return this.target() === "text" ? pair.text : pair.background;
  });


  protected pickTarget(role: ContrastColorRole): void {
    this.target.set(role);
  }


  protected adjust(color: Color): void {
    if (this.target() === "text") {
      this.#dispatch.textColorAdjusted(color);
    } else {
      this.#dispatch.backgroundColorAdjusted(color);
    }
  }


  /**
   * Ends a gesture on the colour the drag has already put into the store.
   *
   * Taken from the store rather than from the panel, so the value that is
   * persisted is the one the preview has been showing.
   */
  protected commit(): void {
    const {text, background} = this.#stateStore.contrastColors();

    if (this.target() === "text") {
      this.#dispatch.textColorChanged(text);
    } else {
      this.#dispatch.backgroundColorChanged(background);
    }
  }

}
