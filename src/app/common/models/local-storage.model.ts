import {ColorTheme} from "./color-theme.model";
import {SelectedFont} from "@common/models/google-font.model";


export const LOCAL_STORAGE_KEY = "color-tools";

export interface SettingsMap {
  colorTheme: ColorTheme;
  /**
   * The state of both views as the Contrast & Type address carries it - see
   * `contrastTypeAddressFrom()`. It opens with the Studio's palette segment,
   * so it holds the Studio as well.
   *
   * The same format as the url, read through the same restore, so a reload
   * opens on what a link would. Do not add keys beside it for what the
   * address already carries; two formats for one state drift apart.
   */
  address: string;
  /*
   * The v1 keys. Read where no address is stored, so a visitor coming from
   * v1 keeps their colour, palette, pair and typeface; never written. Remove
   * them together, once no storage still carries them.
   */
  currentColor?: string;
  currentPaletteId?: string;
  contrastId?: string;
  selectedFont?: SelectedFont | null;
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
  address: ""
};
