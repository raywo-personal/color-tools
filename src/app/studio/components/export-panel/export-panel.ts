import {Component, computed, inject, signal} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";
import {CopyService} from "@common/services/copy.service";
import {exportAs, ExportFormat} from "@studio/helper/palette-export.helper";


interface FormatOption {
  readonly format: ExportFormat;
  /** The tab's caption. */
  readonly caption: string;
  /** What the toast and the announcement call the copied block. */
  readonly label: string;
}


const FORMAT_OPTIONS: readonly FormatOption[] = [
  {format: "css", caption: "CSS", label: "CSS variables"},
  {format: "tailwind", caption: "TAILWIND", label: "Tailwind theme"},
  {format: "json", caption: "JSON", label: "JSON export"}
];


/**
 * The export panel at the foot of the right column: the `CSS` / `TAILWIND` /
 * `JSON` switch, `COPY ALL`, and the block showing what would be copied.
 *
 * The block is built from the store on every read, so it describes the palette
 * and the ramps on screen at that moment - a drag included. The two formats
 * are a pressed group like the theme control, not a tablist: a tablist
 * promises arrow-key navigation and a labelled panel, and three buttons
 * switching one block do not need either. The pressed state is the carrier
 * that is not colour. Tailwind sits between the other two because it is CSS
 * in shape and the odd one out in audience.
 *
 * The block is the one copy target; its rows are not. Copying goes through
 * `CopyService.copyText()`, whose label is what the toast shows - the block
 * itself is too long for a toast and too long to hear. The same label names
 * the block as a region, so the tab stop it needs to be scrollable by
 * keyboard says which format the visitor has landed in.
 *
 * The format is component state, not app state: nothing else reads it and
 * a visitor coming back expects the panel as the draft draws it.
 */
@Component({
  selector: "ct-export-panel",
  templateUrl: "./export-panel.html",
  host: {
    "class": "block"
  }
})
export class ExportPanel {

  readonly #stateStore = inject(AppStateStore);
  readonly #copy = inject(CopyService);

  protected readonly options = FORMAT_OPTIONS;
  protected readonly format = signal<ExportFormat>("css");

  protected readonly selected = computed(() =>
    FORMAT_OPTIONS.find(candidate => candidate.format === this.format())!);

  protected readonly output = computed(() => exportAs(this.format(), {
    base: this.#stateStore.currentColor(),
    palette: this.#stateStore.currentPalette(),
    tints: this.#stateStore.tintColors(),
    shades: this.#stateStore.shadeColors()
  }));


  protected pick(format: ExportFormat): void {
    this.format.set(format);
  }


  protected copyAll(): void {
    void this.#copy.copyText(this.output(), this.selected().label);
  }

}
