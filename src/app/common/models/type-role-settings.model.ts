import {SelectedFont, weightStopsFor} from "@common/models/google-font.model";
import {DEFAULT_TYPE_SETTINGS_BY_ROLE, TYPE_ROLES, TypeRole} from "@engine/contrast/type-role.model";
import {TypeSettings, WEIGHT_STOPS} from "@engine/contrast/type-settings.model";


/**
 * One type role as the state holds it: the face it is set in, or null for
 * the app's own type, and the size, weight and leading it is read at.
 *
 * The face is per role rather than one selection for the whole preview
 * because the roles are what a visitor tells apart on the page - a serif
 * headline over sans running text is the ordinary case, not the exception.
 */
export interface TypeRoleSettings {

  readonly font: SelectedFont | null;
  readonly settings: TypeSettings;

}


export type TypeRolesMap = Readonly<Record<TypeRole, TypeRoleSettings>>;


/** A role's face, as `commonEvents.fontSelected` carries it. */
export interface RoleFont {

  readonly role: TypeRole;
  readonly font: SelectedFont | null;

}


/** A role's size, weight and leading, as the type settings events carry them. */
export interface RoleTypeSettings {

  readonly role: TypeRole;
  readonly settings: TypeSettings;

}


/**
 * The app's own type: what a role falls back to while nothing is chosen for
 * it, and how the summary line names it.
 *
 * `family` is a copy of the first name in the stylesheet's `--font-sans` or
 * `--font-mono`, and `weights` a copy of the weights `src/index.html` loads
 * for that family. No compiler compares either against its source;
 * `type-role-settings.model.spec.ts` reads both files and pins the copies -
 * a WEIGHT slider standing on a weight the head never loaded would rate a
 * faux-bold, which is the very thing the stops exist to prevent.
 */
export interface AppType {

  /** The family name, for a sentence or a summary line. */
  readonly family: string;
  /** The `font-family` value the preview sets, through the stylesheet's token. */
  readonly fontFamily: string;
  /** The upright weights the head loads for it, inside the WEIGHT range. */
  readonly weights: readonly number[];

}


export const APP_TYPE_FAMILY = "IBM Plex Sans";

const APP_SANS: AppType = {
  family: APP_TYPE_FAMILY,
  fontFamily: "var(--font-sans)",
  weights: WEIGHT_STOPS
};

const APP_MONO: AppType = {
  family: "IBM Plex Mono",
  fontFamily: "var(--font-mono)",
  weights: [400, 500]
};


/** Every role but mono falls back to the sans, as the preview always has. */
export function appTypeFor(role: TypeRole): AppType {
  return role === "mono" ? APP_MONO : APP_SANS;
}


/** What the state opens on: every role in the app's own type, at its defaults. */
export const DEFAULT_TYPE_ROLES: TypeRolesMap = Object.fromEntries(
  TYPE_ROLES.map(role => [role, {font: null, settings: DEFAULT_TYPE_SETTINGS_BY_ROLE[role]}])
) as Record<TypeRole, TypeRoleSettings>;


/** The `font-family` value a role's text is set in. */
export function fontFamilyFor(role: TypeRole, font: SelectedFont | null): string {
  return font ? `"${font.family}", ${font.category}` : appTypeFor(role).fontFamily;
}


/** The family a role is set in, by name. */
export function familyNameFor(role: TypeRole, font: SelectedFont | null): string {
  return font?.family ?? appTypeFor(role).family;
}


/**
 * The weights a role's WEIGHT slider can stand on: the chosen family's, or the
 * app's own type's for that role.
 */
export function weightStopsForRole(role: TypeRole, font: SelectedFont | null): readonly number[] {
  return weightStopsFor(font, appTypeFor(role).weights);
}


/** The faces the roles are set in, in role order, nulls included. */
export function fontsOf(roles: TypeRolesMap): readonly (SelectedFont | null)[] {
  return TYPE_ROLES.map(role => roles[role].font);
}
