import {Component, inject} from '@angular/core';
import {NgbDropdown, NgbDropdownItem, NgbDropdownMenu, NgbDropdownToggle} from '@ng-bootstrap/ng-bootstrap';
import {ColorTheme} from '@common/models/color-theme.model';
import {injectDispatch} from "@ngrx/signals/events";
import {commonEvents} from "@core/common/common.events";
import {AppStateStore} from "@core/app-state.store";


@Component({
  selector: 'ct-color-mode-switcher',
  imports: [
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem
  ],
  templateUrl: './color-theme-switcher.html',
  styles: ``
})
export class ColorThemeSwitcher {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(commonEvents);

  protected currentTheme = this.#stateStore.colorTheme;


  protected onThemeSelect(colorTheme: ColorTheme) {
    this.#dispatch.colorThemeChanged(colorTheme);
  }

}
