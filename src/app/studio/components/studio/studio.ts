import {Component, inject} from "@angular/core";
import chroma from "chroma-js";
import {CopyService} from "@common/services/copy.service";


@Component({
  selector: "ct-studio",
  template: `
    <p class="font-mono text-sm tracking-widest text-dim">STUDIO</p>
    <p class="mt-3 font-serif text-2xl">Color, palette and ramps land here.</p>

    <!-- SCAFFOLDING - goes with slice 1 (#88), which brings the first real
         copy target. Until then these two buttons are the only way to see the
         toast: happy-dom computes no layout, so no test shows whether it
         clears the header, reads against its ground, or lands where the thumb
         is not. Delete this block and the preview method with it. -->
    <div class="mt-8 flex flex-wrap gap-3">
      <button type="button"
              class="h-11 rounded-xs border border-line px-5 text-base"
              (click)="preview(false)">Copy (succeeds)
      </button>

      <button type="button"
              class="h-11 rounded-xs border border-line px-5 text-base"
              (click)="preview(true)">Copy (fails)
      </button>
    </div>
  `
})
export class Studio {

  readonly #copy = inject(CopyService);


  /** Scaffolding, see the template. Goes with slice 1 (#88). */
  protected async preview(fail: boolean): Promise<void> {
    // Shadowing the prototype getter is the only way to reach the failure path
    // from outside the service; `delete` uncovers it again.
    if (fail) {
      Object.defineProperty(navigator, "clipboard", {value: undefined, configurable: true});
    }

    await this.#copy.copyColor(chroma(fail ? "#CC3366" : "#3366CC"));

    Reflect.deleteProperty(navigator, "clipboard");
  }

}
