import {Component, inject} from "@angular/core";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {palettesEvents} from "@core/palettes/palettes.events";
import {PaletteStyle, PaletteStyles, styleCaptionFor} from "@palettes/models/palette-style.model";


interface StyleOption {
  readonly style: PaletteStyle;
  readonly caption: string;
}


const STYLE_OPTIONS: readonly StyleOption[] = PaletteStyles
  .map(style => ({style, caption: styleCaptionFor(style)}));


/**
 * One chip per palette style; the pressed one is the palette on screen.
 *
 * A wrapping row, not a tab bar: the draft draws six chips and the app has
 * ten, so in the narrow column they take as many rows as they need rather than
 * shrinking below their hit area.
 *
 * Picking a chip sets the style and rolls a palette in it - the pressed chip
 * included, which is how a palette is rolled again at the same style until the
 * regenerate control finds its place. The pressed state comes from the store,
 * so a palette restored from storage presses the chip it was built with.
 */
@Component({
  selector: "ct-style-picker",
  template: `
    @for (option of options; track option.style) {
      <!-- aria-pressed, not colour alone: the inverted chip is the only thing
           telling a visitor which style the five swatches follow. -->
      <button type="button"
              class="h-11 cursor-pointer rounded-xs border px-3 font-mono text-base tracking-wide focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
              [class.border-text]="selected() === option.style"
              [class.bg-text]="selected() === option.style"
              [class.text-bg]="selected() === option.style"
              [class.border-line]="selected() !== option.style"
              [class.text-text]="selected() !== option.style"
              [attr.aria-pressed]="selected() === option.style"
              (click)="pick(option.style)">{{ option.caption }}</button>
    }
  `,
  host: {
    "class": "flex flex-wrap gap-2",
    "role": "group",
    "aria-label": "Palette style"
  }
})
export class StylePicker {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(palettesEvents);

  protected readonly options = STYLE_OPTIONS;
  protected readonly selected = this.#stateStore.paletteStyle;


  protected pick(style: PaletteStyle): void {
    this.#dispatch.styleChanged(style);
  }

}
