import {eventGroup} from "@ngrx/signals/events";
import {type} from "@ngrx/signals";
import {ColorTheme} from "@common/models/color-theme.model";
import {SelectedFont} from "@common/models/google-font.model";


export const commonEvents = eventGroup({
  source: "Common",
  events: {
    colorThemeChanged: type<ColorTheme>(),
    fontSelected: type<SelectedFont | null>()
  }
})
