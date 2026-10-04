import {Component, computed, inject} from "@angular/core";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {commonEvents} from "@core/common/common.events";
import {fontFamilyFor} from "@common/models/type-role-settings.model";
import {TYPE_ROLES, TypeRole, typeRoleCaption} from "@engine/contrast/type-role.model";


interface Segment {

  readonly role: TypeRole;
  readonly caption: string;
  /** The face the specimen is set in - the role's own, so the segment shows it. */
  readonly fontFamily: string;
  readonly fontWeight: number;

}


/**
 * `TYPE ROLE` - four segments, one per kind of type on the page, saying which
 * role the picker and the sliders below act on.
 *
 * **Segments rather than nine sliders or an accordion.** The column already
 * carries the pair, the chips, the gestures, the rating and the colour-vision
 * block; one set of sliders acting on a chosen role is what fits, and the
 * segments are what makes the chosen role readable at a glance. Each shows a
 * specimen `Aa` in the role's face at the role's weight, so the row also says
 * what the four roles are currently set in.
 *
 * **The pressed segment is inverted, and `aria-pressed` says so.** Colour is
 * not the only carrier: the state is on the button, and the labels stay on
 * every segment.
 *
 * **Four segments at 320px.** The shell's padding leaves 288px, so a segment
 * is 72px wide; `DISPLAY` at `text-sm` fits that with `tracking-wide`, not
 * with the `tracking-widest` the other captions carry. The specimen is hidden
 * from the accessible name, so the button is announced by its caption alone.
 */
@Component({
  selector: "ct-type-roles",
  templateUrl: "./type-roles.html",
  host: {
    "class": "block"
  }
})
export class TypeRoles {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(commonEvents);

  protected readonly selected = this.#stateStore.typeRole;

  protected readonly segments = computed<Segment[]>(() => {
    const roles = this.#stateStore.typeRoles();

    return TYPE_ROLES.map(role => ({
      role,
      caption: typeRoleCaption(role),
      fontFamily: fontFamilyFor(role, roles[role].font),
      fontWeight: roles[role].settings.fontWeight
    }));
  });


  protected select(role: TypeRole): void {
    this.#dispatch.typeRoleSelected(role);
  }

}
