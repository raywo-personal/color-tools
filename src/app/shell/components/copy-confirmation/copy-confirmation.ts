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
 *
 * The draft pins the toast to the bottom centre of the viewport. In the narrow
 * column that is where the thumb and the control it just hit are, so it would
 * cover the very thing it confirms: the narrow layout puts it at the top and
 * only the wide one follows the draft.
 */
@Component({
  selector: "ct-copy-confirmation",
  template: `
    @if (confirmation(); as message) {
      <p class="ct-toast pointer-events-none fixed inset-x-4 top-4 z-50 mx-auto w-fit rounded-xs bg-text px-4 py-2.5 text-center font-mono text-base tracking-wide text-bg sm:inset-x-0 sm:top-auto sm:bottom-8"
         aria-hidden="true">{{ message }}</p>
    }
  `,
  styleUrl: "./copy-confirmation.css"
})
export class CopyConfirmation {

  protected readonly confirmation = inject(CopyService).confirmation;

}
