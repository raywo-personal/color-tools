import {EventInstance, Events} from "@ngrx/signals/events";
import {tap} from "rxjs";
import {AnnouncementService} from "@common/services/announcement.service";
import {colorName} from "@engine/color/color-name.helper";
import {PaletteSlot} from "@engine/palette/palette.model";
// The screen's own two models, read from `@core` on purpose: the sentence has
// to name an element in the same words as the mark beside it and the row in
// the ledger, and a copy of those names here would be the one that drifts.
// What keeps the direction harmless is that neither model imports anything
// from `@core` - do not add such an import to `element-verdict.model.ts` or
// `sample-page.model.ts`, or this edge closes into a cycle.
import {sampleElement} from "@contrast-type/models/sample-page.model";
import {elementName} from "@contrast-type/models/element-verdict.model";
import {contrastEvents} from "./contrast.events";
import {transferEvents} from "@core/common/transfer.events";
import {AppStateStore} from "../app-state.store";


/**
 * The opening word per gesture, so a swap that happens to roll past is not
 * read as a new pair and neither is mistaken for the palette's own.
 */
const OPENINGS: Record<string, string> = {
  [contrastEvents.switchColors.type]: "Swapped",
  [contrastEvents.newRandomColorsWithNav.type]: "New pair",
  [transferEvents.sendPaletteToContrast.type]: "From the palette"
};


/**
 * Announces the pair `SWAP`, the random roll and `PALETTE PAIR` produced.
 *
 * All three replace text and background at once without moving focus, and no
 * button says what came back - unlike a field, a picker or a palette chip,
 * whose own name carries the color it sets. Without the announcement a screen
 * reader is told nothing at all.
 *
 * Through `AnnouncementService` rather than `LiveAnnouncer`: the page's tally
 * has a sentence about the very same change, and one of the two has to give
 * way - that service says which. Polite, not assertive: the visitor pressed
 * the button and is still standing on it, so there is nothing in progress to
 * interrupt.
 *
 * One effect for all three events, because the sentence is the same shape and
 * the pair is what each of them changed. The opening word tells them apart -
 * see `OPENINGS`.
 *
 * An effect rather than the buttons, so the announcement travels with the
 * event and not with one caller of it. The reducer has run by the time an
 * effect sees the event, so the store already holds the new pair.
 */
export function contrastPairAnnouncedEffect(
  this: void,
  events: Events,
  announcements: AnnouncementService,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(
      contrastEvents.switchColors,
      contrastEvents.newRandomColorsWithNav,
      transferEvents.sendPaletteToContrast
    )
    .pipe(
      tap(event => {
        const {text, background} = typedStore.contrastColors();
        const opening = OPENINGS[event.type];

        announcements.announce(`${opening}: ${colorName(text)} on ${colorName(background)}`);
      })
    );
}


/**
 * Announces a colour put on an element, and a placement taken off again.
 *
 * A drop and the chooser on an element's mark both repaint one element of the
 * preview and add or remove a row of the ledger without moving focus onto
 * either, and `RESET PAGE` repaints the lot - so nothing on screen would tell
 * a screen reader that anything happened.
 *
 * **The element and the colour, not the slot.** `roleCaptionFor()` is what
 * this app calls a slot and it is what the ledger's row shows, but its
 * captions are all-caps and a screen reader spells those out letter by letter
 * - `BASE`, `SPLIT A`, `−14`. The colour's own name is the thing the visitor
 * can act on, and it is already the app's word for a palette member wherever
 * one is announced.
 *
 * Through `AnnouncementService` for `contrastPairAnnouncedEffect`'s reason:
 * a placement usually moves the page's tally, which has a sentence of its own
 * about the same change, and the specific one is the one to hear. Polite -
 * the visitor has just finished a gesture of their own and there is nothing
 * in progress to interrupt.
 *
 * One effect for all three events, and an effect rather than the drop, the
 * chooser or the ledger's button, so the sentence travels with the event and
 * not with one of the ways of raising it. The reducer has run by the time an
 * effect sees the event, so the store already holds the placement.
 */
export function placementAnnouncedEffect(
  this: void,
  events: Events,
  announcements: AnnouncementService,
  store: unknown
) {
  const typedStore = store as AppStateStore;

  return events
    .on(
      contrastEvents.colorPlaced,
      contrastEvents.placementReset,
      contrastEvents.placementsReset
    )
    .pipe(
      tap(event => {
        announcements.announce(sentenceFor(event, typedStore));
      })
    );
}


type PlacementEvent =
  | EventInstance<"[Contrast] colorPlaced", {elementKey: string; slot: PaletteSlot}>
  | EventInstance<"[Contrast] placementReset", string>
  | EventInstance<"[Contrast] placementsReset", void>;


function sentenceFor(event: PlacementEvent, store: AppStateStore): string {
  switch (event.type) {
    case contrastEvents.placementsReset.type:
      // Not a list of what was on the page: `RESET PAGE` can clear a row per
      // element, and a sentence naming them all is one nobody hears the end
      // of.
      return "Every placed color removed";
    case contrastEvents.placementReset.type:
      // "its default color", not "the page's own color": six elements -
      // the eyebrow, the form label, the table header, `Sign in`, the link
      // in the text and the filled button - default to a palette colour, so
      // naming the page would tell the visitor the opposite of what they see.
      // One wording that is true for all of them beats a per-element branch.
      return `${nameOf(event.payload)} back to its default color`;
    case contrastEvents.colorPlaced.type: {
      const {elementKey, slot} = event.payload;
      const color = colorName(store.currentPalette()[slot].color);

      return `${nameOf(elementKey)} takes ${color}`;
    }
  }
}


function nameOf(elementKey: string): string {
  return elementName(sampleElement(elementKey));
}
