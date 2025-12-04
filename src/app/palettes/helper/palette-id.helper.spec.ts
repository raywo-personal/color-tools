import chroma, {Color} from 'chroma-js';
import {isRestorable, paletteFromId, paletteIdFromPalette} from './palette-id.helper';
import {Palette, PALETTE_SLOTS} from '@palettes/models/palette.model';
import {paletteColorFrom} from '@palettes/models/palette-color.model';
import {PaletteStyle, PaletteStyles} from '@palettes/models/palette-style.model';


describe('Palette ID Helper', () => {

  /**
   * Helper function to create a test palette with given parameters
   */
  function createTestPalette(
    colors: Color[],
    startingColors: Color[],
    style: PaletteStyle,
    pinnedStates: boolean[] = [false, false, false, false, false]
  ): Palette {
    const paletteColors = PALETTE_SLOTS.reduce((acc, slot, index) => {
      acc[slot] = paletteColorFrom(
        colors[index],
        slot,
        startingColors[index],
        pinnedStates[index]
      );
      return acc;
    }, {} as any);

    return {
      id: '',
      name: 'Test Palette',
      style,
      ...paletteColors
    } as Palette;
  }

  describe('paletteIdFromPalette', () => {

    it('should generate a valid palette ID with fixed length', () => {
      const colors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFF00'),
        chroma('#FF00FF')
      ];
      const palette = createTestPalette(colors, colors, 'analogous');

      const id = paletteIdFromPalette(palette);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      // ID should always be exactly 43 characters (1 style + 42 base62)
      expect(id.length).toBe(43);
    });

    it('should generate IDs with fixed length regardless of color brightness', () => {
      // Test with very dark colors
      const darkColors = [
        chroma('#000000'),
        chroma('#010101'),
        chroma('#020202'),
        chroma('#030303'),
        chroma('#040404')
      ];
      const darkPalette = createTestPalette(darkColors, darkColors, 'monochromatic');

      // Test with bright colors
      const brightColors = [
        chroma('#FFFFFF'),
        chroma('#FEFEFE'),
        chroma('#FDFDFD'),
        chroma('#FCFCFC'),
        chroma('#FBFBFB')
      ];
      const brightPalette = createTestPalette(brightColors, brightColors, 'monochromatic');

      const darkId = paletteIdFromPalette(darkPalette);
      const brightId = paletteIdFromPalette(brightPalette);

      // Both IDs should have exactly the same length (43 characters)
      expect(darkId.length).toBe(43);
      expect(brightId.length).toBe(43);
    });

    it('should generate different IDs for different styles', () => {
      const colors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFF00'),
        chroma('#FF00FF')
      ];

      const ids = PaletteStyles.map(style => {
        const palette = createTestPalette(colors, colors, style);
        return paletteIdFromPalette(palette);
      });

      // All IDs should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(PaletteStyles.length);
    });

    it('should generate different IDs for different colors', () => {
      const palette1 = createTestPalette(
        [chroma('#FF0000'), chroma('#00FF00'), chroma('#0000FF'), chroma('#FFFF00'), chroma('#FF00FF')],
        [chroma('#FF0000'), chroma('#00FF00'), chroma('#0000FF'), chroma('#FFFF00'), chroma('#FF00FF')],
        'analogous'
      );

      const palette2 = createTestPalette(
        [chroma('#AA0000'), chroma('#00AA00'), chroma('#0000AA'), chroma('#AAAA00'), chroma('#AA00AA')],
        [chroma('#AA0000'), chroma('#00AA00'), chroma('#0000AA'), chroma('#AAAA00'), chroma('#AA00AA')],
        'analogous'
      );

      const id1 = paletteIdFromPalette(palette1);
      const id2 = paletteIdFromPalette(palette2);

      expect(id1).not.toBe(id2);
    });

    it('should generate different IDs for different pinned states', () => {
      const colors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFF00'),
        chroma('#FF00FF')
      ];

      const paletteNoPinned = createTestPalette(
        colors,
        colors,
        'analogous',
        [false, false, false, false, false]
      );

      const paletteWithPinned = createTestPalette(
        colors,
        colors,
        'analogous',
        [true, false, true, false, true]
      );

      const id1 = paletteIdFromPalette(paletteNoPinned);
      const id2 = paletteIdFromPalette(paletteWithPinned);

      expect(id1).not.toBe(id2);
    });

  });

  describe('paletteFromId & Round-trip encoding', () => {

    it('should correctly restore style from ID', () => {
      PaletteStyles.forEach(style => {
        const colors = [
          chroma('#FF0000'),
          chroma('#00FF00'),
          chroma('#0000FF'),
          chroma('#FFFF00'),
          chroma('#FF00FF')
        ];
        const originalPalette = createTestPalette(colors, colors, style);
        const id = paletteIdFromPalette(originalPalette);

        const restoredPalette = paletteFromId(id);

        expect(restoredPalette.style).toBe(style);
      });
    });

    it('should correctly restore colors from ID', () => {
      const colors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFF00'),
        chroma('#FF00FF')
      ];
      const originalPalette = createTestPalette(colors, colors, 'analogous');
      const id = paletteIdFromPalette(originalPalette);

      const restoredPalette = paletteFromId(id);

      PALETTE_SLOTS.forEach(slot => {
        const originalColor = originalPalette[slot].color;
        const restoredColor = restoredPalette[slot].color;

        // Colors should match within rounding tolerance (RGB values are rounded)
        const [or, og, ob] = originalColor.rgb();
        const [rr, rg, rb] = restoredColor.rgb();

        expect(Math.abs(or - rr)).toBeLessThanOrEqual(1);
        expect(Math.abs(og - rg)).toBeLessThanOrEqual(1);
        expect(Math.abs(ob - rb)).toBeLessThanOrEqual(1);
      });
    });

    it('should correctly restore starting colors from ID', () => {
      const colors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFF00'),
        chroma('#FF00FF')
      ];
      const startingColors = [
        chroma('#AA0000'),
        chroma('#00AA00'),
        chroma('#0000AA'),
        chroma('#AAAA00'),
        chroma('#AA00AA')
      ];
      const originalPalette = createTestPalette(colors, startingColors, 'analogous');
      const id = paletteIdFromPalette(originalPalette);

      const restoredPalette = paletteFromId(id);

      PALETTE_SLOTS.forEach(slot => {
        const originalStarting = originalPalette[slot].startingColor;
        const restoredStarting = restoredPalette[slot].startingColor;

        const [or, og, ob] = originalStarting.rgb();
        const [rr, rg, rb] = restoredStarting.rgb();

        expect(Math.abs(or - rr)).toBeLessThanOrEqual(1);
        expect(Math.abs(og - rg)).toBeLessThanOrEqual(1);
        expect(Math.abs(ob - rb)).toBeLessThanOrEqual(1);
      });
    });

    it('should correctly restore pinned states from ID', () => {
      const colors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFF00'),
        chroma('#FF00FF')
      ];
      const pinnedStates = [true, false, true, false, true];
      const originalPalette = createTestPalette(colors, colors, 'analogous', pinnedStates);
      const id = paletteIdFromPalette(originalPalette);

      const restoredPalette = paletteFromId(id);

      PALETTE_SLOTS.forEach((slot, index) => {
        expect(restoredPalette[slot].isPinned).toBe(pinnedStates[index]);
      });
    });

    it('should handle all colors pinned', () => {
      const colors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFF00'),
        chroma('#FF00FF')
      ];
      const pinnedStates = [true, true, true, true, true];
      const originalPalette = createTestPalette(colors, colors, 'triadic', pinnedStates);
      const id = paletteIdFromPalette(originalPalette);

      const restoredPalette = paletteFromId(id);

      PALETTE_SLOTS.forEach(slot => {
        expect(restoredPalette[slot].isPinned).toBe(true);
      });
    });

    it('should handle no colors pinned', () => {
      const colors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFF00'),
        chroma('#FF00FF')
      ];
      const pinnedStates = [false, false, false, false, false];
      const originalPalette = createTestPalette(colors, colors, 'complementary', pinnedStates);
      const id = paletteIdFromPalette(originalPalette);

      const restoredPalette = paletteFromId(id);

      PALETTE_SLOTS.forEach(slot => {
        expect(restoredPalette[slot].isPinned).toBe(false);
      });
    });

    it('should handle edge case colors (black, white, gray)', () => {
      // Test with extreme color values including pure black
      const colors = [
        chroma('#000000'), // Pure black
        chroma('#FFFFFF'), // White
        chroma('#808080'), // Gray
        chroma('#FF0000'), // Red
        chroma('#00FF00')  // Green
      ];
      const originalPalette = createTestPalette(colors, colors, 'monochromatic');
      const id = paletteIdFromPalette(originalPalette);

      // ID should have fixed length
      expect(id.length).toBe(43);
      expect(isRestorable(id)).toBe(true);

      const restoredPalette = paletteFromId(id);

      PALETTE_SLOTS.forEach((slot, index) => {
        const [or, og, ob] = colors[index].rgb();
        const [rr, rg, rb] = restoredPalette[slot].color.rgb();

        expect(Math.abs(or - rr)).toBeLessThanOrEqual(1);
        expect(Math.abs(og - rg)).toBeLessThanOrEqual(1);
        expect(Math.abs(ob - rb)).toBeLessThanOrEqual(1);
      });
    });

    it('should complete full round-trip without data loss', () => {
      const colors = [
        chroma('#AB12CD'),
        chroma('#34EF56'),
        chroma('#7890AB'),
        chroma('#CDEF01'),
        chroma('#234567')
      ];
      const startingColors = [
        chroma('#112233'),
        chroma('#445566'),
        chroma('#778899'),
        chroma('#AABBCC'),
        chroma('#DDEEFF')
      ];
      const pinnedStates = [true, false, true, false, false];
      const style: PaletteStyle = 'vibrant-balanced';

      const originalPalette = createTestPalette(colors, startingColors, style, pinnedStates);
      const id = paletteIdFromPalette(originalPalette);
      const restoredPalette = paletteFromId(id);

      // Verify style
      expect(restoredPalette.style).toBe(style);

      // Verify all colors, starting colors, and pinned states
      PALETTE_SLOTS.forEach((slot, index) => {
        // Check colors
        const [or, og, ob] = colors[index].rgb();
        const [rr, rg, rb] = restoredPalette[slot].color.rgb();
        expect(Math.abs(or - rr)).toBeLessThanOrEqual(1);
        expect(Math.abs(og - rg)).toBeLessThanOrEqual(1);
        expect(Math.abs(ob - rb)).toBeLessThanOrEqual(1);

        // Check starting colors
        const [osr, osg, osb] = startingColors[index].rgb();
        const [rsr, rsg, rsb] = restoredPalette[slot].startingColor.rgb();
        expect(Math.abs(osr - rsr)).toBeLessThanOrEqual(1);
        expect(Math.abs(osg - rsg)).toBeLessThanOrEqual(1);
        expect(Math.abs(osb - rsb)).toBeLessThanOrEqual(1);

        // Check pinned state
        expect(restoredPalette[slot].isPinned).toBe(pinnedStates[index]);
      });
    });

  });

  describe('isRestorable', () => {

    it('should return true for valid palette IDs', () => {
      const colors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFF00'),
        chroma('#FF00FF')
      ];
      const palette = createTestPalette(colors, colors, 'analogous');
      const id = paletteIdFromPalette(palette);

      expect(isRestorable(id)).toBe(true);
    });

    it('should return false for IDs that are too short', () => {
      const invalidId = '0123456789'; // Only 10 characters (expected: 43)

      expect(isRestorable(invalidId)).toBe(false);
    });

    it('should return false for IDs that are too long', () => {
      const invalidId = '0' + 'a'.repeat(50); // 51 characters (expected: 43)

      expect(isRestorable(invalidId)).toBe(false);
    });

    it('should return false for IDs with incorrect length', () => {
      const invalidId = '0' + 'a'.repeat(41); // 42 characters (expected: 43)

      expect(isRestorable(invalidId)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isRestorable('')).toBe(false);
    });

    it('should validate all generated IDs from all styles', () => {
      const colors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFF00'),
        chroma('#FF00FF')
      ];

      PaletteStyles.forEach(style => {
        const palette = createTestPalette(colors, colors, style);
        const id = paletteIdFromPalette(palette);

        expect(isRestorable(id)).toBe(true);
      });
    });

  });

  describe('ID format validation', () => {

    it('should start with valid style index (0-7)', () => {
      PaletteStyles.forEach((style, index) => {
        const colors = [
          chroma('#FF0000'),
          chroma('#00FF00'),
          chroma('#0000FF'),
          chroma('#FFFF00'),
          chroma('#FF00FF')
        ];
        const palette = createTestPalette(colors, colors, style);
        const id = paletteIdFromPalette(palette);

        expect(id[0]).toBe(index.toString());
      });
    });

    it('should contain only valid base62 characters after style index', () => {
      const colors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFF00'),
        chroma('#FF00FF')
      ];
      const palette = createTestPalette(colors, colors, 'analogous');
      const id = paletteIdFromPalette(palette);

      const base62Part = id.substring(1);
      const base62Regex = /^[0-9A-Za-z]+$/;

      expect(base62Regex.test(base62Part)).toBe(true);
    });

    it('should generate consistent IDs for identical palettes', () => {
      const colors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFF00'),
        chroma('#FF00FF')
      ];

      const palette1 = createTestPalette(colors, colors, 'triadic', [true, false, true, false, false]);
      const palette2 = createTestPalette(colors, colors, 'triadic', [true, false, true, false, false]);

      const id1 = paletteIdFromPalette(palette1);
      const id2 = paletteIdFromPalette(palette2);

      expect(id1).toBe(id2);
    });

  });

  describe('Error handling', () => {

    it('should throw error when trying to restore invalid ID', () => {
      const invalidId = 'invalid';

      expect(() => paletteFromId(invalidId)).toThrow();
    });

    it('should throw error for malformed ID during restoration', () => {
      const malformedId = '0!!!invalid!!!';

      expect(() => paletteFromId(malformedId)).toThrow();
    });

  });

  describe('Edge cases and color value extremes', () => {

    it('should handle very dark colors with fixed length IDs', () => {
      // Very dark colors (low RGB values) now produce IDs with consistent length
      const darkColors = [
        chroma('#000000'),
        chroma('#010101'),
        chroma('#020202'),
        chroma('#030303'),
        chroma('#040404')
      ];
      const palette = createTestPalette(darkColors, darkColors, 'monochromatic');
      const id = paletteIdFromPalette(palette);

      // ID should always be exactly 43 characters with leading zero padding
      expect(id.length).toBe(43);
      expect(isRestorable(id)).toBe(true);

      // Should be able to restore the palette
      const restored = paletteFromId(id);
      expect(restored).toBeDefined();
      expect(restored.style).toBe('monochromatic');

      // Verify colors are restored correctly
      PALETTE_SLOTS.forEach((slot, index) => {
        const [or, og, ob] = darkColors[index].rgb();
        const [rr, rg, rb] = restored[slot].color.rgb();

        expect(Math.abs(or - rr)).toBeLessThanOrEqual(1);
        expect(Math.abs(og - rg)).toBeLessThanOrEqual(1);
        expect(Math.abs(ob - rb)).toBeLessThanOrEqual(1);
      });
    });

    it('should handle colors with maximum RGB values', () => {
      const brightColors = [
        chroma('#FFFFFF'),
        chroma('#FFFFFE'),
        chroma('#FFFFFD'),
        chroma('#FFFFFB'),
        chroma('#FFFFF9')
      ];
      const palette = createTestPalette(brightColors, brightColors, 'vibrant-balanced');
      const id = paletteIdFromPalette(palette);

      expect(isRestorable(id)).toBe(true);

      const restored = paletteFromId(id);
      PALETTE_SLOTS.forEach((slot, index) => {
        const [or, og, ob] = brightColors[index].rgb();
        const [rr, rg, rb] = restored[slot].color.rgb();

        expect(Math.abs(or - rr)).toBeLessThanOrEqual(1);
        expect(Math.abs(og - rg)).toBeLessThanOrEqual(1);
        expect(Math.abs(ob - rb)).toBeLessThanOrEqual(1);
      });
    });

    it('should handle alternating min/max color values', () => {
      const extremeColors = [
        chroma('#FF0000'),
        chroma('#00FF00'),
        chroma('#0000FF'),
        chroma('#FFFFFF'),
        chroma('#101010')
      ];
      const palette = createTestPalette(extremeColors, extremeColors, 'high-contrast');
      const id = paletteIdFromPalette(palette);

      expect(isRestorable(id)).toBe(true);

      const restored = paletteFromId(id);
      expect(restored.style).toBe('high-contrast');
    });

  });

});
