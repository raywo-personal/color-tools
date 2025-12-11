import {Component, OnInit} from "@angular/core";
import {injectDispatch} from "@ngrx/signals/events";
import {contrastEvents} from "@core/contrast/contrast.events";


@Component({
  selector: "ct-empty-contrast",
  imports: [],
  template: ``,
  styles: ``,
})
export class EmptyContrast implements OnInit {

  readonly #dispatch = injectDispatch(contrastEvents);


  public ngOnInit(): void {
    this.#dispatch.newRandomColors();
  }

}
