import {Component, ElementRef, input, signal, viewChild} from "@angular/core";
import {CdkTrapFocus} from "@angular/cdk/a11y";
import {CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition} from "@angular/cdk/overlay";


/**
 * A caption's `i`: an icon-only button that opens the block's explanation as a
 * popup, in the app's own colours.
 *
 * **It is for prose a visitor reads once.** A block whose caption already
 * carries the finding - a count, a verdict, a sentence naming what was lost -
 * does not need the paragraph that explains the block standing over it every
 * time. What goes in here is the explanation; what a visitor comes for stays
 * on the page.
 *
 * **The text is projected, so it stays with the block it belongs to.** The
 * sentence about the page's default colours reads as part of the ledger's
 * template and is maintained there; this component owns the disclosure, not
 * the wording.
 *
 * **The open state is local, not in the store.** The store holds what more
 * than one screen or effect asks about - `openVerdict` is there because a
 * placement closes it. Nothing outside this button opens or closes it, and two
 * of them open at once without contradicting each other, so a signal here is
 * the whole of it.
 *
 * The panel is the app looking at its own block: `panel`, `line`, `text` and
 * the shadow, exactly as `VerdictPanel` takes them. It is never drawn in a
 * visitor colour, so nothing in here is measured against one.
 */
@Component({
  selector: "ct-info-button",
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, CdkTrapFocus],
  templateUrl: "./info-button.html",
  host: {
    "class": "flex"
  }
})
export class InfoButton {

  /**
   * The button's accessible name, and the panel's.
   *
   * One string for both: the button has no visible label, so its name is free
   * to say what pressing it gives - and that is the same sentence the panel
   * needs as its own name. Sentence case, because a screen reader spells the
   * app's all-caps captions out letter by letter.
   */
  readonly label = input.required<string>();

  protected readonly open = signal(false);

  private readonly trigger = viewChild.required<ElementRef<HTMLElement>>("trigger");

  /** Present only while the panel is out, which is why it is not `required`. */
  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");

  /**
   * Where the panel sits: under the button and aligned to it, then above it,
   * and flipped to the right edge where the left one has no room.
   *
   * `VerdictMark` says why four fallbacks rather than one position plus
   * `push`.
   */
  // Not `readonly ConnectedPosition[]`: `cdkConnectedOverlayPositions` takes a
  // mutable array, and a readonly one fails the template type check.
  protected readonly positions: ConnectedPosition[] = [
    {originX: "start", originY: "bottom", overlayX: "start", overlayY: "top", offsetY: 8},
    {originX: "start", originY: "top", overlayX: "start", overlayY: "bottom", offsetY: -8},
    {originX: "end", originY: "bottom", overlayX: "end", overlayY: "top", offsetY: 8},
    {originX: "end", originY: "top", overlayX: "end", overlayY: "bottom", offsetY: -8}
  ];


  protected toggle(): void {
    this.open.update(open => !open);
  }


  /** Focus into the panel, so the prose is where the reader is - see the template. */
  protected onAttach(): void {
    this.panel()?.nativeElement.focus();
  }


  /** Escape closes it, as it closes every popup in this app. */
  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") this.close();
  }


  /**
   * Closes it, and hands focus back to the button if the panel still holds it.
   *
   * Only then: on Escape it does, and dropping the visitor at the end of the
   * document is what the return prevents. A click elsewhere has already put
   * focus where the visitor aimed it - the next block's `i`, say - and pulling
   * it back here would undo their own press.
   */
  protected close(): void {
    if (!this.open()) return;

    const held = this.panel()?.nativeElement.contains(document.activeElement) ?? false;

    this.open.set(false);

    if (held) this.trigger().nativeElement.focus();
  }

}
