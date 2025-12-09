import {Component, inject, input, linkedSignal, output} from "@angular/core";
import {FormsModule} from "@angular/forms";
import {NgbTypeahead, NgbTypeaheadSelectItemEvent} from "@ng-bootstrap/ng-bootstrap";
import {GoogleFontsService} from "@common/services/google-fonts.service";
import {getRegularFont, GoogleFont, SelectedFont} from "@common/models/google-font.model";
import {Observable, OperatorFunction} from "rxjs";
import {debounceTime, distinctUntilChanged, map} from "rxjs/operators";


/**
 * Font selector component using Google Fonts API
 * Provides a typeahead search interface for selecting fonts
 */
@Component({
  selector: "ct-font-selector",
  imports: [FormsModule, NgbTypeahead],
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

  /**
   * Typeahead search function
   * Filters fonts based on user input
   */
  protected search: OperatorFunction<string, readonly GoogleFont[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => {
        return this.#googleFontsService
          .searchFonts(term)
          .slice(0, 20);
      })
    );

  /**
   * Formatter function for displaying font names
   */
  protected formatter = (font: GoogleFont): string => {
    return font.family;
  };


  /** Input: Label for the font selector */
  public readonly label = input<string>("Select Font");
  public readonly descriptiveText = input<string>("Select a font from the Google font catalog.");

  /** Input: Placeholder text for the input field */
  public readonly placeholder = input<string>("Search for a font...");

  /** Input: Initial selected font family name */
  public readonly initialFont = input<string | null>(null);

  /** Output: Emits when a font is selected */
  public readonly fontSelected = output<SelectedFont | null>();


  /**
   * Handler for when a font is selected from the typeahead
   */
  protected onFontSelected(event: NgbTypeaheadSelectItemEvent<GoogleFont>): void {
    const font = event.item;
    this.selectedFontName.set(font.family);

    this.fontSelected.emit(getRegularFont(font));
  }


  protected onResetClick() {
    this.selectedFontName.set("");
    this.fontSelected.emit(null);
  }

}
