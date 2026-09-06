import {EventInstance} from "@ngrx/signals/events";
import {ColorTheme} from "@common/models/color-theme.model";
import {RoleFont, RoleTypeSettings, TypeRolesMap, weightStopsForRole} from "@common/models/type-role-settings.model";
import {normalizedTypeSettingsFor, TypeRole} from "@engine/contrast/type-role.model";
import {AppState} from "@core/models/app-state.model";


export function colorThemeChangedReducer(
  this: void,
  event: EventInstance<"[Common] colorThemeChanged", ColorTheme>
) {
  return {
    colorTheme: event.payload
  };
}


export function typeRoleSelectedReducer(
  this: void,
  event: EventInstance<"[Common] typeRoleSelected", TypeRole>
) {
  return {
    typeRole: event.payload
  };
}


/**
 * The chosen typeface for one role, and the weight brought along with it.
 *
 * A family the visitor picks may not ship the weight the slider is standing
 * on. Snapping here rather than in the control keeps the invariant in one
 * place: whatever the state holds is a weight the role's face actually has,
 * so neither the preview nor the rating ever describes a synthesised one.
 */
export function fontSelectedReducer(
  this: void,
  event: EventInstance<"[Common] fontSelected", RoleFont>,
  state: AppState
) {
  const {role, font} = event.payload;
  const settings = normalizedTypeSettingsFor(role, state.typeRoles[role].settings, weightStopsForRole(role, font));

  return {
    typeRoles: withRole(state.typeRoles, role, {font, settings})
  };
}


/**
 * One role's type settings, normalized on the way in against the face that
 * role is set in.
 *
 * One reducer for both the drag and its commit: the value is the same either
 * way, and only whether it is persisted differs.
 */
export function typeSettingsReducer(
  this: void,
  event: EventInstance<
    "[Common] typeSettingsAdjusted" | "[Common] typeSettingsChanged",
    RoleTypeSettings
  >,
  state: AppState
) {
  const {role, settings} = event.payload;
  const {font} = state.typeRoles[role];

  return {
    typeRoles: withRole(state.typeRoles, role, {
      font,
      settings: normalizedTypeSettingsFor(role, settings, weightStopsForRole(role, font))
    })
  };
}


function withRole(roles: TypeRolesMap, role: TypeRole, value: TypeRolesMap[TypeRole]): TypeRolesMap {
  return {...roles, [role]: value};
}
