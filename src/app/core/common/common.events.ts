import {eventGroup} from "@ngrx/signals/events";
import {type} from "@ngrx/signals";
import {ColorTheme} from "@common/models/color-theme.model";
import {RoleFont, RoleTypeSettings} from "@common/models/type-role-settings.model";
import {TypeRole} from "@engine/contrast/type-role.model";


export const commonEvents = eventGroup({
  source: "Common",
  events: {
    colorThemeChanged: type<ColorTheme>(),
    /**
     * The segment a visitor pressed: which role the picker and the sliders
     * act on from now. Not persisted, see `AppState.typeRole`.
     */
    typeRoleSelected: type<TypeRole>(),
    /** A face for one role; null puts that role back on the app's own type. */
    fontSelected: type<RoleFont>(),
    /**
     * A drag of a type slider, raised per frame.
     *
     * Not persisted: it is not in `anyPersistableEvents$`, so a drag does not
     * serialize the whole settings map sixty times a second. Same split as the
     * converter's `colorAdjusted` and `colorChanged`, and for the same reason -
     * every frame is a value the visitor is still choosing.
     */
    typeSettingsAdjusted: type<RoleTypeSettings>(),
    /** The end of a gesture: the value worth storing. */
    typeSettingsChanged: type<RoleTypeSettings>()
  }
})
