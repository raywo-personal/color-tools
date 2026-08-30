import {Component, inject, input, linkedSignal, output} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {GoogleFontsService} from "@common/services/google-fonts.service";
import {SelectedFont} from "@common/models/google-font.model";


/**
 * Font selector component using Google Fonts API
 *
 * The typeahead this component was built around came from ng-bootstrap and
 * went out with it. What remains is the font resource and the store wiring;
 * picking a font is rebuilt with the redesigned screens.
 */
@Component({
  selector: "ct-font-selector",
  imports: [FormsModule],
  templateUrl: "./font-selector.html",
  styles: ``
})
export class FontSelectorComponent {

  readonly #googleFontsService = inject(GoogleFontsService);

  /** Currently selected font name for the input field */
  protected selectedFontName = linkedSignal<string>(() => {
    return this.initialFont() ?? "";
  });

  /** Unique ID for the input element */
  protected readonly fontSelectInput = `font-selector-${Math.random().toString(36).substring(7)}`;


  /** Access to the fonts resource from the service */
  protected readonly fontsResource = this.#googleFontsService.googleFonts;


  /** Input: Label for the font selector */
  public readonly label = input<string>("Select Font");
  public readonly descriptiveText = input<string>("Select a font from the Google font catalog.");

  /** Input: Placeholder text for the input field */
  public readonly placeholder = input<string>("Search for a font...");

  /** Input: Initial selected font family name */
  public readonly initialFont = input<string | null>(null);

  /** Output: Emits when a font is selected */
  public readonly fontSelected = output<SelectedFont | null>();


  protected onResetClick() {
    this.selectedFontName.set("");
    this.fontSelected.emit(null);
  }

}
