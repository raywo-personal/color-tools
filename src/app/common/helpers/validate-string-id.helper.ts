/**
 * Validates the given ID to ensure it has the correct length.
 *
 * @param {string} id - The ID to be validated.
 * @param expectedLength - The expected length of the ID.
 * @return {void} Throws an error if the ID does not meet the required
 *                length criteria.
 */
export function validateId(id: string, expectedLength: number): void {
  if (id.length !== expectedLength) {
    throw new Error(`ID has invalid length! Expected: ${expectedLength}, Actual: ${id.length}`);
  }
}


/**
 * Determines if the data represented by the given ID can be restored.
 *
 * @param {string} id - The unique identifier of the palette.
 * @param expectedLength - The expected length of the ID.
 * @return {boolean} True if the palette is restorable, otherwise false.
 */
export function isRestorable(id: string, expectedLength: number): boolean {
  try {
    validateId(id, expectedLength);
    return true;
  } catch (err) {
    return false;
  }
}
