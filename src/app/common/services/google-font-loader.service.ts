import {DOCUMENT} from "@angular/common";
import {inject, Service} from "@angular/core";
import {SelectedFont} from "@common/models/google-font.model";


/** The one link element the service owns, so a switch replaces rather than adds. */
const LINK_ID = "ct-google-font";


/**
 * Service for dynamically loading Google Fonts and managing font-family CSS
 * custom properties. Similar pattern to ColorThemeService for consistency.
 */
@Service()
export class GoogleFontLoaderService {

  readonly #document = inject(DOCUMENT);


  /**
   * Load a Google Font by replacing the link element in the document head.
   *
   * **The request asks for the family's own weights and no others.** `css2`
   * tolerates a `wght` axis naming weights a family does not have - it serves
   * what it has and drops the rest, and rejects only a family name it does
   * not know - so a fixed 100..900 ladder is not an error. It is a request for
   * faces that do not exist, made once per family, and it hides which weights
   * the visitor actually got. The list asked for here is the one the WEIGHT
   * slider stands on, so what is loaded and what can be selected are the same
   * set by construction. A selection that carries no weights asks for none,
   * which gets the family's default.
   *
   * **Nothing is cached.** The previous link is removed on every call, so a
   * remembered family would come back without a stylesheet the second time it
   * is chosen - the visitor switches away and back and the preview loses the
   * font.
   *
   * @param font - The font to load, or null to skip loading
   */
  public loadFont(font: SelectedFont | null): void {
    if (!font) return;

    this.#removePreviousFontLinks();

    const link = this.#document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.href = fontStylesheetUrl(font);

    this.#document.head.appendChild(link);
  }


  /**
   * Set font-family CSS custom property on the document body.
   * This makes the selected font available globally via CSS variables.
   *
   * @param font - The font to set, or null to remove the property
   */
  public setFontFamily(font: SelectedFont | null): void {
    if (!font) {
      this.#document.body.style.removeProperty("--ct-selected-font");
      return;
    }

    this.#document.body.style.setProperty("--ct-selected-font", `"${font.family}", ${font.category}`);
  }


  /**
   * Remove previous font link elements to avoid accumulation.
   */
  #removePreviousFontLinks(): void {
    const existingLink = this.#document.getElementById(LINK_ID);

    if (existingLink) {
      existingLink.remove();
    }
  }

}


/** The `css2` url for a selection, weights and all. */
function fontStylesheetUrl(font: SelectedFont): string {
  const familyParam = font.family.replace(/ /g, "+");
  const weights = [...font.weights].sort((a, b) => a - b);
  const axis = weights.length > 0 ? `:wght@${weights.join(";")}` : "";

  return `https://fonts.googleapis.com/css2?family=${familyParam}${axis}&display=swap`;
}
