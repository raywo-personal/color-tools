import {Events} from "@ngrx/signals/events";
import {commonEvents} from "./common.events";
import {tap} from "rxjs";
import {ColorThemeService} from "@common/services/color-theme.service";
import {GoogleFontLoaderService} from "@common/services/google-font-loader.service";


export function colorThemeChangeEffect(
  this: void,
  events: Events,
  themeService: ColorThemeService
) {
  return events
    .on(commonEvents.colorThemeChanged)
    .pipe(
      tap(event => {
        themeService.colorTheme = event.payload
      })
    );
}


export function fontSelectedEffect(
  this: void,
  events: Events,
  fontLoaderService: GoogleFontLoaderService
) {
  return events
    .on(commonEvents.fontSelected)
    .pipe(
      tap(event => {
        const font = event.payload;
        fontLoaderService.loadFont(font);
        fontLoaderService.setFontFamily(font);
      })
    );
}
