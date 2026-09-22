import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import chroma from "chroma-js";
import {beforeEach, describe, expect, it} from "vitest";
import {FONT_SIZES} from "@engine/contrast/apca-lookup-table.model";
import {connectedClient, structured, summary} from "../test-support/connected-client";


/**
 * A mid-lightness blue on which no text color reaches Lc 90: white, the
 * better pole, stops at about 81.5.
 */
const MID_BLUE = "#3b6ea5";

interface Pair {
  label?: string;
  textColor: string;
  backgroundColor: string;
  fontSize?: string;
  fontWeight?: string;
}

interface Suggestion {
  textColor: string;
  name: string;
  lc: number;
  appliedMode: string;
  meetsRequirement: boolean;
}

interface AuditResult {
  label: string | null;
  textColor: string;
  backgroundColor: string;
  fontSize: string;
  fontWeight: string;
  lc: number;
  requiredLc: number | null;
  meetsRequirement: boolean;
  suggestion: Suggestion | null;
}

function auditPairs(client: Client, pairs: Pair[]) {
  return client.callTool({name: "audit_pairs", arguments: {pairs}});
}

function results(result: Record<string, unknown>): AuditResult[] {
  return result["results"] as AuditResult[];
}

async function auditOne(client: Client, pair: Pair): Promise<AuditResult> {
  return results(structured(await auditPairs(client, [pair])))[0];
}


describe("audit_pairs", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectedClient("audit-pairs.spec");
  });


  describe("tool listing", () => {

    it("should be listed as a read-only tool with an output schema", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "audit_pairs");

      expect(tool).toBeDefined();
      expect(tool!.annotations?.readOnlyHint).toBe(true);
      expect(tool!.outputSchema).toBeDefined();
      expect(tool!.description).toBeTruthy();
    });

    it("should ask for the pairs only", async () => {
      const {tools} = await client.listTools();
      const tool = tools.find(candidate => candidate.name === "audit_pairs");

      expect(tool!.inputSchema.required).toEqual(["pairs"]);
    });

  });


  describe("the verdict", () => {

    it("should pass black on white at 16px/400 and suggest nothing", async () => {
      const result = await auditOne(client, {textColor: "#000000", backgroundColor: "#ffffff"});

      expect(result.meetsRequirement).toBe(true);
      expect(result.suggestion).toBeNull();
    });

    it("should pass white on black", async () => {
      // APCA reports light text on a dark ground as a negative Lc; a check
      // that compares the signed value fails every such pair.
      const result = await auditOne(client, {textColor: "#ffffff", backgroundColor: "#000000"});

      expect(result.lc).toBeLessThan(0);
      expect(result.meetsRequirement).toBe(true);
      expect(result.suggestion).toBeNull();
    });

    it("should suggest nothing for a pair that passes, even where another color would do", async () => {
      // At 32px/700 white on the blue passes with room to spare; a search
      // run anyway answers with a harmonic tint of less contrast.
      const result = await auditOne(client, {
        textColor: "#ffffff",
        backgroundColor: MID_BLUE,
        fontSize: "32px",
        fontWeight: "700"
      });

      expect(result.meetsRequirement).toBe(true);
      expect(result.suggestion).toBeNull();
    });

    it("should report the table row the size was snapped to", async () => {
      const result = await auditOne(client, {textColor: "#000000", backgroundColor: "#ffffff", fontSize: "17px"});

      expect(FONT_SIZES).toContain(result.fontSize);
    });

    it("should fail a size at which no text is readable", async () => {
      const result = await auditOne(client, {
        textColor: "#000000",
        backgroundColor: "#ffffff",
        fontSize: "12px",
        fontWeight: "100"
      });

      expect(result.requiredLc).toBeNull();
      expect(result.meetsRequirement).toBe(false);
      expect(result.suggestion!.meetsRequirement).toBe(false);
    });

    it("should answer the hex values in lower case, as the other tools do", async () => {
      const result = await auditOne(client, {textColor: "#999999", backgroundColor: "#3B6EA5"});

      expect(result.backgroundColor).toBe(MID_BLUE);
      expect(result.suggestion!.textColor).toMatch(/^#[0-9a-f]{6}$/);
    });

  });


  describe("the suggestion", () => {

    it("should carry the contrast it has against the background", async () => {
      for (const backgroundColor of ["#ffffff", "#e8d8c0", "#1a3355"]) {
        const result = await auditOne(client, {textColor: "#888888", backgroundColor});
        const suggestion = result.suggestion!;
        const recomputed = chroma.contrastAPCA(suggestion.textColor, backgroundColor);

        expect(result.meetsRequirement, backgroundColor).toBe(false);
        expect(suggestion.lc, backgroundColor).toBeCloseTo(recomputed, 0);
      }
    });

    it("should say it passes where a replacement exists", async () => {
      const result = await auditOne(client, {textColor: "#999999", backgroundColor: "#ffffff"});

      expect(result.suggestion!.meetsRequirement).toBe(true);
      expect(Math.abs(result.suggestion!.lc)).toBeGreaterThanOrEqual(result.requiredLc!);
    });

    it("should say it fails where no text color can fix the pair", async () => {
      // Both poles, so a suggestion that happens to equal the text color
      // is still reported rather than dropped.
      for (const textColor of ["#000000", "#ffffff"]) {
        const result = await auditOne(client, {textColor, backgroundColor: MID_BLUE});

        expect(result.meetsRequirement, textColor).toBe(false);
        expect(result.suggestion, textColor).not.toBeNull();
        expect(result.suggestion!.meetsRequirement, textColor).toBe(false);
        expect(result.suggestion!.appliedMode, textColor).toBe("optimal");
      }
    });

  });


  describe("the tally", () => {

    it("should count every pair as passed or failed", async () => {
      const pairs: Pair[] = [
        {textColor: "#000000", backgroundColor: "#ffffff"},
        {textColor: "#999999", backgroundColor: "#ffffff"},
        {textColor: "#ffffff", backgroundColor: MID_BLUE},
        {textColor: "#ffffff", backgroundColor: "#000000"}
      ];
      const result = structured(await auditPairs(client, pairs));

      expect(result["passed"]).toBe(2);
      expect(result["failed"]).toBe(2);
      expect(results(result)).toHaveLength(pairs.length);
    });

    it("should keep the pairs in the order they were given", async () => {
      const pairs: Pair[] = [
        {label: "first", textColor: "#000000", backgroundColor: "#ffffff"},
        {label: "second", textColor: "#999999", backgroundColor: "#ffffff"}
      ];
      const result = structured(await auditPairs(client, pairs));

      expect(results(result).map(entry => entry.label)).toEqual(["first", "second"]);
    });

  });


  describe("the summary", () => {

    it("should say every pair passes when none fails", async () => {
      const result = await auditPairs(client, [
        {textColor: "#000000", backgroundColor: "#ffffff"},
        {textColor: "#ffffff", backgroundColor: "#000000"}
      ]);

      expect(summary(result)).toContain("All 2 pairs pass");
    });

    it("should name the failing labels and nothing else", async () => {
      const result = await auditPairs(client, [
        {label: "body-on-card", textColor: "#000000", backgroundColor: "#ffffff"},
        {label: "caption-on-card", textColor: "#999999", backgroundColor: "#ffffff"},
        {label: "button-label", textColor: "#ffffff", backgroundColor: MID_BLUE}
      ]);
      const text = summary(result);

      expect(text).toContain("caption-on-card");
      expect(text).toContain("button-label");
      expect(text).not.toContain("body-on-card");
    });

    it("should name a failing pair without a label by its two hex values", async () => {
      const result = await auditPairs(client, [
        {label: "body-on-card", textColor: "#000000", backgroundColor: "#ffffff"},
        {textColor: "#999999", backgroundColor: "#ffffff"}
      ]);
      const text = summary(result);

      expect(text).toContain("#999999");
      expect(text).toContain("#ffffff");
    });

  });


  describe("the input", () => {

    it("should reject an empty list", async () => {
      const result = await auditPairs(client, []);

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

    it("should reject a list of more than 50 pairs", async () => {
      const pairs = Array.from({length: 51}, () => ({textColor: "#000000", backgroundColor: "#ffffff"}));
      const result = await auditPairs(client, pairs);

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
    });

    it("should accept a list of exactly 50 pairs", async () => {
      const pairs = Array.from({length: 50}, () => ({textColor: "#000000", backgroundColor: "#ffffff"}));
      const result = await auditPairs(client, pairs);

      expect(result.isError).toBeFalsy();
    });

    it("should reject a pair whose color is not a hex color", async () => {
      const result = await auditPairs(client, [{textColor: "black", backgroundColor: "#ffffff"}]);

      expect(result.isError).toBe(true);
    });

  });

});
