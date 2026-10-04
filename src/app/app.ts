import {Component, computed, inject} from "@angular/core";
import {ActivatedRouteSnapshot, Router, RouterOutlet} from "@angular/router";
import {AppHeader} from "@shell/components/app-header/app-header";
import {CopyConfirmation} from "@shell/components/copy-confirmation/copy-confirmation";


@Component({
  selector: "ct-root",
  imports: [RouterOutlet, AppHeader, CopyConfirmation],
  templateUrl: "./app.html",
  styles: ""
})
export class App {

  readonly #router = inject(Router);

  /**
   * A screen opts out of the app header with `data: {appHeader: false}`.
   * `routerState` is not a signal, so the completed navigation is what makes
   * the snapshot readable again.
   */
  protected readonly showsAppHeader = computed(() => {
    this.#router.lastSuccessfulNavigation();

    return this.activatedRoute().data["appHeader"] !== false;
  });


  private activatedRoute(): ActivatedRouteSnapshot {
    let route = this.#router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;

    return route;
  }

}
