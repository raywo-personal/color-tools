import {EventInstance} from "@ngrx/signals/events";
import {generatePalette, generatePaletteFrom, paletteFrom} from "@engine/palette/palette.helper";
import {Palette, PALETTE_SLOTS, PaletteColors} from "@engine/palette/palette.model";
import {PaletteStyle, randomStyle} from "@engine/palette/palette-style.model";
import {paletteFromId} from "@engine/palette/palette-id.helper";
import {PaletteColor} from "@engine/palette/palette-color.model";
import {AppState} from "@core/models/app-state.model";
import {randomSeed} from "@engine/helpers/random.helper";


export function newRandomPaletteReducer(
  this: void
) {
  const style: PaletteStyle = "random";

  return {
    currentPalette: generatePalette(style),
    paletteStyle: style
  };
}


export function newRandomPaletteWithNavReducer(
  this: void
) {
  const style: PaletteStyle = "random";

  return {
    currentPalette: generatePalette(style),
    paletteStyle: style
  };
}


export function newPaletteWithNavReducer(
  this: void,
  event: EventInstance<"[Palettes] newPaletteWithNav", void>,
  state: AppState
) {
  const paletteColors = getPinnedPaletteColors(state);
  const style = state.useRandomStyle ? randomStyle() : state.paletteStyle;

  return {
    currentPalette: generatePalette(style, paletteColors),
    paletteStyle: style
  };
}


export function restorePaletteReducer(
  this: void,
  event: EventInstance<"[Palettes] restorePalette", string>
) {
  try {
    const paletteId = event.payload;
    const palette = paletteFromId(paletteId);

    return {currentPalette: palette};
  } catch (e) {
    console.error("Failed to restore palette ", e);
    return {};
  }
}


export function updatePaletteColorReducer(
  this: void,
  event: EventInstance<"[Palettes] updatePaletteColor", PaletteColor>,
  state: AppState
) {
  const color = event.payload;
  const {currentPalette} = state;

  const updatedPalette = paletteFrom(
    {
      ...currentPalette,
      [color.slot]: color
    },
    currentPalette.style
  );

  return {currentPalette: updatedPalette};
}


export function paletteChangedReducer(
  this: void,
  event: EventInstance<"[Palettes] paletteChanged", Palette>
) {
  return {currentPalette: event.payload, paletteStyle: event.payload.style};
}


export function paletteChangedWithoutNavReducer(
  this: void,
  event: EventInstance<"[Palettes] paletteChangedWithoutNav", Palette>
) {
  return {currentPalette: event.payload, paletteStyle: event.payload.style};
}


export function useRandomChangedReducer(
  this: void,
  event: EventInstance<"[Palettes] useRandomChanged", boolean>
) {
  return {useRandomStyle: event.payload};
}


/**
 * Picks a style and rolls a palette in it on the current color.
 *
 * A pick is a roll: it draws a new seed, so picking the style that is already
 * set builds the palette again with other variations - which is how a palette
 * is rolled anew until the regenerate control has a place of its own.
 */
export function styleChangedReducer(
  this: void,
  event: EventInstance<"[Palettes] styleChanged", PaletteStyle>,
  state: AppState
) {
  const newStyle = event.payload;
  const seed = randomSeed();
  const paletteColors = getPinnedPaletteColors(state);
  const newPalette = generatePaletteFrom(state.currentColor, newStyle, seed, paletteColors);

  return {paletteStyle: newStyle, paletteSeed: seed, currentPalette: newPalette};
}


/**
 * Rebuilds the palette on the color the visitor has just moved to - every
 * frame of a drag included, so the palette is seen following while the
 * sliders are still in hand.
 *
 * With the seed the palette was rolled with, not a new one: the generators
 * jitter their members, and a fresh draw per frame would have four swatches
 * flicker while the fifth moves. Under the kept seed only the base changes
 * and the other four glide with it.
 *
 * Registered **after** the converter's own reducer for the same events and
 * reading the color from the state rather than from the payload, because one
 * of the events carries none: `newRandomColorWithNav` rolls its color inside
 * the reducer. Each case reducer reads the state fresh when its turn comes, so
 * the color here is already the new one.
 */
export function paletteFollowsColorReducer(
  this: void,
  event: EventInstance<
    "[Converter] colorChanged" | "[Converter] colorAdjusted" | "[Converter] newRandomColorWithNav",
    unknown
  >,
  state: AppState
) {
  const paletteColors = getPinnedPaletteColors(state);
  const palette = generatePaletteFrom(
    state.currentColor,
    state.paletteStyle,
    state.paletteSeed,
    paletteColors
  );

  return {currentPalette: palette};
}


export function seedHueChangedReducer(
  this: void,
  event: EventInstance<"[Palettes] seedHueChanged", number>,
  state: AppState
) {
  const hue = event.payload;
  const style = state.paletteStyle;
  const paletteColors = getPinnedPaletteColors(state);
  const palette = generatePalette(style, paletteColors, hue);

  return {currentPalette: palette};
}


function getPinnedPaletteColors(state: AppState) {
  const paletteColors: Partial<PaletteColors> = {};

  PALETTE_SLOTS.forEach(slot => {
    const color = state.currentPalette[slot];

    if (color.isPinned) paletteColors[slot] = color;
  });

  return paletteColors;
}
