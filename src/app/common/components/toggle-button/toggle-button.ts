import {Component, computed, effect, ElementRef, inject, input, OnInit, output, signal, viewChild} from "@angular/core";
import {NgbTooltip} from "@ng-bootstrap/ng-bootstrap";


@Component({
  selector: 'button[app-toggle-button]',
  imports: [],
  templateUrl: './toggle-button.html',
  styles: ``,
  host: {
    "class": "btn",
    "(click)": "onClick()"
  },
  hostDirectives: [
    {
      directive: NgbTooltip,
      inputs: [
        "ngbTooltip",
        "placement",
        "openDelay"
      ]
    }
  ]
})
export class ToggleButton implements OnInit {

  private readonly tooltip = inject(NgbTooltip);
  private readonly content = viewChild.required<ElementRef>("content");

  protected readonly hostClass = computed(() => {
    return this.state() ? this.onClass() : this.offClass();
  });

  protected readonly state = signal(true);

  public readonly onClass = input.required<string>();
  public readonly offClass = input.required<string>();
  public readonly initialState = input<boolean>(true);
  public readonly currentState = output<boolean>();


  constructor() {
    effect(() => {
      const initialState = this.initialState();
      this.state.set(initialState);
    });
  }


  public ngOnInit(): void {
    const content = this.content().nativeElement as HTMLSpanElement;
    this.tooltip.ngbTooltip = content.textContent;
    this.state.set(this.initialState());
  }


  protected onClick(): void {
    this.state.set(!this.state());
    this.currentState.emit(this.state());
  }

}
