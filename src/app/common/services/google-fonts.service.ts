import {Injectable, resource, ResourceRef, signal} from '@angular/core';
import {GoogleFont, GoogleFontsApiResponse} from '@common/models/google-font.model';

/**
 * Service for fetching and managing Google Fonts data
 */
@Injectable({
  providedIn: 'root'
})
export class GoogleFontsService {
  /**
   * API key for Google Fonts API (optional, can be set via environment or config)
   * If not set, the API will still work but may have rate limits
   */
  private readonly apiKey = signal<string | null>(null);

  /**
   * Resource for fetching Google Fonts
   * Uses Angular's new httpResource feature for efficient data loading
   */
  public readonly fontsResource: ResourceRef<GoogleFont[]> = resource({
    request: () => ({apiKey: this.apiKey()}),
    loader: async ({request}) => {
      const baseUrl = 'https://www.googleapis.com/webfonts/v1/webfonts';
      const url = request.apiKey
        ? `${baseUrl}?key=${request.apiKey}&sort=popularity`
        : `${baseUrl}?sort=popularity`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch Google Fonts: ${response.statusText}`);
      }

      const data: GoogleFontsApiResponse = await response.json();
      return data.items || [];
    }
  });

  /**
   * Set the API key for Google Fonts API
   * @param key - Google Fonts API key
   */
  public setApiKey(key: string): void {
    this.apiKey.set(key);
  }

  /**
   * Get a specific font by family name
   * @param family - Font family name
   * @returns The font if found, undefined otherwise
   */
  public getFontByFamily(family: string): GoogleFont | undefined {
    const fonts = this.fontsResource.value();
    return fonts?.find(font => font.family === family);
  }

  /**
   * Filter fonts by category
   * @param category - Font category (e.g., 'serif', 'sans-serif')
   * @returns Filtered list of fonts
   */
  public filterByCategory(category: string): GoogleFont[] {
    const fonts = this.fontsResource.value();
    return fonts?.filter(font => font.category === category) || [];
  }

  /**
   * Search fonts by family name (case-insensitive)
   * @param query - Search query
   * @returns Filtered list of fonts matching the query
   */
  public searchFonts(query: string): GoogleFont[] {
    const fonts = this.fontsResource.value();
    const lowerQuery = query.toLowerCase();
    return fonts?.filter(font =>
      font.family.toLowerCase().includes(lowerQuery)
    ) || [];
  }
}
