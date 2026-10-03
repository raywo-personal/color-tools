import {EventInstance, Events} from "@ngrx/signals/events";
import {commonEvents} from "./common.events";
import {persistenceEvents} from "./persistence.events";
import {filter, map, Observable, switchMap, take, tap} from "rxjs";
import {computed, Injector, Signal} from "@angular/core";
import {toObservable} from "@angular/core/rxjs-interop";
import {AnnouncementService} from "@common/services/announcement.service";
import {ColorThemeService} from "@common/services/color-theme.service";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";
import {GoogleFontsService} from "@common/services/google-fonts.service";
import {fontsOf, RoleFont, TypeRolesMap, weightStopsForRole} from "@common/models/type-role-settings.model";
import {GoogleFont, GoogleFontsApiResponse, getRegularFont, needsCatalogue} from "@common/models/google-font.model";
import {TYPE_ROLES, typeRoleName} from "@engine/contrast/type-role.model";
import {contrastEvents} from "@core/contrast/contrast.events";
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
 * state, and so does a restore from the address - and without this leg the preview would set a `font-family` whose
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
    .on(
      commonEvents.fontSelected,
      commonEvents.fontsResolved,
      contrastEvents.restoreContrastType,
      persistenceEvents.loadAppState
    )
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


/**
 * Completes the faces that stand by name alone - after a reload and after a
 * restore from the address, which carry a family's name and nothing else.
 *
 * Without it a restored face keeps no weights: the loader asks Google for the
 * family's default weight alone, and a role the sender set at 700 is drawn
 * in the browser's synthesised bold.
 *
 * The catalogue is asked for only when a face needs it, through the
 * injector: `GoogleFontsService` requests it the moment it is created, and a
 * visitor on the app's own type has no use for it. The roles are read again
 * once it arrives, so a face picked in the meantime is not overwritten. A
 * catalogue that never answers leaves the faces as they are.
 *
 * **`error()` is asked before `value()`.** A failed `httpResource` throws on
 * `value()`, and every effect of the store runs in one subscription: an error
 * here would stop the persistence, the font loading and the announcements
 * with it. A retry that succeeds still completes the faces.
 */
export function resolveFontsEffect(
  this: void,
  events: Events,
  injector: Injector,
  store: unknown
): Observable<EventInstance<"[Common] fontsResolved", readonly RoleFont[]>> {
  // Annotated: inferred, the type runs through the store and back into it.
  const typedStore = store as AppStateStore;

  return events
    .on(persistenceEvents.loadAppState, contrastEvents.restoreContrastType)
    .pipe(
      filter(() => unresolvedRoles(typedStore.typeRoles()).length > 0),
      switchMap(() => toObservable(answeredCatalogue(injector.get(GoogleFontsService)), {injector})
        .pipe(
          filter(catalogue => catalogue !== undefined),
          take(1),
          map(catalogue => resolvedFonts(typedStore.typeRoles(), catalogue.items)),
          filter(fonts => fonts.length > 0),
          map(fonts => commonEvents.fontsResolved(fonts))
        ))
    );
}


/** The catalogue once it has arrived; undefined while loading or failed. */
function answeredCatalogue(fonts: GoogleFontsService): Signal<GoogleFontsApiResponse | undefined> {
  return computed(() => fonts.googleFonts.error() === undefined ? fonts.googleFonts.value() : undefined);
}


function unresolvedRoles(roles: TypeRolesMap) {
  return TYPE_ROLES.filter(role => needsCatalogue(roles[role].font));
}


/**
 * Each face that stands by name, as the catalogue lists it - or null where
 * the catalogue carries no such family: Google would not serve it, and a
 * summary naming a face the preview cannot show says something untrue.
 */
function resolvedFonts(roles: TypeRolesMap, catalogue: readonly GoogleFont[]): RoleFont[] {
  return unresolvedRoles(roles).map(role => {
    const family = roles[role].font?.family;
    const listed = catalogue.find(font => font.family === family);

    return {role, font: listed ? getRegularFont(listed) : null};
  });
}
