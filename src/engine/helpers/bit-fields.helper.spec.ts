import {describe, expect, it} from "vitest";
import {base62LengthFor, packBits, unpackBits} from "./bit-fields.helper";
import {bigIntToBase62} from "@engine/helpers/base62.helper";


describe("Bit fields helper", () => {

  describe("base62LengthFor", () => {

    it("is long enough for the largest value of the width and no longer", () => {
      for (const bits of [1, 6, 24, 48, 102, 129, 498]) {
        const largest = (1n << BigInt(bits)) - 1n;
        const length = base62LengthFor(bits);

        expect(bigIntToBase62(largest).length).toBe(length);
      }
    });

  });


  describe("packBits and unpackBits", () => {

    it("round-trip the fields in the order they were packed", () => {
      const fields = [
        {value: 0xabcdef, bits: 24},
        {value: 0, bits: 3},
        {value: 72, bits: 7},
        {value: 1, bits: 1}
      ];

      const packed = packBits(fields);

      expect(unpackBits(packed, fields.map(field => field.bits))).toEqual(fields.map(field => field.value));
    });

    it("puts the first field in the highest bits", () => {
      expect(packBits([{value: 1, bits: 1}, {value: 0, bits: 4}])).toBe(16n);
    });

    it("refuses a value its field cannot hold", () => {
      expect(() => packBits([{value: 8, bits: 3}])).toThrow();
      expect(() => packBits([{value: -1, bits: 3}])).toThrow();
      expect(() => packBits([{value: 1.5, bits: 3}])).toThrow();
    });

  });

});
