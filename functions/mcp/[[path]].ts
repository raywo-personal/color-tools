import {PagesFunction} from "@cloudflare/workers-types";
import {handleMcpRequest} from "./server";


export const onRequest: PagesFunction = (context) => {
  return handleMcpRequest(context.request);
};
