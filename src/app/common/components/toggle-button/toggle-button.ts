import {Component, computed, effect, input, OnInit, output, signal} from "@angular/core";


@Component({
  selector: 'button[app-toggle-button]',
  imports: [],
  templateUrl: './toggle-button.html',
  styles: ``,
  host: {
    "class": "btn",
    "(click)": "onClick()"
  }
})
export class ToggleButton implements OnInit {

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
    this.state.set(this.initialState());
  }


  protected onClick(): void {
    this.state.set(!this.state());
    this.currentState.emit(this.state());
  }

}
