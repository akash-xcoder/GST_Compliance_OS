/**
 * GSTIN & PAN Validation Utilities for Indian Tax Compliance
 */

// Standard Indian GSTIN Regex: 2 digits + 5 chars PAN + 4 digits + 1 char + 1 char entity + Z + 1 check char
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Standard Indian PAN Regex: 5 letters + 4 numbers + 1 letter
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * Validates a GSTIN string against the standard 15-character format.
 * Format: 2 State Digits + 10 PAN Digits/Chars + 1 Entity Number + 'Z' + 1 Check Digit
 */
export function validateGSTIN(gstin: string): boolean {
  if (!gstin) return false;
  const cleanGstin = gstin.trim().toUpperCase();
  return GSTIN_REGEX.test(cleanGstin);
}

/**
 * Extracts characters 3 to 12 from a GSTIN string (0-indexed 2 to 12),
 * which represents the embedded 10-character Permanent Account Number (PAN).
 */
export function extractPANFromGSTIN(gstin: string): string {
  if (!gstin) return '';
  const cleanGstin = gstin.trim().toUpperCase();
  if (cleanGstin.length >= 12) {
    const extractedPan = cleanGstin.substring(2, 12);
    return extractedPan;
  }
  return '';
}

/**
 * Validates a PAN string against the standard 10-character format.
 * Format: 5 uppercase letters, 4 digits, 1 uppercase letter.
 */
export function validatePAN(pan: string): boolean {
  if (!pan) return false;
  const cleanPan = pan.trim().toUpperCase();
  return PAN_REGEX.test(cleanPan);
}
