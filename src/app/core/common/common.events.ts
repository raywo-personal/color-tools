import {eventGroup} from "@ngrx/signals/events";
import {type} from "@ngrx/signals";
import {ColorTheme} from "@common/models/color-theme.model";
import {SelectedFont} from "@common/models/google-font.model";
import {TypeSettings} from "@engine/contrast/type-settings.model";


export const commonEvents = eventGroup({
  source: "Common",
  events: {
    colorThemeChanged: type<ColorTheme>(),
    fontSelected: type<SelectedFont | null>(),
    /**
     * A drag of a type slider, raised per frame.
     *
     * Not persisted: it is not in `anyPersistableEvents$`, so a drag does not
     * serialize the whole settings map sixty times a second. Same split as the
     * converter's `colorAdjusted` and `colorChanged`, and for the same reason -
     * every frame is a value the visitor is still choosing.
     */
    typeSettingsAdjusted: type<TypeSettings>(),
    /** The end of a gesture: the value worth storing. */
    typeSettingsChanged: type<TypeSettings>()
  }
})
