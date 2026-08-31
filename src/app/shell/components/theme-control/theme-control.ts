import {Component, inject} from "@angular/core";
import {ColorTheme} from "@common/models/color-theme.model";
import {injectDispatch} from "@ngrx/signals/events";
import {commonEvents} from "@core/common/common.events";
import {AppStateStore} from "@core/app-state.store";


interface ThemeOption {
  readonly value: ColorTheme;
  readonly label: string;
}


/**
 * The draft's header carries a single button that toggles between light and
 * dark. The app knows a third state, so the control shows all three: a toggle
 * would either drop "system" or hide it behind a cycle nobody discovers.
 */
const THEME_OPTIONS: readonly ThemeOption[] = [
  {value: "system", label: "AUTO"},
  {value: "light", label: "LIGHT"},
  {value: "dark", label: "DARK"}
];


@Component({
  selector: "ct-theme-control",
  template: `
    @for (option of options; track option.value) {
      <button type="button"
              class="h-11 cursor-pointer px-5 font-mono text-base tracking-widest"
              [class.bg-text]="currentTheme() === option.value"
              [class.text-bg]="currentTheme() === option.value"
              [class.text-dim]="currentTheme() !== option.value"
              [attr.aria-pressed]="currentTheme() === option.value"
              (click)="onThemeSelect(option.value)">{{ option.label }}</button>
    }
  `,
  host: {
    "class": "flex overflow-hidden rounded-xs border border-line",
    "role": "group",
    "aria-label": "Color theme"
  }
})
export class ThemeControl {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(commonEvents);

  protected readonly options = THEME_OPTIONS;
  protected readonly currentTheme = this.#stateStore.colorTheme;


  protected onThemeSelect(colorTheme: ColorTheme) {
    this.#dispatch.colorThemeChanged(colorTheme);
  }

}
