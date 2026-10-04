import {Component, computed, inject} from "@angular/core";
import {isActive, PRIMARY_OUTLET, Router, RouterLink} from "@angular/router";
import {ThemeControl} from "@shell/components/theme-control/theme-control";
import {isStudioPath} from "@studio/models/studio-address.model";


@Component({
  selector: "header[ct-app-header]",
  imports: [RouterLink, ThemeControl],
  templateUrl: "./app-header.html",
  host: {
    // The gap under the rule is the narrow layout's at every width. Widening
    // it was room the wide screens had to spare while the shell was capped;
    // uncapped, the screens spend their height on the columns instead, and on
    // a laptop those eight pixels either side of the rule were the difference
    // between the third slider standing above the fold and under it.
    "class": "flex flex-col gap-4 border-b border-line pb-6 mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-7"
  }
})
export class AppHeader {

  readonly #router = inject(Router);

  /**
   * By the path's shape, as the Studio's route matches it: `isActive("/")`
   * cannot tell `/<palette segment>` from any other one-segment path, exact
   * or not. `router.url` is not a signal, so the completed navigation is what
   * makes it readable again.
   */
  protected readonly studioActive = computed(() => {
    this.#router.lastSuccessfulNavigation();

    const segments = this.#router.parseUrl(this.#router.url).root.children[PRIMARY_OUTLET]?.segments ?? [];

    return isStudioPath(segments.map(segment => segment.path));
  });

  protected readonly contrastActive = isActive("/contrast", this.#router);

}
