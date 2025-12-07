import {Component, computed, DestroyRef, effect, ElementRef, inject, input, linkedSignal, model, OnInit, signal, untracked} from "@angular/core";
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

  // Internal HSV state
  protected readonly hue = signal<number>(0);
  protected readonly saturation = signal<number>(100);
  protected readonly value = signal<number>(100);

  // Popup state
  protected readonly isOpen = signal<boolean>(false);

  // Text input value
  protected readonly inputValue = signal<string>("");

  // Current format for display
  protected readonly currentFormat = linkedSignal<ColorSpace>(() => {
    return this.format();
  });

  // Computed current color from HSV
  protected readonly currentColor = computed(() => {
    return chroma.hsv(this.hue(), this.saturation() / 100, this.value() / 100);
  });

  // Formatted color string for display
  protected readonly colorString = computed(() => {
    const color = this.currentColor();

    return this.formatColor(color);
  });

  // Preview color CSS
  protected readonly previewColor = computed(() => this.currentColor().css());


  // Two-way binding for the color
  public readonly color = model.required<Color>();
  // Optional inputs
  public readonly format = input<ColorSpace>("hex");
  public readonly disabled = input<boolean>(false);


  constructor() {
    // Sync external color to internal HSV state
    effect(() => {
      const externalColor = this.color();

      if (externalColor) {
        const [h, s, v] = externalColor.hsv();
        this.hue.set(h || 0);
        this.saturation.set(Math.round(s * 100));
        this.value.set(Math.round(v * 100));
        this.inputValue.set(this.formatColor(externalColor));
      }
    });

    // Sync internal color changes to external model
    effect(() => {
      const internalColor = this.currentColor();
      // Only update if significantly different to avoid loops
      const external = untracked(() => this.color());

      if (external && chroma.deltaE(internalColor, external) > 0.5) {
        this.color.set(internalColor);
      }
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
    this.syncToModel();
  }


  protected onSaturationChanged(saturation: number): void {
    this.saturation.set(saturation);
    this.syncToModel();
  }


  protected onValueChanged(value: number): void {
    this.value.set(value);
    this.syncToModel();
  }


  protected onInputChange(): void {
    const inputVal = this.inputValue();

    if (chroma.valid(inputVal)) {
      const newColor = chroma(inputVal);
      const [h, s, v] = newColor.hsv();
      this.hue.set(h || 0);
      this.saturation.set(Math.round(s * 100));
      this.value.set(Math.round(v * 100));
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
