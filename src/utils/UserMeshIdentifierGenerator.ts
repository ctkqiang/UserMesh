/**
 * UserMesh Identifier Generator
 *
 * Generates unique identifiers for events, sessions, users, and SDK instances.
 * All identifiers are cryptographically random or derived from cryptographic sources.
 *
 * Why: Ensures all identifiers are globally unique and impossible to collide
 * or predict, which is critical for tracking and security.
 *
 * When: Called whenever a new identifier is needed (event tracking, session start,
 * user identification, etc.).
 */

/**
 * UserMesh Identifier Generator
 *
 * Provides methods to generate unique identifiers with various formats:
 * - UUIDs (RFC 4122 v4) for events and sessions
 * - Session IDs (32-character hex)
 * - Device fingerprints (128-character hash)
 * - Random tokens for security
 *
 * Usage:
 * ```typescript
 * const generator = new UserMeshIdentifierGenerator();
 *
 * const eventId = generator.generateEventIdentifierAsUuid();
 * const sessionId = generator.generateSessionIdentifier();
 * const deviceId = generator.generateAnonymousDeviceIdentifier();
 * ```
 */
export class UserMeshIdentifierGenerator {
  /**
   * Generate a UUID v4 (RFC 4122) identifier.
   *
   * UUID v4 uses cryptographic randomness and guarantees collision resistance
   * across all time and systems. Perfect for event IDs.
   *
   * Why: Guarantees globally unique event IDs.
   * When: Called for every analytics event.
   *
   * @returns UUID v4 as a string (e.g., "550e8400-e29b-41d4-a716-446655440000")
   */
  generateEventIdentifierAsUuid(): string {
    // Get 16 random bytes
    const randomBytes = this.generateCryptographicallyRandomBytes(16);

    // Set version to 4 (bit pattern 0100 in most significant nibble)
    randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;

    // Set variant to RFC 4122 (bit pattern 10 in most significant bits)
    randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;

    // Format as UUID string with dashes
    return this.formatBytesAsUuidString(randomBytes);
  }

  /**
   * Generate a session identifier.
   *
   * Session IDs are 32-character hexadecimal strings derived from
   * cryptographic randomness. Used to group events from a single session.
   *
   * Why: Allows grouping related events together for session analysis.
   * When: Once per session (application startup or user interaction).
   *
   * @returns Session ID as 32-character hex string
   */
  generateSessionIdentifier(): string {
    const randomBytes = this.generateCryptographicallyRandomBytes(16);
    return this.convertBytesToHexadecimalString(randomBytes);
  }

  /**
   * Generate an anonymous device identifier.
   *
   * Anonymous device IDs are used for tracking before user authentication
   * and for users who never sign up.
   *
   * Why: Allows tracking unidentified users while respecting privacy.
   * When: At SDK initialization for anonymous/unauth users.
   *
   * @returns 32-character hexadecimal device identifier
   */
  generateAnonymousDeviceIdentifier(): string {
    const randomBytes = this.generateCryptographicallyRandomBytes(16);
    return this.convertBytesToHexadecimalString(randomBytes);
  }

  /**
   * Generate an SDK instance identifier.
   *
   * Unique identifier for each UserMesh SDK instance, used for debugging
   * and correlating events from specific SDK versions.
   *
   * @returns UUID v4 SDK instance identifier
   */
  generateSdkInstanceIdentifier(): string {
    return this.generateEventIdentifierAsUuid();
  }

  /**
   * Generate a unique batch identifier for event batches.
   *
   * When events are batched together for transmission, they're assigned
   * a batch ID to track the delivery status of that batch.
   *
   * @returns Batch identifier
   */
  generateEventBatchIdentifier(): string {
    return this.generateEventIdentifierAsUuid();
  }

  /**
   * Generate a random encryption key material.
   *
   * Returns a 32-byte (256-bit) key suitable for AES-256 encryption,
   * encoded as a base64 string for storage and transmission.
   *
   * @returns Base64-encoded 32-byte random key
   */
  generateRandomEncryptionKeyMaterial(): string {
    const randomBytes = this.generateCryptographicallyRandomBytes(32);
    return this.convertBytesToBase64String(randomBytes);
  }

  /**
   * Generate a random token for security purposes.
   *
   * Produces a random string suitable for authentication tokens,
   * CSRF tokens, or other security-sensitive values.
   *
   * @param lengthInBytes Number of random bytes to generate
   * @returns Base64-encoded random token
   */
  generateRandomSecurityToken(lengthInBytes: number = 32): string {
    if (lengthInBytes < 16) {
      throw new Error('Security token must be at least 16 bytes');
    }

    const randomBytes = this.generateCryptographicallyRandomBytes(lengthInBytes);
    return this.convertBytesToBase64String(randomBytes);
  }

  /**
   * Generate cryptographically random bytes.
   *
   * Uses Web Crypto API (window.crypto.getRandomValues) in browsers,
   * or Node.js crypto module in server environments.
   *
   * Why: Cryptographic randomness prevents ID prediction and collisions.
   * When: Used to seed all identifier generation.
   *
   * @param numberOfBytes The number of random bytes to generate
   * @returns Uint8Array of random bytes
   */
  private generateCryptographicallyRandomBytes(numberOfBytes: number): Uint8Array {
    const randomBytesArray = new Uint8Array(numberOfBytes);

    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      // Browser environment
      window.crypto.getRandomValues(randomBytesArray);
      return randomBytesArray;
    }

    // Node.js environment
    return this.generateRandomBytesInNodeEnvironment(numberOfBytes);
  }

  /**
   * Generate random bytes in Node.js environment.
   *
   * Fallback for server-side execution where window.crypto is not available.
   *
   * @param numberOfBytes Number of bytes to generate
   * @returns Random bytes as Uint8Array
   */
  private generateRandomBytesInNodeEnvironment(numberOfBytes: number): Uint8Array {
    try {
      // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
      const cryptoModule = require('crypto');
      const randomBytes = cryptoModule.randomBytes(numberOfBytes);
      return new Uint8Array(randomBytes);
    } catch {
      throw new Error(
        'Cannot generate random bytes: Web Crypto API or Node.js crypto module not available'
      );
    }
  }

  /**
   * Format 16 random bytes as UUID v4 string.
   *
   * Converts bytes to hexadecimal and adds UUID formatting (dashes).
   *
   * @param bytes 16 random bytes (must be modified for version/variant bits)
   * @returns Formatted UUID string
   */
  private formatBytesAsUuidString(bytes: Uint8Array): string {
    if (bytes.length !== 16) {
      throw new Error('UUID must be created from exactly 16 bytes');
    }

    const hexadecimalString = this.convertBytesToHexadecimalString(bytes);

    // Insert dashes at positions: 8, 12, 16, 20
    // Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    return (
      hexadecimalString.substring(0, 8) +
      '-' +
      hexadecimalString.substring(8, 12) +
      '-' +
      hexadecimalString.substring(12, 16) +
      '-' +
      hexadecimalString.substring(16, 20) +
      '-' +
      hexadecimalString.substring(20, 32)
    );
  }

  /**
   * Convert Uint8Array to hexadecimal string.
   *
   * @param bytes The bytes to convert
   * @returns Lowercase hexadecimal string
   */
  private convertBytesToHexadecimalString(bytes: Uint8Array): string {
    let hexadecimalResult = '';

    for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
      const byteValue = bytes[byteIndex];
      const hexByteValue = byteValue.toString(16).padStart(2, '0');
      hexadecimalResult += hexByteValue;
    }

    return hexadecimalResult;
  }

  /**
   * Convert Uint8Array to base64 string.
   *
   * @param bytes The bytes to convert
   * @returns Base64-encoded string
   */
  private convertBytesToBase64String(bytes: Uint8Array): string {
    if (typeof window !== 'undefined' && window.btoa) {
      // Browser environment
      let binaryString = '';
      for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
        binaryString += String.fromCharCode(bytes[byteIndex]);
      }
      return window.btoa(binaryString);
    }

    // Node.js environment
    return Buffer.from(bytes).toString('base64');
  }
}
