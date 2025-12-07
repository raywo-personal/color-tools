import {Component, computed, ElementRef, input, model, signal, viewChild} from "@angular/core";
import chroma from "chroma-js";


@Component({
  selector: "ct-color-area",
  templateUrl: "./color-area.html",
  styleUrl: "./color-area.scss"
})
export class ColorAreaComponent {

  private readonly areaRef = viewChild.required<ElementRef<HTMLDivElement>>("area");

  // Track if user is dragging
  readonly #isDragging = signal(false);

  // Computed base color (full saturation/value at given hue)
  protected readonly baseColor = computed(() => {
    return chroma.hsv(this.hue(), 1, 1).css();
  });

  // Handle position as percentages
  protected readonly handleX = computed(() =>
    `${this.saturation()}%`);
  protected readonly handleY = computed(() =>
    `${100 - this.value()}%`);


  // Input: Hue determines the base color
  public readonly hue = input.required<number>();

  // Two-way bindings for saturation and value (HSV)
  public readonly saturation = model<number>(100);
  public readonly value = model<number>(100);


  protected onPointerDown(event: PointerEvent): void {
    this.#isDragging.set(true);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.updateFromEvent(event);
  }


  protected onPointerMove(event: PointerEvent): void {
    if (!this.#isDragging()) return;

    this.updateFromEvent(event);
  }


  protected onPointerUp(event: PointerEvent): void {
    this.#isDragging.set(false);
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  }


  private updateFromEvent(event: PointerEvent): void {
    const area = this.areaRef().nativeElement;
    const rect = area.getBoundingClientRect();

    // Calculate position as percentage (clamped 0-100)
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));

    // X = saturation, Y = value (inverted: top is 100%, bottom is 0%)
    this.saturation.set(Math.round(x));
    this.value.set(Math.round(100 - y));
  }

}
