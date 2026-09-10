import {Component, computed, inject, input} from "@angular/core";
import {Color} from "chroma-js";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {contrastEvents} from "@core/contrast/contrast.events";
import {ContrastColorRole} from "@engine/contrast/contrast-color.model";
import {ColorSliders} from "@common/components/color-sliders/color-sliders";


/**
 * The Studio's slider panel, on the half of the pair the chips are aimed at.
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
 * **The target is the chip row's, handed down rather than chosen again.**
 * `APPLY TO: TEXT / BACKGROUND` already stands above the chips and `ContrastType`
 * owns it; a selector of its own here would be a second display of one mode,
 * which is what `PaletteChips`' own comment argues against.
 *
 * **The target goes in beside the colour, as the panel's subject.** The panel
 * keeps the slider values a colour cannot hold and gives them up on a colour it
 * did not itself produce - a comparison in three bytes, which two halves of a
 * pair that coincide pass. Aiming at the other half then has to say so, or the
 * tracks stand at the hue of the half no longer being edited.
 *
 * **The caption names the target, and that is what pays for the mode.** The
 * sliders name their axes - `HUE`, `SATURATION` - and never their subject, so
 * without it the panel would be silent about which half it moves for anyone who
 * has scrolled past the chip row. A switch of target is not announced for the
 * same reason it is not announced for the chips: the button that switched it
 * carries its own name and `aria-pressed`, and the visitor is standing on it.
 *
 * A drag is not announced either - the visitor is holding the control that
 * causes it, exactly as in the Studio.
 */
@Component({
  selector: "ct-pair-sliders",
  imports: [ColorSliders],
  template: `
    <ct-color-sliders [color]="color()"
                      [subject]="target()"
                      [caption]="caption()"
                      (colorAdjusted)="adjust($event)"
                      (commit)="commit()"/>
  `,
  host: {
    "class": "block"
  }
})
export class PairSliders {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(contrastEvents);

  /** Which half of the pair the sliders move - the chip row's own target. */
  readonly target = input.required<ContrastColorRole>();

  protected readonly color = computed(() => {
    const pair = this.#stateStore.contrastColors();

    return this.target() === "text" ? pair.text : pair.background;
  });

  protected readonly caption = computed(() =>
    this.target() === "text" ? "ADJUST TEXT" : "ADJUST BACKGROUND");


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
