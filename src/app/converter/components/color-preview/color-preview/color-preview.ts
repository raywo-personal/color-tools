import {ChangeDetectionStrategy, Component, inject} from "@angular/core";
import {AppStateStore} from "@core/app-state.store";


@Component({
  selector: 'ct-color-preview',
  imports: [],
  templateUrl: './color-preview.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: ``
})
export class ColorPreview {

  protected readonly currentColor = inject(AppStateStore).currentColor;

}
