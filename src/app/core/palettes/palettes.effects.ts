import {Events} from "@ngrx/signals/events";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {tap} from "rxjs";
import {styleCaptionFor} from "@engine/palette/palette-style.model";
import {palettesEvents} from "./palettes.events";
import {AppStateStore} from "../app-state.store";


/**
 * Announces the palette a picked style produced.
 *
 * Picking a chip replaces all five swatches without moving focus, so nothing
 * would tell a screen reader that anything happened - and picking the chip
 * that is already pressed changes not even the pressed state, while the
 * palette is rolled anew all the same.
 *
 * An effect rather than the chip, so the announcement travels with the event
 * and not with one caller of it. The reducer has run by the time an effect
 * sees the event, so the store already holds the new palette.
 */
export function newPaletteAnnouncedEffect(
  this: void,
  events: Events,
  announcer: LiveAnnouncer,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(palettesEvents.styleChanged)
    .pipe(
      tap(() => {
        const style = typedStore.currentPalette().style;

        void announcer.announce(`New ${styleCaptionFor(style)} palette`, "polite");
      })
    );
}
