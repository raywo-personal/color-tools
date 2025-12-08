import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgbTypeahead, NgbTypeaheadSelectItemEvent} from '@ng-bootstrap/ng-bootstrap';
import {GoogleFontsService} from '@common/services/google-fonts.service';
import {GoogleFont, SelectedFont} from '@common/models/google-font.model';
import {Observable, OperatorFunction} from 'rxjs';
import {debounceTime, distinctUntilChanged, map} from 'rxjs/operators';

/**
 * Font selector component using Google Fonts API
 * Provides a typeahead search interface for selecting fonts
 */
@Component({
  selector: 'app-font-selector',
  imports: [FormsModule, NgbTypeahead],
  templateUrl: './font-selector.html',
  styles: `
    .font-selector {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  `
})
export class FontSelectorComponent {
  private readonly googleFontsService = inject(GoogleFontsService);

  /** Input: Label for the font selector */
  public readonly label = input<string>('Select Font');

  /** Input: Placeholder text for the input field */
  public readonly placeholder = input<string>('Search for a font...');

  /** Input: Initial selected font family name */
  public readonly initialFont = input<string | null>(null);

  /** Output: Emits when a font is selected */
  public readonly fontSelected = output<SelectedFont>();

  /** Access to the fonts resource from the service */
  protected readonly fontsResource = this.googleFontsService.fontsResource;

  /** Currently selected font name for the input field */
  protected selectedFontName = signal<string>('');

  /** Unique ID for the input element */
  protected readonly inputId = `font-selector-${Math.random().toString(36).substring(7)}`;

  constructor() {
    // Set initial font if provided
    effect(() => {
      const initial = this.initialFont();
      if (initial) {
        this.selectedFontName.set(initial);
      }
    });
  }

  /**
   * Typeahead search function
   * Filters fonts based on user input
   */
  protected search: OperatorFunction<string, readonly GoogleFont[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => {
        if (term.length < 2) {
          return [];
        }

        const fonts = this.fontsResource.value();
        if (!fonts) {
          return [];
        }

        const lowerTerm = term.toLowerCase();
        return fonts
          .filter(font => font.family.toLowerCase().includes(lowerTerm))
          .slice(0, 20); // Limit to 20 results for performance
      })
    );

  /**
   * Formatter function for displaying font names
   */
  protected formatter = (font: GoogleFont): string => {
    return font.family;
  };

  /**
   * Handler for when a font is selected from the typeahead
   */
  protected onFontSelected(event: NgbTypeaheadSelectItemEvent<GoogleFont>): void {
    const font = event.item;
    this.selectedFontName.set(font.family);

    // Create SelectedFont object with default variant
    const selectedFont: SelectedFont = {
      family: font.family,
      category: font.category,
      variant: 'regular',
      fileUrl: font.files['regular'] || font.files[font.variants[0]] || ''
    };

    this.fontSelected.emit(selectedFont);
  }
}
