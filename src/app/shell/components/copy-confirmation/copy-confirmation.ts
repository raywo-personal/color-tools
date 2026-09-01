import {Component, inject} from "@angular/core";
import {CopyService} from "@common/services/copy.service";


/**
 * The visual half of a copy: it shows what `CopyService` last confirmed and
 * gets out of the way again. It is rendered once by the shell, so a copy
 * target neither imports nor positions it.
 *
 * `aria-hidden` because the spoken half belongs to `LiveAnnouncer`. Making the
 * toast a live region as well would say the same thing twice, in the wrong
 * words - the toast carries the hex code, speech carries the color's name.
 * For the same reason there is nothing focusable in it: a close button would
 * put the hex code back into the tab order and into speech.
 *
 * A failure is marked three times over: in the `danger` pair, by the sign
 * beside the message, and by the weight of the message itself. Color alone
 * would break the app's own rule about carrying information, and the wording
 * is gone with the toast.
 *
 * The weight is not decoration. At 16px the app's own APCA table asks Lc 90 at
 * weight 400 and Lc 70 at 600, and no red anyone would call red reaches 90 -
 * so a normal-weight message forces the pill pale enough to stop reading as
 * red at all.
 *
 * The sign is an inlined Bootstrap Icons path rather than the `⚠` character,
 * which renders at text weight in the mono face and disappears next to it. It
 * is inlined for the same reason `app-header.html` inlines its own: a whole
 * icon font for one glyph costs a request and a font file.
 *
 * The draft pins the toast to the bottom centre of the viewport. In the narrow
 * column that is where the thumb and the control it just hit are, so it would
 * cover the very thing it confirms: the narrow layout puts it at the top and
 * only the wide one follows the draft.
 */
@Component({
  selector: "ct-copy-confirmation",
  template: `
    @if (confirmation(); as outcome) {
      <p class="ct-toast pointer-events-none fixed inset-x-4 top-4 z-50 mx-auto flex w-fit items-center justify-center gap-2 rounded-xs px-4 py-2.5 text-center font-mono text-base tracking-wide sm:inset-x-0 sm:top-auto sm:bottom-8"
         [class.bg-text]="!outcome.failed"
         [class.text-bg]="!outcome.failed"
         [class.bg-danger]="outcome.failed"
         [class.text-on-danger]="outcome.failed"
         aria-hidden="true">
        @if (outcome.failed) {
          <svg class="size-5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566ZM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5Zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>
          </svg>
        }
        <span [class.font-semibold]="outcome.failed">{{ outcome.message }}</span>
      </p>
    }
  `,
  styleUrl: "./copy-confirmation.css"
})
export class CopyConfirmation {

  protected readonly confirmation = inject(CopyService).confirmation;

}
