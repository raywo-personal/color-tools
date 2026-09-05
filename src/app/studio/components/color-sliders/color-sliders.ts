import {Component, computed, inject, linkedSignal, signal} from "@angular/core";
import {Color} from "chroma-js";
import {injectDispatch} from "@ngrx/signals/events";
import {AppStateStore} from "@core/app-state.store";
import {converterEvents} from "@core/converter/converter.events";
import {ColorSlider} from "@common/components/color-slider/color-slider";
import {fromHsl} from "@engine/color/color-from-hsl.helper";
import {fromOklch} from "@engine/color/color-from-oklch.helper";
import {maxChroma} from "@engine/color/oklch.helper";
import {hueWrap} from "@engine/color/hsl.helper";


/** Which three axes the panel is showing. */
type SliderSpace = "hsl" | "oklch";

interface SpaceOption {
  readonly value: SliderSpace;
  readonly label: string;
}

const SPACE_OPTIONS: readonly SpaceOption[] = [
  {value: "hsl", label: "HSL"},
  {value: "oklch", label: "OKLCH"}
];

/**
 * Hue in degrees, saturation and lightness in percent - the units on screen,
 * but not rounded to them; see `hsl` for why.
 */
interface Hsl {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

/** Lightness in percent, chroma as itself, hue in degrees - unrounded likewise. */
interface Oklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

/**
 * How many stops each gradient is built from.
 *
 * A hue ramp bends through every primary and needs the most; saturation and
 * chroma are close to linear and need the fewest. The numbers are the draft's.
 */
const HSL_HUE_STOPS = 12;
const HSL_SATURATION_STOPS = 6;
const HSL_LIGHTNESS_STOPS = 8;
const OKLCH_LIGHTNESS_STOPS = 10;
const OKLCH_CHROMA_STOPS = 8;
const OKLCH_HUE_STOPS = 14;

/**
 * The chroma an OKLch hue ramp, and the saturation an HSL hue ramp, is drawn
 * at when the color itself has almost none.
 *
 * A grey has no hue to show, so the honest ramp is a dozen identical greys -
 * and a track that never changes reads as a broken control rather than as a
 * neutral color. The floors show what the hues would look like if the visitor
 * gave the color some chroma. The two are about the same colorfulness in
 * either space.
 */
const HUE_RAMP_MIN_CHROMA = 0.12;
const HUE_RAMP_MIN_SATURATION = 50;

/** Chroma is written to three decimals, so its ceiling is reachable at three. */
const CHROMA_STEP = 0.001;

/**
 * The top of a hue slider.
 *
 * 359, not 360: `hueWrap()` puts every hue the app writes into [0, 360), and
 * `formatColor()` wraps 360 back to 0 for the same reason. A slider that could
 * stand at 360° would read one angle while the conversion list beside it read
 * another, for a color that is the same either way.
 */
const HUE_MAX = 359;


/**
 * The base color's three axes, in HSL or in OKLch.
 *
 * **The switch does not touch `displayColorSpace`.** The conversion list writes
 * all four formats whatever is selected here, so the store's field steers
 * nothing on this screen, and the two do not have the same shape: the switch
 * has two positions and `ColorSpace` has four values, so anything setting the
 * store to `hex` would leave the switch with no position to be in. The mode is
 * this panel's own view state.
 *
 * **A drag raises `colorAdjusted`, the end of it raises `colorChanged`.** The
 * swatch and the conversion list follow every frame, but only the value the
 * visitor settles on is written to localStorage - see the event's own comment.
 */
@Component({
  selector: "ct-color-sliders",
  imports: [ColorSlider],
  templateUrl: "./color-sliders.html",
  host: {
    "class": "block"
  }
})
export class ColorSliders {

  readonly #stateStore = inject(AppStateStore);
  readonly #dispatch = injectDispatch(converterEvents);

  protected readonly spaceOptions = SPACE_OPTIONS;

  protected readonly hueMax = HUE_MAX;

  protected readonly space = signal<SliderSpace>("hsl");

  /**
   * The three HSL values the sliders stand at.
   *
   * Kept rather than read off `currentColor()` every time, because the color
   * cannot hold all three: at a lightness of 0 or 100 every hue and saturation
   * is the same black or white, and at a saturation of 0 every hue is the same
   * grey. Re-deriving would drop the two the visitor is not touching, so
   * pulling lightness down and back up would return a different color than it
   * left.
   *
   * The values are given up as soon as the color no longer agrees with them -
   * the hex field, the picker or `Random` moving it - which is exactly what the
   * comparison below asks.
   *
   * They are kept unrounded, and `hslShown` rounds them for the control. A
   * value the visitor drags arrives on the slider's step anyway; one that
   * arrived with the color would otherwise be moved before the first touch.
   * That matters for OKLch, see `oklch`, and the two are kept alike.
   */
  protected readonly hsl = linkedSignal<Color, Hsl>({
    source: this.#stateStore.currentColor,
    computation: (color, previous) => {
      if (previous && sameColor(hslColor(previous.value), color)) return previous.value;

      return readHsl(color);
    }
  });

  /**
   * The OKLch values, kept for the same reason.
   *
   * Two of them are what the sliders stand at; the chroma is what the visitor
   * asked for, which the gamut need not hold - `oklchChroma` is the one on
   * screen.
   *
   * **Unrounded, because the chroma ceiling is evaluated at the hue.** Near
   * the sRGB cusps the ceiling falls steeply with it: `#000FF0` holds 0.302
   * at its own hue and 0.253 at the whole degree next to it. Rounding first
   * would have the chroma slider read lower than the conversion list for a
   * color that just arrived, and the first nudge of lightness would rebuild
   * the color at the lower ceiling - a visible jump for a move of 0.1 %.
   */
  protected readonly oklch = linkedSignal<Color, Oklch>({
    source: this.#stateStore.currentColor,
    computation: (color, previous) => {
      if (previous && sameColor(oklchColor(previous.value), color)) return previous.value;

      return readOklch(color);
    }
  });

  /**
   * How much chroma sRGB holds at the current lightness and hue.
   *
   * The chroma slider's own maximum, because there is no constant to use: the
   * ceiling sits at 0.104 for cyan and 0.273 for magenta at the same lightness,
   * and it falls to 0 at both ends of the lightness axis. A fixed maximum would
   * leave most of the track dead, and every value on the dead part would come
   * back clamped by `fromOklch()` to the same color.
   */
  protected readonly chromaCeiling = computed(() => {
    const {l, h} = this.oklch();

    return chromaCeilingAt(l, h);
  });

  /**
   * The chroma the slider stands at: what the visitor asked for, held down to
   * what sRGB has room for at the current lightness and hue.
   *
   * The request itself stays in `oklch` rather than being written back clamped.
   * The ceiling moves with the two other axes and is 0 at both ends of the
   * lightness axis, so storing the clamped value would make a trip through
   * either end - or repeated drags of the lightness slider - grind the color
   * down to a grey it never comes back from. This is the same thing the HSL
   * values are kept for, and clamping here rather than in the state keeps the
   * slider from claiming a chroma the color does not have.
   */
  protected readonly oklchChroma = computed(() =>
    Math.min(this.oklch().c, this.chromaCeiling()));

  /**
   * The values the controls stand at: the kept ones, rounded to each slider's
   * step the way `formatColor()` rounds them for the conversion list.
   */
  protected readonly hslShown = computed<Hsl>(() => {
    const {h, s, l} = this.hsl();

    return {h: displayHue(h), s: Math.round(s), l: Math.round(l)};
  });

  protected readonly oklchShown = computed<Oklch>(() => {
    const {l, h} = this.oklch();

    return {l: roundTo(l, 1), c: roundTo(this.oklchChroma(), 3), h: displayHue(h)};
  });

  protected readonly hslHueText = computed(() => `${this.hslShown().h}°`);
  protected readonly hslSaturationText = computed(() => `${this.hslShown().s}%`);
  protected readonly hslLightnessText = computed(() => `${this.hslShown().l}%`);

  protected readonly oklchLightnessText = computed(() => `${this.oklchShown().l.toFixed(1)}%`);
  protected readonly oklchChromaText = computed(() => this.oklchShown().c.toFixed(3));
  protected readonly oklchHueText = computed(() => `${this.oklchShown().h}°`);

  protected readonly hslHueTrack = computed(() => {
    const {s, l} = this.hsl();
    const saturation = Math.max(s, HUE_RAMP_MIN_SATURATION);

    return ramp(HSL_HUE_STOPS, t => hslColor({h: t * 360, s: saturation, l}));
  });

  protected readonly hslSaturationTrack = computed(() => {
    const {h, l} = this.hsl();

    return ramp(HSL_SATURATION_STOPS, t => hslColor({h, s: t * 100, l}));
  });

  protected readonly hslLightnessTrack = computed(() => {
    const {h, s} = this.hsl();

    return ramp(HSL_LIGHTNESS_STOPS, t => hslColor({h, s, l: t * 100}));
  });

  protected readonly oklchLightnessTrack = computed(() => {
    const {c, h} = this.oklch();

    return ramp(OKLCH_LIGHTNESS_STOPS, t => oklchColor({l: t * 100, c, h}));
  });

  protected readonly oklchChromaTrack = computed(() => {
    const {l, h} = this.oklch();
    const ceiling = this.chromaCeiling();

    return ramp(OKLCH_CHROMA_STOPS, t => oklchColor({l, c: t * ceiling, h}));
  });

  protected readonly oklchHueTrack = computed(() => {
    const {l, c} = this.oklch();
    const chromacity = Math.max(c, HUE_RAMP_MIN_CHROMA);

    return ramp(OKLCH_HUE_STOPS, t => oklchColor({l, c: chromacity, h: t * 360}));
  });


  protected selectSpace(space: SliderSpace): void {
    this.space.set(space);
  }


  protected hslHueChanged(hue: number): void {
    this.#adjustHsl({...this.hsl(), h: hue});
  }


  protected hslSaturationChanged(saturation: number): void {
    this.#adjustHsl({...this.hsl(), s: saturation});
  }


  protected hslLightnessChanged(lightness: number): void {
    this.#adjustHsl({...this.hsl(), l: lightness});
  }


  protected oklchLightnessChanged(lightness: number): void {
    this.#adjustOklch({...this.oklch(), l: lightness});
  }


  protected oklchChromaChanged(chromacity: number): void {
    this.#adjustOklch({...this.oklch(), c: chromacity});
  }


  protected oklchHueChanged(hue: number): void {
    this.#adjustOklch({...this.oklch(), h: hue});
  }


  /**
   * Ends a gesture on the color the drag has already put into the store.
   *
   * Taken from the store rather than rebuilt from the sliders, so the value
   * that is persisted is the one the rest of the app has been showing.
   */
  protected commit(): void {
    this.#dispatch.colorChanged(this.#stateStore.currentColor());
  }


  #adjustHsl(hsl: Hsl): void {
    this.hsl.set(hsl);
    this.#dispatch.colorAdjusted(hslColor(hsl));
  }


  /**
   * Moves the OKLch sliders.
   *
   * The chroma is kept as the visitor set it; `oklchColor()` builds the color
   * from as much of it as the gamut holds, and `oklchChroma` shows that same
   * amount. Lightness and hue both move the ceiling, so a request that is out
   * of reach now can be back in reach a moment later.
   */
  #adjustOklch(oklch: Oklch): void {
    this.oklch.set(oklch);
    this.#dispatch.colorAdjusted(oklchColor(oklch));
  }

}


function readHsl(color: Color): Hsl {
  const [hue, saturation, lightness] = color.hsl();

  return {
    h: keptHue(hue),
    s: saturation * 100,
    l: lightness * 100
  };
}


function readOklch(color: Color): Oklch {
  const [lightness, chromacity, hue] = color.oklch();

  return {
    l: lightness * 100,
    c: chromacity,
    h: keptHue(hue)
  };
}


/**
 * The hue as the panel keeps it.
 *
 * chroma-js reports NaN for the hue of a grey, where the angle carries no
 * information; the panel still needs a number to build from, and 0 is what the
 * conversion list shows for the same color.
 */
function keptHue(hue: number): number {
  return Number.isNaN(hue) ? 0 : hueWrap(hue);
}


/**
 * Rounds a hue for the slider, the way `formatColor()` rounds it for the list.
 *
 * Wrapping after rounding keeps 359.7 from becoming a 360 the app itself never
 * writes.
 */
function displayHue(hue: number): number {
  return hueWrap(Math.round(hue));
}


function hslColor(hsl: Hsl): Color {
  return fromHsl({h: hsl.h, s: hsl.s / 100, l: hsl.l / 100});
}


/**
 * Builds the color the three OKLch values stand for.
 *
 * The chroma is taken down to the slider's own ceiling first. `fromOklch()`
 * would clamp to the gamut boundary itself, which sits up to a step above that
 * ceiling - and the conversion list writes three decimals, so the row would
 * then disagree with the value beside the slider in its last digit.
 */
function oklchColor(oklch: Oklch): Color {
  const chromacity = Math.min(oklch.c, chromaCeilingAt(oklch.l, oklch.h));

  return fromOklch({l: oklch.l / 100, c: chromacity, h: oklch.h});
}


/**
 * Compares two colors the way the app stores them.
 *
 * 8-bit RGB, because that is what the swatch paints, what the hex field shows
 * and what localStorage keeps. Two triples that round to the same three bytes
 * are the same color as far as anything downstream can tell.
 */
function sameColor(a: Color, b: Color): boolean {
  return a.hex("rgb") === b.hex("rgb");
}


/** Rounded down, so the ceiling itself is a value the slider's step can reach. */
function chromaCeilingAt(lightness: number, hue: number): number {
  return roundTo(Math.floor(maxChroma(lightness / 100, hue) / CHROMA_STEP) * CHROMA_STEP, 3);
}


function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}


function ramp(stops: number, at: (position: number) => Color): string {
  const colors: string[] = [];

  for (let i = 0; i <= stops; i++) colors.push(at(i / stops).hex("rgb"));

  return `linear-gradient(90deg, ${colors.join(", ")})`;
}
