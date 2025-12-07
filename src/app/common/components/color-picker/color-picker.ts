import {Component, computed, DestroyRef, effect, ElementRef, inject, input, model, OnInit, signal} from "@angular/core";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {FormsModule} from "@angular/forms";
import {fromEvent} from "rxjs";
import {filter} from "rxjs/operators";
import chroma, {Color} from "chroma-js";

import {ColorAreaComponent} from "@common/components/color-area/color-area";
import {HueSliderComponent} from "@common/components/hue-slider/hue-slider";
import {ColorSpace} from "@common/models/color-space.model";


@Component({
  selector: "ct-color-picker",
  imports: [
    FormsModule,
    ColorAreaComponent,
    HueSliderComponent
  ],
  templateUrl: "./color-picker.html",
  styleUrl: "./color-picker.scss"
})
export class ColorPickerComponent implements OnInit {

  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  // Two-way binding for the color
  public readonly color = model.required<Color>();

  // Optional inputs
  public readonly format = input<ColorSpace>("hex");
  public readonly disabled = input<boolean>(false);

  // Internal HSL state
  protected readonly hue = signal<number>(0);
  protected readonly saturation = signal<number>(100);
  protected readonly lightness = signal<number>(50);

  // HSV values for ColorArea (computed from HSL)
  protected readonly hsvSaturation = signal<number>(100);
  protected readonly hsvValue = signal<number>(100);

  // Popup state
  protected readonly isOpen = signal<boolean>(false);

  // Text input value
  protected readonly inputValue = signal<string>("");

  // Current format for display
  protected readonly currentFormat = signal<ColorSpace>("hex");

  // Computed current color from HSL
  protected readonly currentColor = computed(() => {
    return chroma.hsl(this.hue(), this.saturation() / 100, this.lightness() / 100);
  });

  // Formatted color string for display
  protected readonly colorString = computed(() => {
    const color = this.currentColor();
    switch (this.currentFormat()) {
      case "rgb":
        const [r, g, b] = color.rgb();
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      case "hsl":
        const [h, s, l] = color.hsl();
        return `hsl(${Math.round(h || 0)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
      case "hex":
      default:
        return color.hex();
    }
  });

  // Preview color CSS
  protected readonly previewColor = computed(() => this.currentColor().css());


  constructor() {
    // Sync external color to internal HSL state and HSV for ColorArea
    effect(() => {
      const externalColor = this.color();
      if (externalColor) {
        const [h, s, l] = externalColor.hsl();
        this.hue.set(h || 0);
        this.saturation.set(Math.round(s * 100));
        this.lightness.set(Math.round(l * 100));
        this.inputValue.set(this.formatColor(externalColor));

        // Also update HSV values for ColorArea
        const [, hsvS, hsvV] = externalColor.hsv();
        this.hsvSaturation.set(Math.round(hsvS * 100));
        this.hsvValue.set(Math.round(hsvV * 100));
      }
    });

    // Sync internal color changes to external model
    effect(() => {
      const internalColor = this.currentColor();
      // Only update if significantly different to avoid loops
      const external = this.color();
      if (external && chroma.deltaE(internalColor, external) > 0.5) {
        this.color.set(internalColor);
      }
    });

    // Initialize format from input
    effect(() => {
      this.currentFormat.set(this.format());
    });
  }


  ngOnInit(): void {
    // Handle click outside to close popup
    fromEvent<MouseEvent>(document, "click")
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(() => this.isOpen())
      )
      .subscribe(event => {
        if (!this.elementRef.nativeElement.contains(event.target)) {
          this.isOpen.set(false);
        }
      });

    // Handle escape key to close popup
    fromEvent<KeyboardEvent>(document, "keydown")
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(event => event.key === "Escape"),
        filter(() => this.isOpen())
      )
      .subscribe(() => {
        this.isOpen.set(false);
      });
  }


  protected togglePopup(): void {
    if (this.disabled()) return;
    this.isOpen.update(open => !open);
  }


  protected onHueChanged(hue: number): void {
    this.hue.set(hue);
    // Recalculate HSL from new hue + existing HSV saturation/value
    this.syncHsvToHsl();
  }


  // Called when ColorArea changes saturation (HSV)
  protected onHsvSaturationChanged(hsvSaturation: number): void {
    this.hsvSaturation.set(hsvSaturation);
    this.syncHsvToHsl();
  }

  // Called when ColorArea changes value (HSV)
  protected onHsvValueChanged(hsvValue: number): void {
    this.hsvValue.set(hsvValue);
    this.syncHsvToHsl();
  }

  // Convert HSV from ColorArea to internal HSL
  private syncHsvToHsl(): void {
    const color = chroma.hsv(this.hue(), this.hsvSaturation() / 100, this.hsvValue() / 100);
    const [, s, l] = color.hsl();
    this.saturation.set(Math.round(s * 100));
    this.lightness.set(Math.round(l * 100));
    this.syncToModel();
  }


  protected onInputChange(): void {
    const inputVal = this.inputValue();
    if (chroma.valid(inputVal)) {
      const newColor = chroma(inputVal);
      const [h, s, l] = newColor.hsl();
      this.hue.set(h || 0);
      this.saturation.set(Math.round(s * 100));
      this.lightness.set(Math.round(l * 100));

      // Also update HSV values for ColorArea
      const [, hsvS, hsvV] = newColor.hsv();
      this.hsvSaturation.set(Math.round(hsvS * 100));
      this.hsvValue.set(Math.round(hsvV * 100));

      this.syncToModel();
    }
  }


  protected cycleFormat(): void {
    const formats: ColorSpace[] = ["hex", "rgb", "hsl"];
    const currentIndex = formats.indexOf(this.currentFormat());
    const nextIndex = (currentIndex + 1) % formats.length;
    this.currentFormat.set(formats[nextIndex]);
    this.inputValue.set(this.colorString());
  }


  private syncToModel(): void {
    this.color.set(this.currentColor());
    this.inputValue.set(this.colorString());
  }


  private formatColor(color: Color): string {
    switch (this.currentFormat()) {
      case "rgb":
        return color.css("rgb");
      case "hsl":
        return color.css("hsl");
      case "hex":
      default:
        return color.hex();
    }
  }


  protected copyToClipboard() {
    void navigator.clipboard.writeText(this.inputValue());
  }

}
