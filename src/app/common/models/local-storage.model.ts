import {ColorTheme} from "./color-theme.model";
import {SelectedFont} from "@common/models/google-font.model";
import {TypeRolesMap} from "@common/models/type-role-settings.model";


export const LOCAL_STORAGE_KEY = "color-tools";

export interface SettingsMap {
  currentColor: string;
  colorTheme: ColorTheme;
  currentPaletteId: string;
  /** The roll behind `currentPaletteId`, so a drag after a reload continues it. */
  paletteSeed: number;
  contrastId: string;
  /**
   * The four type roles as one entry, face and settings per role. Nested
   * where the map is otherwise flat, because the alternative is sixteen keys
   * that only ever change together.
   *
   * Deliberately absent from `EMPTY_SETTINGS` - see the note there. The
   * fallback is `initialState.typeRoles`, so the preview and the rating open
   * on the same values a first-time visitor gets.
   */
  typeRoles: TypeRolesMap;
  /**
   * The single typeface and its three axes, from before the type roles. Read
   * as body text's face and settings where `typeRoles` holds no entry for
   * body, never written: a visitor who set their type before the roles keeps
   * it. Remove the four together, and only once no storage still carries
   * them.
   */
  selectedFont?: SelectedFont | null;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
}

export type SettingKey = keyof SettingsMap;

/**
 * The values a key falls back to when the storage holds nothing for it, so it
 * is `Partial` on purpose. A value here silences the fallback the reading code
 * writes down for itself: `get()` never returns null for a key listed, so a
 * `?? …` or a `getOrDefault(…)` on the other side is unreachable. That is what
 * kept `chroma.random()` from ever running for a first-time visitor, who got
 * `#787878` instead. Add a key here only when this is the one place the
 * default should live.
 */
export const EMPTY_SETTINGS: Partial<SettingsMap> = {
  currentPaletteId: "",
  contrastId: ""
};
