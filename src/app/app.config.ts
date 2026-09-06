import {ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection} from "@angular/core";
import {provideHttpClient} from "@angular/common/http";
import {provideRouter, withComponentInputBinding} from "@angular/router";

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
    provideRouter(
      routes,
      withComponentInputBinding()
    ),
    provideAppInitializer(initializeApp)
  ]
};
