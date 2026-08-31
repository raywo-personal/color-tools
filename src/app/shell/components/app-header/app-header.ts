import {Component, inject} from "@angular/core";
import {isActive, Router, RouterLink} from "@angular/router";
import {ThemeControl} from "@shell/components/theme-control/theme-control";


@Component({
  selector: "header[ct-app-header]",
  imports: [RouterLink, ThemeControl],
  templateUrl: "./app-header.html",
  host: {
    "class": "flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-7 sm:pb-8"
  }
})
export class AppHeader {

  readonly #router = inject(Router);

  /**
   * `paths: "exact"` because the start page is the empty path: with the
   * default "subset" every url would activate the studio tab.
   */
  protected readonly studioActive = isActive("/", this.#router, {paths: "exact"});
  protected readonly contrastActive = isActive("/contrast", this.#router);

}
