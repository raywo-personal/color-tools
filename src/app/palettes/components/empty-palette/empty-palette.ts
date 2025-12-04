import {Component, OnInit} from '@angular/core';
import {injectDispatch} from "@ngrx/signals/events";
import {palettesEvents} from "@core/palettes/palettes.events";


@Component({
  selector: 'ct-empty-palette',
  imports: [],
  template: ``,
  styles: ``,
})
export class EmptyPalette implements OnInit {

  readonly #dispatch = injectDispatch(palettesEvents);


  public ngOnInit(): void {
    this.#dispatch.newRandomPalette();
  }

}
