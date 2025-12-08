import {Injectable} from "@angular/core";
import {GoogleFont, GoogleFontsApiResponse} from "@common/models/google-font.model";
import {httpResource, HttpResourceRef} from "@angular/common/http";
import {environment} from "@environments/environment";


/**
 * Service for fetching and managing Google Fonts data
 */
@Injectable({
  providedIn: "root"
})
export class GoogleFontsService {

  /**
   * Resource for fetching Google Fonts
   * Uses Angular's httpResource for efficient data loading
   */
  public readonly fontsResource: HttpResourceRef<GoogleFontsApiResponse | undefined> = httpResource(
    () => {
      return `${(environment.webFontsApiUrl)}?sort=popularity`;
    }
  );


  /**
   * Get a specific font by family name
   * @param family - Font family name
   * @returns The font if found, undefined otherwise
   */
  public getFontByFamily(family: string): GoogleFont | undefined {
    const data = this.fontsResource.value();
    return data?.items?.find(font => font.family === family);
  }


  /**
   * Filter fonts by category
   * @param category - Font category (e.g., 'serif', 'sans-serif')
   * @returns Filtered list of fonts
   */
  public filterByCategory(category: string): GoogleFont[] {
    const data = this.fontsResource.value();
    return data?.items?.filter(font => font.category === category) || [];
  }


  /**
   * Search fonts by family name (case-insensitive)
   * @param query - Search query
   * @returns Filtered list of fonts matching the query
   */
  public searchFonts(query: string): GoogleFont[] {
    const data = this.fontsResource.value();
    const lowerQuery = query.toLowerCase();
    return data?.items?.filter(font =>
      font.family.toLowerCase().includes(lowerQuery)
    ) || [];
  }
}
