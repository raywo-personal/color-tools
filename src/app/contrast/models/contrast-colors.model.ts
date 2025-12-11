import chroma, {Color} from "chroma-js";


export interface ContrastColors {

  text: Color;
  background: Color;
  contrast: number;

}


export function createContrastColors(textColor: Color,
                                     bgColor: Color): ContrastColors {
  return {
    text: textColor,
    background: bgColor,
    contrast: chroma.contrastAPCA(textColor, bgColor)
  };
}
