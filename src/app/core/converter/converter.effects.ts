import {Events} from "@ngrx/signals/events";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {ColorThemeService} from "@common/services/color-theme.service";
import {colorName} from "@engine/color/color-name.helper";
import {tap} from "rxjs";
import {converterEvents} from "./converter.events";
import {AppStateStore} from "../app-state.store";


/**
 * Keeps the page background on the color while the visitor is still moving it.
 *
 * `colorAdjusted` is listened for beside `colorChanged` so a slider drag paints
 * the background per frame rather than jumping to its final value on release.
 */
export function colorChangedEffect(
  this: void,
  events: Events,
  colorThemeService: ColorThemeService,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(
      converterEvents.colorChanged,
      converterEvents.colorAdjusted,
      converterEvents.newRandomColorWithNav
    )
    .pipe(
      tap(() => {
        const color = typedStore.currentColor();
        const useBackground = typedStore.useAsBackground();

        if (useBackground) {
          colorThemeService.setBackgroundColor(color);
        } else {
          colorThemeService.resetBackgroundColor();
        }
      })
    );
}

export function useAsBackgroundChangedEffect(
  this: void,
  events: Events,
  colorThemeService: ColorThemeService,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(converterEvents.useAsBackgroundChanged)
    .pipe(
      tap(event => {
        if (event.payload) {
          colorThemeService.setBackgroundColor(typedStore.currentColor());
        } else {
          colorThemeService.resetBackgroundColor();
        }
      })
    );
}


/**
 * Announces the color a roll of `RND` produced.
 *
 * A roll replaces the swatch and the whole conversion list without moving
 * focus, so nothing would tell a screen reader that anything happened. Typing
 * into the field or dragging the picker needs no announcement: the visitor set
 * that value and the control they are in already carries it.
 *
 * It sits in an effect rather than in the button, so the announcement travels
 * with the event and not with one caller of it. The reducer has run by the
 * time an effect sees the event, so the store already holds the new color.
 */
export function randomColorAnnouncedEffect(
  this: void,
  events: Events,
  announcer: LiveAnnouncer,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(converterEvents.newRandomColorWithNav)
    .pipe(
      tap(() => {
        void announcer.announce(
          `New color ${colorName(typedStore.currentColor())}`,
          "polite"
        );
      })
    );
}
