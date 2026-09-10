import {Component, inject} from "@angular/core";
import {Color} from "chroma-js";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {Swatch} from "@studio/components/swatch/swatch";
import {ColorControls} from "@studio/components/color-controls/color-controls";
import {ConversionList} from "@studio/components/conversion-list/conversion-list";
import {ColorSliders} from "@common/components/color-sliders/color-sliders";
import {StylePicker} from "@studio/components/style-picker/style-picker";
import {PaletteSwatches} from "@studio/components/palette-swatches/palette-swatches";
import {TintShadeRamps} from "@studio/components/tint-shade-ramps/tint-shade-ramps";
import {ExportPanel} from "@studio/components/export-panel/export-panel";


/**
 * The Studio grid.
 *
 * The draft's two columns are the **wide** layout and arrive with `lg:`.
 * Unprefixed the screen is one stack, so the narrow column is what the markup
 * describes and the breakpoint widens it.
 *
 * The left column is wider than the draft's 240 to 300 pixels, because the
 * conversion list decides its width: the longest value, an OKLch triple, needs
 * a good 18rem next to its label, and at the draft's upper bound it wrapped
 * onto a second line at every window size. The right column keeps its own
 * minimum, so both still fit at the breakpoint.
 *
 * The minimum is what the list needs. The maximum is proportion rather than
 * need - it sets how the two columns sit against each other at the cap - so a
 * change to it is a change to the palette's tiles, which take what it leaves,
 * and to the swatch's proportion, whose height answers this width.
 *
 * **Both columns stop and the grid centres what is left.** The shell puts no
 * cap on its width, and this column holds tiles that stretch rather than
 * reflow: the palette's five swatches and each ramp's eleven steps are
 * `w-full` at a fixed height, so every rem the column gains goes into their
 * width alone. At the cap a swatch sits a little wider than tall; past it a
 * swatch reads as a band and a ramp step as a stripe. Do not lift the cap to
 * fill a wide screen - the margin `mx-auto` leaves costs nothing, and this
 * column is controls, which do not read better wider.
 *
 * **The sliders are wired here, because the panel is host-agnostic.**
 * `ColorSliders` takes a colour and hands back the two ends of a gesture; the
 * Studio's colour is the base colour and its events are the converter's, and
 * Contrast & Type answers the same panel with the contrast domain's. That is
 * the whole of what this component does besides the grid.
 */
@Component({
  selector: "ct-studio",
  imports: [Swatch, ColorControls, ConversionList, ColorSliders, StylePicker, PaletteSwatches, TintShadeRamps, ExportPanel],
  templateUrl: "./studio.html",
  host: {
    "class": "grid gap-8 lg:mx-auto lg:max-w-[76rem] lg:grid-cols-[minmax(17rem,24rem)_minmax(22.5rem,1fr)] lg:items-start lg:gap-13"
  }
})
export class Studio {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(converterEvents);

  protected readonly currentColor = this.#stateStore.currentColor;


  protected adjustColor(color: Color): void {
    this.#dispatch.colorAdjusted(color);
  }


  /**
   * Ends a gesture on the color the drag has already put into the store.
   *
   * Taken from the store rather than from the panel, so the value that is
   * persisted is the one the rest of the app has been showing.
   */
  protected commitColor(): void {
    this.#dispatch.colorChanged(this.#stateStore.currentColor());
  }

}
