import {Component, computed, inject} from "@angular/core";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {Slider} from "@common/components/slider/slider";
import {
  FONT_SIZE_RANGE,
  FONT_WEIGHT_RANGE,
  LINE_HEIGHT_RANGE,
  TypeSettings
} from "@engine/contrast/type-settings.model";


/**
 * `SIZE`, `WEIGHT` and `LEADING` - the type the preview is read at.
 *
 * The draft's `TYPEFACE` select is not here: the catalog has over a thousand
 * families, so the control is a search rather than a select, and it is its own
 * slice. Until then the preview runs on the app's own stack.
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
 */
@Component({
  selector: "ct-type-controls",
  imports: [Slider],
  templateUrl: "./type-controls.html",
  host: {
    "class": "grid gap-4"
  }
})
export class TypeControls {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(commonEvents);

  protected readonly sizeRange = FONT_SIZE_RANGE;
  protected readonly weightRange = FONT_WEIGHT_RANGE;
  protected readonly leadingRange = LINE_HEIGHT_RANGE;

  protected readonly settings = this.#stateStore.typeSettings;

  /** In pixels, because APCA is defined on them; see `TypeSettings`. */
  protected readonly sizeText = computed(() => `${this.settings().fontSize}px`);

  protected readonly weightText = computed(() => String(this.settings().fontWeight));

  /** Two decimals, which is what the leading slider's own step resolves to. */
  protected readonly leadingText = computed(() => this.settings().lineHeight.toFixed(2));


  protected sizeChanged(fontSize: number): void {
    this.#adjust({...this.settings(), fontSize});
  }


  protected weightChanged(fontWeight: number): void {
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
