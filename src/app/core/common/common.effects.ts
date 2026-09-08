import {Events} from "@ngrx/signals/events";
import {commonEvents} from "./common.events";
import {persistenceEvents} from "./persistence.events";
import {tap} from "rxjs";
import {AnnouncementService} from "@common/services/announcement.service";
import {ColorThemeService} from "@common/services/color-theme.service";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";
import {fontsOf, weightStopsForRole} from "@common/models/type-role-settings.model";
import {typeRoleName} from "@engine/contrast/type-role.model";
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


/**
 * Puts the faces the roles are set in into the head - after a pick, and after
 * a reload.
 *
 * Both events in one effect, because the work is the same: read every role's
 * face from the store and hand the set to the loader, which adds what is
 * missing and removes what no role reads. On a reload nothing raises
 * `fontSelected` - `loadAppStateReducer` writes the faces straight into the
 * state - and without this leg the preview would set a `font-family` whose
 * stylesheet is not in the head, so the visitor reads a generic fallback and
 * the rating beside it answers about a face nobody is looking at.
 *
 * An effect rather than a call inside a reducer: the reducers are what the
 * specs call directly, and a loader in one would put a Google Fonts request
 * into every one of those runs. The reducer has run by the time an effect
 * sees the event, so the store already holds the faces.
 *
 * `setFontFamily()` still publishes body text's face as a custom property;
 * the v1 contrast screen reads it and nothing else does.
 */
export function loadFontsEffect(
  this: void,
  events: Events,
  fontLoaderService: GoogleFontLoaderService,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(commonEvents.fontSelected, persistenceEvents.loadAppState)
    .pipe(
      tap(() => {
        const roles = typedStore.typeRoles();

        fontLoaderService.loadFonts(fontsOf(roles));
        fontLoaderService.setFontFamily(roles.body.font);
      })
    );
}


/**
 * Announces the typeface a visitor picked for a role, and the weight it left
 * them on.
 *
 * The weight is in the sentence because picking a family can move it: the
 * state only ever holds a weight the family ships, so choosing one that stops
 * at 400 and 700 takes a visitor standing on 500 down to 400 - a control on
 * the other side of the column changing without focus going near it, and the
 * rating above it answering a different question afterwards. The role is in
 * it because one picker serves four, and the field alone does not say which
 * one it just set.
 *
 * Polite, and an effect rather than the picker: the visitor pressed the option
 * and is still standing on the field, and the announcement belongs to the
 * event rather than to one caller of it. The reducer has run by the time an
 * effect sees the event, so the store already holds the snapped weight.
 *
 * Through `AnnouncementService`: a face changes every element's size, so the
 * page's tally moves on the very same event and the two sentences would
 * otherwise cancel - the picker's field is right beside the tally on the
 * contrast screen, which is where a visitor meets this.
 */
export function fontAnnouncedEffect(
  this: void,
  events: Events,
  announcements: AnnouncementService,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(commonEvents.fontSelected)
    .pipe(
      tap(event => {
        const {role, font} = event.payload;
        const name = typeRoleName(role);

        if (!font) {
          announcements.announce(`${name} set in the app's own type again.`);

          return;
        }

        const {fontWeight} = typedStore.typeRoles()[role].settings;
        const only = weightStopsForRole(role, font).length === 1 ? ", the only weight it ships" : "";

        announcements.announce(`${name} set in ${font.family}, weight ${fontWeight}${only}`);
      })
    );
}
