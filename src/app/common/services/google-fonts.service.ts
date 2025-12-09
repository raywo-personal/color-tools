import {Injectable} from "@angular/core";
import {GoogleFont, GoogleFontsApiResponse} from "@common/models/google-font.model";
import {httpResource, HttpResourceRef} from "@angular/common/http";
import {environment} from "@environments/environment";


/**
 * Service for interacting with the Google Fonts API.
 * Provides methods for fetching and searching Google Fonts data.
 */
@Injectable({
  providedIn: "root"
})
export class GoogleFontsService {

  /**
   * Resource for fetching Google Fonts sorted by popularity.
   */
  public readonly googleFonts: HttpResourceRef<GoogleFontsApiResponse | undefined> = httpResource(
    () => {
      return `${(environment.webFontsApiUrl)}?sort=popularity`;
    }
  );


  /**
   * Searches for fonts matching the given query and returns a list of fonts
   * sorted by relevance.
   *
   * @param {string} query - The search term used to match font names.
   * @param {number} [limit=20] - The maximum number of fonts to return.
   *                              Defaults to 20.
   * @return {GoogleFont[]} A list of Google fonts that match the query,
   *                        sorted by relevance.
   */
  public searchFonts(query: string, limit: number = 20): GoogleFont[] {
    const data = this.googleFonts.value();

    if (!data?.items || !query.trim()) return [];

    const normalizedQuery = this.normalize(query.trim());

    type ScoredFont = { font: GoogleFont, score: number };
    type Matcher = (query: string) => boolean;

    const matchers: Matcher[] = [
      queryTerm => queryTerm === normalizedQuery,
      queryTerm => queryTerm.startsWith(normalizedQuery),
      queryTerm =>
        queryTerm.split(/\s+/).some(w => w.startsWith(normalizedQuery)),
      queryTerm => queryTerm.includes(normalizedQuery)
    ];

    const scored: ScoredFont[] = data.items
      .map(font => {
        const normalizedFamily = this.normalize(font.family);

        const index = matchers.findIndex(matcher => matcher(normalizedFamily));
        const baseScore = index === -1 ? 0 : matchers.length - index;

        if (baseScore === 0) return { font, score: 0 };

        const isSansSerif = font.category === "sans-serif";
        const categoryBonus = isSansSerif ? 0.25 : 0;
        const score = baseScore + categoryBonus;

        return {font, score};
      })
      .filter((entry: ScoredFont) => entry.score > 0)
      .sort((a: ScoredFont, b: ScoredFont) => b.score - a.score);

    return scored
      .slice(0, limit)
      .map((entry: ScoredFont) => entry.font);
  }


  /**
   * Normalizes a given string by converting it to lowercase, removing
   * diacritical marks, and ensuring a consistent character representation.
   *
   * @param {string} str - The input string to be normalized.
   * @return {string} The normalized string.
   */
  private normalize(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

}
