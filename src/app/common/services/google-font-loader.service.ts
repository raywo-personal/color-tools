import {DOCUMENT} from "@angular/common";
import {inject, Injectable} from "@angular/core";
import {SelectedFont} from "@common/models/google-font.model";


/**
 * Service for dynamically loading Google Fonts and managing font-family CSS
 * custom properties. Similar pattern to ColorThemeService for consistency.
 */
@Injectable({
  providedIn: "root"
})
export class GoogleFontLoaderService {

  readonly #document = inject(DOCUMENT);
  readonly #loadedFonts = new Set<string>();


  /**
   * Load a Google Font by adding a link element to the document head.
   * Loads all common weights (100-900) for compatibility with text samples.
   *
   * @param font - The font to load, or null to skip loading
   */
  public loadFont(font: SelectedFont | null): void {
    if (!font) return;

    const fontKey = `${font.family}-${font.variant}`;

    // Avoid loading the same font multiple times
    if (this.#loadedFonts.has(fontKey)) return;

    // Remove previous font link if exists (optional cleanup)
    this.#removePreviousFontLinks();

    // Create new link element
    const link = this.#document.createElement("link");
    link.id = "ct-google-font";
    link.rel = "stylesheet";

    // Load all common weights for better flexibility in text samples
    const weights = "100;200;300;400;500;600;700;800;900";
    const familyParam = font.family.replace(/ /g, "+");
    link.href = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weights}&display=swap`;

    this.#document.head.appendChild(link);
    this.#loadedFonts.add(fontKey);
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
    const existingLink = this.#document.getElementById("ct-google-font");

    if (existingLink) {
      existingLink.remove();
    }
  }
}
