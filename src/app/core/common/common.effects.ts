import {Events} from "@ngrx/signals/events";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {commonEvents} from "./common.events";
import {tap} from "rxjs";
import {ColorThemeService} from "@common/services/color-theme.service";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";
import {weightStopsFor} from "@common/models/google-font.model";
import {AppStateStore} from "../app-state.store";


export function colorThemeChangeEffect(
  this: void,
  events: Events,
  themeService: ColorThemeService
) {
  return events
    .on(commonEvents.colorThemeChanged)
    .pipe(
      tap(event => {
        themeService.colorTheme = event.payload
      })
    );
}


export function fontSelectedEffect(
  this: void,
  events: Events,
  fontLoaderService: GoogleFontLoaderService
) {
  return events
    .on(commonEvents.fontSelected)
    .pipe(
      tap(event => {
        const font = event.payload;
        fontLoaderService.loadFont(font);
        fontLoaderService.setFontFamily(font);
      })
    );
}


/**
 * Announces the typeface a visitor picked, and the weight it left them on.
 *
 * The weight is in the sentence because picking a family can move it: the
 * state only ever holds a weight the family ships, so choosing one that stops
 * at 400 and 700 takes a visitor standing on 500 down to 400 - a control on
 * the other side of the column changing without focus going near it, and the
 * rating above it answering a different question afterwards.
 *
 * Polite, and an effect rather than the picker: the visitor pressed the option
 * and is still standing on the field, and the announcement belongs to the
 * event rather than to one caller of it. The reducer has run by the time an
 * effect sees the event, so the store already holds the snapped weight.
 */
export function fontAnnouncedEffect(
  this: void,
  events: Events,
  announcer: LiveAnnouncer,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(commonEvents.fontSelected)
    .pipe(
      tap(event => {
        const font = event.payload;

        if (!font) {
          void announcer.announce(
            "Typeface cleared. The preview is set in the app's own type.",
            "polite"
          );

          return;
        }

        const {fontWeight} = typedStore.typeSettings();
        const only = weightStopsFor(font).length === 1 ? ", the only weight it ships" : "";

        void announcer.announce(
          `${font.family}, weight ${fontWeight}${only}`,
          "polite"
        );
      })
    );
}
