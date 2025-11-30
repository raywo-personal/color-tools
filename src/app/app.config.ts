import {ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection} from '@angular/core';
import {provideRouter, withComponentInputBinding} from '@angular/router';

import {routes} from './app.routes';
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
    provideRouter(
      routes,
      withComponentInputBinding()
    ),
    provideAppInitializer(initializeApp)
  ]
};
