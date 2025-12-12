import chroma, {Color} from "chroma-js";
import {contrastIdFromColors} from "@contrast/helper/contrast-id.helper";


export interface ContrastColors {

  id: string;
  text: Color;
  background: Color;
  contrast: number;

}


export function createContrastColors(textColor: Color,
                                     bgColor: Color): ContrastColors {
  return {
    id: contrastIdFromColors({text: textColor, background: bgColor}),
    text: textColor,
    background: bgColor,
    contrast: chroma.contrastAPCA(textColor, bgColor)
  };
}
