import {Component, inject, OnDestroy, OnInit, signal} from "@angular/core";
import {ColorThemeSwitcher} from "@header/components/color-theme-switcher/color-theme-switcher";
import {EventType, Router, RouterLink, RouterLinkActive} from "@angular/router";
import {filter, map, Subscription} from "rxjs";
import {NewClickSource, routePathToSource} from "@common/models/new-click-source.model";
import {injectDispatch} from "@ngrx/signals/events";
import {converterEvents} from "@core/converter/converter.events";
import {AppStateStore} from "@core/app-state.store";
import {palettesEvents} from "@core/palettes/palettes.events";
import {contrastEvents} from "@core/contrast/contrast.events";


@Component({
  selector: "nav[app-top-bar]",
  imports: [
    ColorThemeSwitcher,
    RouterLinkActive,
    RouterLink
  ],
  templateUrl: "./top-bar.html",
  styles: ``,
  host: {
    "class": "navbar navbar-expand"
  }
})
export class TopBar implements OnInit, OnDestroy {

  readonly #router = inject(Router);
  readonly #converterDispatch = injectDispatch(converterEvents);
  readonly #palettesDispatch = injectDispatch(palettesEvents);
  readonly #contrastDispatch = injectDispatch(contrastEvents);
  readonly #store = inject(AppStateStore);

  #subscription?: Subscription;
  #newClickSource: NewClickSource = "convert";

  protected readonly triggerNewCaption = signal("New random color");
  protected readonly currentPalette = this.#store.currentPalette;


  public ngOnInit() {
    this.#subscription = this.#router.events
      .pipe(
        filter(event => event.type === EventType.NavigationEnd),
        map(event => event.urlAfterRedirects)
      )
      .subscribe(path => {
        this.#newClickSource = routePathToSource(path);

        if (this.#newClickSource === "palettes") {
          this.triggerNewCaption.set("New palette");
          return;
        }

        this.triggerNewCaption.set("New color");
      });
  }


  public ngOnDestroy() {
    this.#subscription?.unsubscribe();
  }


  protected triggerNew() {
    switch (this.#newClickSource) {
      case "palettes":
        this.#palettesDispatch.newPalette();
        return;
      case "convert":
        this.#converterDispatch.newRandomColor();
        return;
      case "contrast":
        this.#contrastDispatch.newRandomColors();
        return;
    }
  }


}
