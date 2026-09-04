import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {InMemoryTransport} from "@modelcontextprotocol/sdk/inMemory.js";
import {createMcpServer} from "../server";


/**
 * Connects an SDK client to a fresh server the way Claude would, minus HTTP:
 * the linked pair hands each side the other's messages in memory. Only specs
 * import this file, so it never reaches the Worker bundle.
 *
 * @param name - The client name a spec reports as, for readable transcripts.
 */
export async function connectedClient(name: string): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({name, version: "0.0.0"});

  await createMcpServer().connect(serverTransport);
  await client.connect(clientTransport);

  return client;
}


/**
 * The structured half of a successful tool result. A tool that declares an
 * outputSchema and answers without it fails the SDK's own validation, so a
 * spec that reads the payload asserts both at once.
 */
export function structured(
  result: Awaited<ReturnType<Client["callTool"]>>
): Record<string, unknown> {
  if (result.isError) {
    throw new Error(`Tool call failed: ${JSON.stringify(result.content)}`);
  }

  if (result.structuredContent === undefined) {
    throw new Error("Tool call carried no structuredContent");
  }

  return result.structuredContent as Record<string, unknown>;
}


/**
 * The single text block a tool's `content` carries - the sentence an
 * assistant quotes.
 */
export function summary(
  result: Awaited<ReturnType<Client["callTool"]>>
): string {
  return (result.content as {type: string; text: string}[])[0].text;
}
