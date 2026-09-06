import {DOCUMENT} from "@angular/common";
import {inject, Service} from "@angular/core";
import {SelectedFont} from "@common/models/google-font.model";


/**
 * What every link element the service owns starts with, so a switch removes
 * exactly the stylesheets it added and nothing the head carried before.
 */
const LINK_PREFIX = "ct-google-font-";


/**
 * Service for dynamically loading Google Fonts and managing font-family CSS
 * custom properties. Similar pattern to ColorThemeService for consistency.
 */
@Service()
export class GoogleFontLoaderService {

  readonly #document = inject(DOCUMENT);


  /**
   * Puts one stylesheet per chosen family into the head, and takes out the
   * ones no role uses any more.
   *
   * **One link per family, not per role.** Two roles set in the same family
   * share a stylesheet, and a role switched to another face leaves the family
   * standing as long as another role still reads it - the weights asked for
   * are the family's, so what the roles share is the same file.
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
   * **A family already in the head is left alone while its url still holds.**
   * Replacing the link makes the browser fetch the stylesheet again and the
   * preview flashes through its fallback, so what decides is the url and not
   * the id: the id keys the family alone, and a selection stored before the
   * weights existed asks for none - without the comparison a second role in
   * that family would stand on a weight the head never loaded, in the
   * browser's synthesised face, with the rating measuring it.
   *
   * @param fonts - The faces the roles are set in; nulls are skipped
   */
  public loadFonts(fonts: Iterable<SelectedFont | null>): void {
    const wanted = new Map<string, SelectedFont>();

    for (const font of fonts) {
      if (font) wanted.set(linkIdFor(font), font);
    }

    const standing = new Map(this.#ownLinks().map(link => [link.id, link] as const));

    for (const [id, link] of standing) {
      if (!wanted.has(id)) link.remove();
    }

    for (const [id, font] of wanted) {
      const href = fontStylesheetUrl(font);
      const link = standing.get(id);

      if (link) {
        if (link.href !== href) link.href = href;
        continue;
      }

      const added = this.#document.createElement("link");
      added.id = id;
      added.rel = "stylesheet";
      added.href = href;

      this.#document.head.appendChild(added);
    }
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


  /** The link elements this service put into the head. */
  #ownLinks(): HTMLLinkElement[] {
    return Array.from(this.#document.head.querySelectorAll<HTMLLinkElement>(`link[id^="${LINK_PREFIX}"]`));
  }

}


/** The id the family's link carries; spaces become `+`, as in the url. */
function linkIdFor(font: SelectedFont): string {
  return `${LINK_PREFIX}${font.family.replace(/ /g, "+")}`;
}


/** The `css2` url for a selection, weights and all. */
function fontStylesheetUrl(font: SelectedFont): string {
  const familyParam = font.family.replace(/ /g, "+");
  const weights = [...font.weights].sort((a, b) => a - b);
  const axis = weights.length > 0 ? `:wght@${weights.join(";")}` : "";

  return `https://fonts.googleapis.com/css2?family=${familyParam}${axis}&display=swap`;
}
