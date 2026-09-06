export const BASE62_ID = /^[0-9A-Za-z]+$/;

/**
 * Validates the given ID to ensure it has the correct length.
 *
 * @param {string} id - The ID to be validated.
 * @param expectedLength - The expected length of the ID.
 * @return {void} Throws an error if the ID does not meet the required
 *                length criteria.
 */
export function validateIdLength(id: string, expectedLength: number): void {
  if (id.length !== expectedLength) {
    throw new Error(`ID has invalid length! Expected: ${expectedLength}, Actual: ${id.length}`);
  }
}


/**
 * Determines if the data represented by the given ID is well-formed.
 *
 * @param {string} id - The unique identifier, representing some data.
 * @param expectedLength - The expected length of the ID.
 * @return {boolean} True if the data represented by the ID is well-formed,
 *                   otherwise false.
 */
export function isWellFormedId(id: string, expectedLength: number): boolean {
  try {
    validateIdLength(id, expectedLength);

    return BASE62_ID.test(id);
  } catch {
    return false;
  }
}
