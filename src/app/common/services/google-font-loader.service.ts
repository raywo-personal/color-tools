import {DOCUMENT} from "@angular/common";
import {inject, Service} from "@angular/core";
import {SelectedFont} from "@common/models/google-font.model";
import {FONT_WEIGHTS} from "@engine/contrast/apca-lookup-table.model";


/**
 * What every link element the service owns starts with, so a switch removes
 * exactly the stylesheets it added and nothing the head carried before.
 */
const LINK_PREFIX = "ct-google-font-";


/**
 * What a face known by name alone is asked for: every weight on the grid,
 * not the slider's narrower range, so a family that ships only weights
 * outside it still gets a stylesheet.
 */
const WEIGHT_GRID: readonly number[] = FONT_WEIGHTS.map(Number);


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
   * what it has and drops the rest - and rejects a family name it does not
   * know or a list in which no weight exists. The list asked for here is the
   * one the WEIGHT slider stands on, so what is loaded and what can be
   * selected are the same set by construction.
   *
   * **A face known by name alone asks for the whole grid.** Its weights come
   * from the catalogue, which arrives after the first paint. Without an axis
   * Google serves the default weight alone and a role set at 700 is drawn in
   * synthesised bold until the catalogue answers, and for good where it never
   * does. Not the role's weight alone: a family that does not ship it would
   * get no stylesheet at all.
   *
   * **A family already in the head is left alone while its link covers the
   * weights asked for.** Replacing the link makes the browser fetch the
   * stylesheet again and the preview flashes through its fallback, so a link
   * that asked for the grid stays when the catalogue completes the face. A
   * link that lacks a weight is replaced: the id keys the family alone, and a
   * v1 selection may carry fewer weights than a second role in that family
   * asks for - without the replacement that role would stand on a weight the
   * head never loaded, in the browser's synthesised face, with the rating
   * measuring it.
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
        if (!covers(link.href, requestedWeights(font))) link.href = href;
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


/**
 * The weights the stylesheet for a selection asks for, ascending - the grid
 * for a face that carries none, as `needsCatalogue()` marks it.
 */
function requestedWeights(font: SelectedFont): readonly number[] {
  return font.weights.length > 0 ? [...font.weights].sort((a, b) => a - b) : WEIGHT_GRID;
}


/** The `css2` url for a selection, weights and all. */
function fontStylesheetUrl(font: SelectedFont): string {
  const familyParam = font.family.replace(/ /g, "+");

  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${requestedWeights(font).join(";")}&display=swap`;
}


/** Whether a stylesheet url this service wrote asks for every given weight. */
function covers(href: string, weights: readonly number[]): boolean {
  const axis = new URL(href).searchParams.get("family")?.split(":wght@")[1] ?? "";
  const loaded = new Set(axis.split(";").map(Number));

  return weights.every(weight => loaded.has(weight));
}
