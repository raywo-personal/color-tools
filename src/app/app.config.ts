import {ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection} from "@angular/core";
import {provideHttpClient} from "@angular/common/http";
import {provideRouter, withComponentInputBinding, withInMemoryScrolling} from "@angular/router";

import {routes} from "./app.routes";
import {injectDispatch} from "@ngrx/signals/events";
import {persistenceEvents} from "@core/common/persistence.events";
import {AppStateStore} from "@core/app-state.store";


function initializeApp(this: void): void {
  inject(AppStateStore);
  injectDispatch(persistenceEvents).loadAppState();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // `GoogleFontsService` reaches the font catalog through `httpResource`,
    // which injects `HttpClient`. Nothing asked for it while the typeahead was
    // gone, so the app ran without the provider.
    provideHttpClient(),
    // Anchor scrolling alone. `scrollPositionRestoration` scrolls on every
    // navigation, and a navigation that only keeps the address in step with
    // the state must leave the page where the visitor has it.
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({anchorScrolling: "enabled"})
    ),
    provideAppInitializer(initializeApp)
  ]
};
