import {Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {colorFrom} from '@common/helpers/color-format-parser.helper';
import {Subscription} from 'rxjs';
import {Events, injectDispatch} from "@ngrx/signals/events";
import {converterEvents} from "@core/converter/converter.events";


@Component({
  selector: 'ct-paste-target',
  imports: [
    FormsModule
  ],
  templateUrl: './paste-target.html',
  styles: ``,
})
export class PasteTarget implements OnInit, OnDestroy {

  readonly #dispatch = injectDispatch(converterEvents);
  readonly #events = inject(Events);

  #subscription?: Subscription;

  protected readonly pastedColor = signal<string | null>(null);


  public ngOnInit(): void {
    this.#subscription = this.#events
      .on(converterEvents.colorChanged)
      .subscribe(() => this.pastedColor.set(null))
  }


  public ngOnDestroy(): void {
    this.#subscription?.unsubscribe();
  }


  protected colorChanged(value: string) {
    const color = colorFrom(value);

    if (color) {
      this.#dispatch.colorChanged(color);
    }
  }
}
