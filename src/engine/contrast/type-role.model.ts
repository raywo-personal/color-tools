import {
  DEFAULT_TYPE_SETTINGS,
  FONT_SIZE_RANGE,
  normalizedTypeSettings,
  TypeSettingRange,
  TypeSettings,
  WEIGHT_STOPS
} from "@engine/contrast/type-settings.model";


/**
 * The four kinds of type the website preview sets, in the order the segments
 * show them.
 *
 * `display` is the headline; `body` the lead, the running text, the quote and
 * the small print; `mono` the eyebrow and the card label; `ui` the buttons and
 * the nav items - text that is neither body nor mono, usually smaller and
 * heavier, and judged at its own size. Which preview element belongs to which
 * role is `roleOf()` in `sample-page.model.ts`, in one place because the
 * verdicts read it too.
 */
export const TYPE_ROLES = ["display", "body", "mono", "ui"] as const;

export type TypeRole = typeof TYPE_ROLES[number];


/** The all-caps caption a segment and a summary line carry. */
const CAPTIONS: Record<TypeRole, string> = {
  display: "DISPLAY",
  body: "BODY",
  mono: "MONO",
  ui: "UI"
};

/** The role in a sentence, where all caps would be spelled out letter by letter. */
const NAMES: Record<TypeRole, string> = {
  display: "Display",
  body: "Body",
  mono: "Mono",
  ui: "UI"
};


export function typeRoleCaption(role: TypeRole): string {
  return CAPTIONS[role];
}


export function typeRoleName(role: TypeRole): string {
  return NAMES[role];
}


/**
 * A display line is set well above what body text ever is, so it moves over
 * its own range: 24px is where `apcaLookup` starts treating text as large,
 * 96px is the last row it has.
 */
export const DISPLAY_FONT_SIZE_RANGE: TypeSettingRange = {min: 24, max: 96, step: 1};


export function fontSizeRangeFor(role: TypeRole): TypeSettingRange {
  return role === "display" ? DISPLAY_FONT_SIZE_RANGE : FONT_SIZE_RANGE;
}


/**
 * What each role opens on. The display and UI values are the redesign draft's;
 * body text keeps the settings the preview had while it was set in one face.
 *
 * Every default has to sit inside its role's ranges and on the `WEIGHT_STOPS`
 * grid, or a first visit would already show a value the sliders cannot reach.
 * `type-role.model.spec.ts` pins that.
 */
export const DEFAULT_TYPE_SETTINGS_BY_ROLE: Readonly<Record<TypeRole, TypeSettings>> = {
  display: {fontSize: 44, fontWeight: 500, lineHeight: 1.1},
  body: DEFAULT_TYPE_SETTINGS,
  mono: {fontSize: 12, fontWeight: 400, lineHeight: 1.5},
  ui: {fontSize: 15, fontWeight: 600, lineHeight: 1.2}
};


/**
 * `normalizedTypeSettings()` with the role's range and defaults filled in.
 *
 * `weightStops` stays the caller's: which weights are available depends on
 * the face the role is set in, which the engine does not know.
 */
export function normalizedTypeSettingsFor(role: TypeRole,
                                          settings: TypeSettings,
                                          weightStops: readonly number[] = WEIGHT_STOPS): TypeSettings {
  return normalizedTypeSettings(
    settings,
    weightStops,
    fontSizeRangeFor(role),
    DEFAULT_TYPE_SETTINGS_BY_ROLE[role]
  );
}
