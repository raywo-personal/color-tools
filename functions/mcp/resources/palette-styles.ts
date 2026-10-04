import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {PaletteStylesWithoutRandom, styleCaptionFor, styleDescriptionFor} from "@engine/palette/palette-style.model";


const URI = "colortools://palette-styles";

export function registerPaletteStyles(server: McpServer) {
  server.registerResource(
    "palette-styles",
    URI,
    {
      title: "Palette Styles",
      description: "Every style generate_palette accepts, with what it does.",
      mimeType: "application/json"
    },
    uri => ({
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(PaletteStylesWithoutRandom.map(style => ({
          style,
          label: styleCaptionFor(style),
          description: styleDescriptionFor(style)
        })), null, 2)
      }]
    })
  );
}
