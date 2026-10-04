import {Events} from "@ngrx/signals/events";
import {tap} from "rxjs";
import {AnnouncementService} from "@common/services/announcement.service";
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
 *
 * Through `AnnouncementService`: all five members move, so on the contrast
 * screen the page's tally moves on the same event and the two sentences would
 * otherwise cancel.
 */
export function newPaletteAnnouncedEffect(
  this: void,
  events: Events,
  announcements: AnnouncementService,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(palettesEvents.styleChanged)
    .pipe(
      tap(() => {
        const style = typedStore.currentPalette().style;

        announcements.announce(`New ${styleCaptionFor(style)} palette`);
      })
    );
}
