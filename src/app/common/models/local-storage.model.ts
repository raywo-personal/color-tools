import {ColorTheme} from "./color-theme.model";
import {SelectedFont} from "@common/models/google-font.model";


export const LOCAL_STORAGE_KEY = "color-tools";

export interface SettingsMap {
  currentColor: string;
  colorTheme: ColorTheme;
  currentPaletteId: string;
  selectedFont: SelectedFont | null;
  contrastId: string;
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
  colorTheme: "system",
  currentPaletteId: "",
  selectedFont: null,
  contrastId: ""
};
