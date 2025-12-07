import {Component, inject} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {FormsModule} from "@angular/forms";


@Component({
  selector: "div[ct-color-inputs]",
  imports: [
    FormsModule
  ],
  templateUrl: "./color-inputs.html",
  styles: ``,
  host: {
    class: "color-inputs"
  }
})
export class ColorInputs {

  readonly #stateStore = inject(AppStateStore);

  protected readonly textColor = this.#stateStore.contrastTextColor;
  protected readonly bgColor = this.#stateStore.contrastBgColor;

}
