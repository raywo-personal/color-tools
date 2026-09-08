import {inject, Service} from "@angular/core";
import {LiveAnnouncer} from "@angular/cdk/a11y";


/**
 * Decides which of two competing sentences a screen reader actually hears.
 *
 * **Every polite announcement in the app goes through here, not through
 * `LiveAnnouncer` directly.** `LiveAnnouncer.announce()` clears its pending
 * timeout on every call and writes the text a tenth of a second later, so two
 * sentences raised for the same change delete the first outright - the visitor
 * hears whichever call happened to be second. Calling the CDK service from a
 * second place puts that race back.
 *
 * There are two kinds of sentence, and they are not equal:
 *
 * - `announce()` is what the visitor just did. It names the gesture and the
 *   thing it moved, and it is always spoken.
 * - `summarise()` is the page talking about itself afterwards - the tally of
 *   verdicts, which follows from whatever the gesture was. It is spoken only
 *   where no gesture has already answered the same change.
 *
 * So the specific sentence wins and the summary stays quiet for that change.
 * A summary is the better sentence only when nothing else has one: after a
 * slider drag or a picker move, where the control the visitor is holding
 * already carries its own value.
 *
 * Polite only, on purpose. An assertive sentence interrupts by design and has
 * nothing to arbitrate.
 *
 * **Three callers stay outside this service, and they are the whole list.**
 * What keeps each of them out is what its sentence is about and how urgent it
 * is - never which screen it sits on. `color-field` renders on the contrast
 * screen itself, a column above the tally, so a rule drawn on geography would
 * let the next author out for a reason that is not true.
 *
 * - `CopyService` confirms a copy, and warns when one failed: about the
 *   clipboard, not about the page. The warning is the app's one assertive
 *   sentence, and `copy.service.spec.ts` pins the two durations it stands
 *   for - which this service knows nothing about.
 * - `color-field.ts` announces a value it *rejected*, assertively, and the
 *   sentence is about the field. A rejection writes no state, so nothing has
 *   a second sentence about the same change.
 * - `not-found.ts` announces swatches it keeps in a signal of its own. No app
 *   state moves there either.
 *
 * So a sentence belongs here when it is polite and about the sample page.
 */
@Service()
export class AnnouncementService {

  readonly #announcer = inject(LiveAnnouncer);

  /**
   * Whether a gesture has spoken about a change the page has not summarised
   * yet.
   *
   * Held for exactly one summary, and `summarise()` is what hands it back -
   * which is why that method has to be called on every change the page sees,
   * even the ones where the summary did not move. Left latched, the next
   * unrelated change would lose its summary to a gesture nobody remembers.
   */
  #gestureSpoke = false;


  /** A sentence about what the visitor just did. Always spoken. */
  public announce(message: string): void {
    this.#gestureSpoke = true;

    void this.#announcer.announce(message, "polite");
  }


  /**
   * The page's own summary of the change that just happened, or `null` where
   * the summary did not move.
   *
   * Call it on every change, `null` included: the call is what releases the
   * latch a gesture set - see `#gestureSpoke`.
   */
  public summarise(message: string | null): void {
    const answered = this.#gestureSpoke;

    this.#gestureSpoke = false;

    if (answered || message === null) return;

    void this.#announcer.announce(message, "polite");
  }

}
