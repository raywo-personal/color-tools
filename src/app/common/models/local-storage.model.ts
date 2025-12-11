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

export const EMPTY_SETTINGS: SettingsMap = {
  currentColor: "#787878",
  colorTheme: "dark",
  currentPaletteId: "",
  selectedFont: null,
  contrastId: ""
};
