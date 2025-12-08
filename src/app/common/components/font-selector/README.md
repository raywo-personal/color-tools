# Font Selector Component

A reusable Angular component for selecting Google Fonts with typeahead search functionality.

## Features

- **Google Fonts Integration**: Fetches fonts from Google Fonts API sorted by popularity
- **Typeahead Search**: Fast, debounced search with autocomplete
- **State Management**: Integrates with @ngrx/signals store
- **httpResource**: Uses Angular's new `httpResource` feature for efficient data loading

## Usage

### Basic Usage

```typescript
import { Component, inject } from '@angular/core';
import { FontSelectorComponent } from '@common/components/font-selector/font-selector';
import { SelectedFont } from '@common/models/google-font.model';
import { AppStateStore } from '@core/app-state.store';
import { commonEvents } from '@core/common/common.events';

@Component({
  selector: 'app-example',
  imports: [FontSelectorComponent],
  template: `
    <app-font-selector
      [label]="'Choose a Font'"
      [placeholder]="'Type to search...'"
      (fontSelected)="onFontSelected($event)"
    />
  `
})
export class ExampleComponent {
  private readonly store = inject(AppStateStore);

  protected onFontSelected(font: SelectedFont): void {
    // Dispatch to store
    commonEvents.fontSelected(font);

    // Or use the font directly
    console.log('Selected font:', font);
  }
}
```

### With Initial Selection

```typescript
<app-font-selector
  [label]="'Font Family'"
  [initialFont]="'Roboto'"
  (fontSelected)="onFontSelected($event)"
/>
```

### Accessing Selected Font from Store

```typescript
import { Component, inject } from '@angular/core';
import { AppStateStore } from '@core/app-state.store';

@Component({
  selector: 'app-text-display',
  template: `
    @if (selectedFont(); as font) {
      <p [style.font-family]="font.family">
        Text displayed in {{ font.family }}
      </p>
    }
  `
})
export class TextDisplayComponent {
  private readonly store = inject(AppStateStore);
  protected readonly selectedFont = this.store.selectedFont;
}
```

### Loading Font Files

To use the selected font, you'll need to load the font file:

```typescript
import { Component, effect, inject } from '@angular/core';
import { AppStateStore } from '@core/app-state.store';

@Component({
  selector: 'app-root',
  template: '...'
})
export class AppComponent {
  private readonly store = inject(AppStateStore);

  constructor() {
    effect(() => {
      const font = this.store.selectedFont();
      if (font) {
        this.loadFont(font);
      }
    });
  }

  private loadFont(font: SelectedFont): void {
    // Create a link element to load the font
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${font.family.replace(' ', '+')}:wght@${font.variant}`;
    document.head.appendChild(link);
  }
}
```

## API

### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | `'Select Font'` | Label text displayed above the input |
| `placeholder` | `string` | `'Search for a font...'` | Placeholder text in the input field |
| `initialFont` | `string \| null` | `null` | Initial font family name to display |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `fontSelected` | `EventEmitter<SelectedFont>` | Emitted when a font is selected |

## Models

### SelectedFont

```typescript
interface SelectedFont {
  family: string;      // Font family name (e.g., 'Roboto')
  category: string;    // Font category (e.g., 'sans-serif')
  variant: string;     // Font variant (e.g., 'regular', '700')
  fileUrl: string;     // URL to the font file
}
```

## Service

### GoogleFontsService

The `GoogleFontsService` provides access to Google Fonts data:

```typescript
import { inject } from '@angular/core';
import { GoogleFontsService } from '@common/services/google-fonts.service';

const fontsService = inject(GoogleFontsService);

// Access fonts resource
const fonts = fontsService.fontsResource.value();

// Check loading state
const isLoading = fontsService.fontsResource.isLoading();

// Search fonts
const results = fontsService.searchFonts('Roboto');

// Filter by category
const serifFonts = fontsService.filterByCategory('serif');

// Set API key (optional)
fontsService.setApiKey('YOUR_API_KEY');
```

## State Management

The component integrates with the app's state store:

```typescript
// Dispatch font selection
import { commonEvents } from '@core/common/common.events';
commonEvents.fontSelected(selectedFont);

// Access from store
import { AppStateStore } from '@core/app-state.store';
const store = inject(AppStateStore);
const currentFont = store.selectedFont();
```

## Notes

- The Google Fonts API can work without an API key but may have rate limits
- Font loading is debounced with a 200ms delay for better performance
- Search results are limited to 20 fonts to maintain UI responsiveness
- Fonts are sorted by popularity by default
