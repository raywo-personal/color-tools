import {Component, computed, inject} from "@angular/core";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {Slider} from "@common/components/slider/slider";
import {FontPicker} from "@common/components/font-picker/font-picker";
import {SelectedFont, weightStopsFor} from "@common/models/google-font.model";
import {
  FONT_SIZE_RANGE,
  LINE_HEIGHT_RANGE,
  TypeSettings
} from "@engine/contrast/type-settings.model";


/**
 * `TYPEFACE`, `SIZE`, `WEIGHT` and `LEADING` - the type the preview is read at.
 *
 * **The three values come straight from the store, without a kept copy.** The
 * color sliders next door need one, because a color cannot hold all three of
 * its axes - at a lightness of 0 every hue is the same black. These three are
 * independent numbers the state holds exactly, so re-reading them loses
 * nothing.
 *
 * **A drag raises `typeSettingsAdjusted`, the end of it
 * `typeSettingsChanged`.** The preview follows every frame; only the value the
 * visitor settles on is written to localStorage - see the events' own comment.
 *
 * **The WEIGHT slider runs over indices, not over weights.** The stops are the
 * weights the chosen family actually ships, and those are not evenly spaced -
 * a family with 400 and 700 and nothing between them cannot be walked by a
 * `step` of 100 without landing on weights the browser would have to
 * synthesise. So the range input counts rows and `aria-valuetext` carries the
 * weight, which is the value a visitor and a screen reader both get.
 */
@Component({
  selector: "ct-type-controls",
  imports: [FontPicker, Slider],
  templateUrl: "./type-controls.html",
  host: {
    "class": "grid gap-4"
  }
})
export class TypeControls {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(commonEvents);

  protected readonly sizeRange = FONT_SIZE_RANGE;
  protected readonly leadingRange = LINE_HEIGHT_RANGE;

  protected readonly settings = this.#stateStore.typeSettings;

  protected readonly selectedFont = this.#stateStore.selectedFont;

  /** In pixels, because APCA is defined on them; see `TypeSettings`. */
  protected readonly sizeText = computed(() => `${this.settings().fontSize}px`);

  protected readonly weightText = computed(() => String(this.settings().fontWeight));

  /** Two decimals, which is what the leading slider's own step resolves to. */
  protected readonly leadingText = computed(() => this.settings().lineHeight.toFixed(2));

  protected readonly weightStops = computed(() => weightStopsFor(this.selectedFont()));

  protected readonly weightMax = computed(() => this.weightStops().length - 1);

  /** A family that ships one weight leaves the slider nothing to move to. */
  protected readonly singleWeight = computed(() => this.weightStops().length === 1);

  /**
   * The row the weight stands on. The store holds a weight the family ships -
   * `fontSelectedReducer` sees to that - so the lookup only misses while a
   * selection is in flight, and the lightest stop is the safe answer.
   */
  protected readonly weightIndex = computed(() => {
    const index = this.weightStops().indexOf(this.settings().fontWeight);

    return index === -1 ? 0 : index;
  });

  /**
   * Why the WEIGHT slider will not move, on the families that ship one weight.
   * Empty otherwise, which leaves the slider without a description.
   */
  protected readonly weightNote = computed(() => {
    if (!this.singleWeight()) return "";

    const family = this.selectedFont()?.family ?? "This typeface";

    return `${family} ships one weight, so there is nothing to move between.`;
  });


  protected fontPicked(font: SelectedFont | null): void {
    this.#dispatch.fontSelected(font);
  }


  protected sizeChanged(fontSize: number): void {
    this.#adjust({...this.settings(), fontSize});
  }


  protected weightChanged(index: number): void {
    const fontWeight = this.weightStops()[index];

    if (fontWeight === undefined) return;

    this.#adjust({...this.settings(), fontWeight});
  }


  protected leadingChanged(lineHeight: number): void {
    this.#adjust({...this.settings(), lineHeight});
  }


  /**
   * Ends a gesture on the settings the drag has already put into the store,
   * rather than on the slider's own value: what is persisted is then the
   * normalized triple the preview has been showing.
   */
  protected commit(): void {
    this.#dispatch.typeSettingsChanged(this.settings());
  }


  #adjust(settings: TypeSettings): void {
    this.#dispatch.typeSettingsAdjusted(settings);
  }

}
