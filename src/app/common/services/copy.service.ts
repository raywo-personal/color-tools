import {DestroyRef, DOCUMENT, inject, Service, signal} from "@angular/core";
import {LiveAnnouncer} from "@angular/cdk/a11y";
import {Color} from "chroma-js";
import {colorName} from "@engine/color/color-name.helper";


/**
 * How long a confirmed copy stays on screen. It only has to be seen: the value
 * is on the clipboard either way, and `LiveAnnouncer` has already said so.
 */
const CONFIRMATION_DURATION = 1400;

/**
 * A failure stays far longer, because it has no such fallback. The visitor
 * clicks copy, looks away to the app they are pasting into, and pastes
 * whatever was on the clipboard before - the outcome the whole failure path
 * exists to prevent. A duration measured for a success is too short to carry
 * that news.
 */
const FAILURE_DURATION = 6000;


/**
 * What the toast shows, and whether the copy failed.
 *
 * The outcome travels with the message because the toast may not tell the two
 * apart by color alone: it also carries a marker, and the marker needs the
 * flag.
 */
export interface CopyOutcome {
  readonly message: string;
  readonly failed: boolean;
}


/**
 * The whole copy gesture in one call: write to the clipboard, confirm it on
 * screen, announce it.
 *
 * It exists so that a copy target has none of this to decide. Four of the
 * Studio's slices copy a color on click, and a `navigator.clipboard` call per
 * slice would be four empty catch blocks and three missing announcements.
 *
 * The toast and the announcement say different things on purpose. The eye
 * wants the value that landed on the clipboard; a screen reader spells a hex
 * code out one character at a time and learns nothing from it, so speech gets
 * the color's name.
 */
@Service()
export class CopyService {

  readonly #announcer = inject(LiveAnnouncer);
  readonly #window = inject(DOCUMENT).defaultView;

  readonly #confirmation = signal<CopyOutcome | null>(null);

  #timer: ReturnType<typeof setTimeout> | undefined;

  /** What the toast shows, or `null` while there is nothing to confirm. */
  readonly confirmation = this.#confirmation.asReadonly();


  constructor() {
    inject(DestroyRef).onDestroy(() => this.#clearTimer());
  }


  /**
   * Copies a color. `text` is what lands on the clipboard and what the toast
   * shows, so a slice passes the format it displays; the announcement always
   * uses the color's name.
   */
  public copyColor(color: Color, text = color.hex().toUpperCase()): Promise<void> {
    return this.#copy(text, text, colorName(color));
  }


  /**
   * Copies what is not a single color - an export block, a set of CSS
   * variables. `label` names it, because that text is too long to show in a
   * toast and too long to hear.
   */
  public copyText(text: string, label: string): Promise<void> {
    return this.#copy(text, label, label);
  }


  async #copy(text: string, shown: string, spoken: string): Promise<void> {
    if (await this.#write(text)) {
      this.#confirm(`Copied ${shown}`, false);
      void this.#announcer.announce(`Copied ${spoken}`, "polite");

      return;
    }

    // Reported, not swallowed. A silent failure leaves the visitor believing
    // the copy worked and pasting whatever was on the clipboard before.
    this.#confirm(`Could not copy ${shown}`, true);
    void this.#announcer.announce(`Could not copy ${spoken}`, "assertive");
  }


  async #write(text: string): Promise<boolean> {
    // Outside a secure context `navigator.clipboard` is undefined rather than
    // rejecting, so the guard is not the same case as the catch.
    const clipboard = this.#window?.navigator.clipboard;

    if (!clipboard) return false;

    try {
      await clipboard.writeText(text);

      return true;
    } catch {
      return false;
    }
  }


  #confirm(message: string, failed: boolean): void {
    this.#clearTimer();
    this.#confirmation.set({message, failed});

    this.#timer = setTimeout(
      () => this.#confirmation.set(null),
      failed ? FAILURE_DURATION : CONFIRMATION_DURATION
    );
  }


  #clearTimer(): void {
    if (this.#timer !== undefined) clearTimeout(this.#timer);

    this.#timer = undefined;
  }

}
