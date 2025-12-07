import {Color} from "chroma-js";


export type ContrastColorRole = "text" | "background";


export interface ContrastColor {

  color: Color;
  role: ContrastColorRole;

}
