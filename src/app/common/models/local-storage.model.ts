import {ColorTheme} from "./color-theme.model";
import {SelectedFont} from "@common/models/google-font.model";


export const LOCAL_STORAGE_KEY = "color-tools";

export interface SettingsMap {
  currentColor: string;
  colorTheme: ColorTheme;
  currentPaletteId: string;
  /** The roll behind `currentPaletteId`, so a drag after a reload continues it. */
  paletteSeed: number;
  selectedFont: SelectedFont | null;
  contrastId: string;
  /**
   * The three axes of `typeSettings`, one key each rather than one nested
   * object: the map is flat everywhere else, and `set()` writes a key at a
   * time.
   *
   * Deliberately absent from `EMPTY_SETTINGS` - see the note there. The
   * fallback is `initialState.typeSettings`, so the preview and the rating
   * open on the same values a first-time visitor gets.
   */
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
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
  selectedFont: null,
  contrastId: ""
};
