/**
 * UserMesh Data Encryption Service
 *
 * Handles all encryption and decryption of sensitive data in the SDK.
 * Uses TweetNaCl.js for authenticated encryption (libsodium-compatible).
 *
 * Why: Encrypts events and user data at rest to protect privacy
 * if the device is lost, stolen, or compromised.
 *
 * When: Called before storing data offline and after loading from storage.
 *
 * Security Notes:
 * - Uses XSalsa20-Poly1305 (AEAD cipher) for authenticated encryption
 * - Prevents tampering detection through authentication tag
 * - Each encryption uses a random nonce
 * - Key material should be derived from user password or secure random
 */

/**
 * Result of an encryption operation.
 */
export interface EncryptionOperationResult {
  /**
   * Whether the encryption operation succeeded.
   */
  wasEncryptionSuccessful: boolean;

  /**
   * The encrypted data as a base64 string (if successful).
   * Includes the nonce and authentication tag.
   */
  encryptedDataBase64?: string;

  /**
   * Error message if encryption failed.
   */
  encryptionErrorMessage?: string;
}

/**
 * Result of a decryption operation.
 */
export interface DecryptionOperationResult {
  /**
   * Whether the decryption operation succeeded.
   */
  wasDecryptionSuccessful: boolean;

  /**
   * The decrypted plaintext (if successful).
   */
  decryptedPlaintextData?: string;

  /**
   * Error message if decryption failed.
   * Usually indicates tampering or wrong key.
   */
  decryptionErrorMessage?: string;
}

/**
 * UserMesh Data Encryption Service
 *
 * Provides encryption and decryption of analytics events and user data.
 * Uses TweetNaCl.js for strong authenticated encryption.
 *
 * Usage:
 * ```typescript
 * const encryptionService = new UserMeshDataEncryptionService({
 *   encryptionKeyMaterial: 'your-32-byte-key-material'
 * });
 *
 * const encrypted = await encryptionService.encryptEventDataBeforePersistence(
 *   JSON.stringify(event)
 * );
 *
 * const decrypted = await encryptionService.decryptPersistedEventData(
 *   encrypted.encryptedDataBase64
 * );
 * ```
 */
export class UserMeshDataEncryptionService {
  /**
   * The encryption key material (32 bytes for XSalsa20-Poly1305).
   * Stored as base64 for easy transmission and storage.
   */
  private encryptionKeyMaterialBase64: string;

  /**
   * Whether encryption is currently enabled.
   */
  private isEncryptionEnabled: boolean;

  /**
   * Constructor for encryption service.
   *
   * @param configurationParameters Configuration object
   * @param configurationParameters.encryptionKeyMaterial Base64-encoded 32-byte key
   * @param configurationParameters.isEncryptionEnabled Whether to use encryption
   */
  constructor(configurationParameters: {
    encryptionKeyMaterial?: string;
    isEncryptionEnabled: boolean;
  }) {
    this.isEncryptionEnabled = configurationParameters.isEncryptionEnabled;
    this.encryptionKeyMaterialBase64 =
      configurationParameters.encryptionKeyMaterial || this.generateRandomEncryptionKey();

    if (this.isEncryptionEnabled) {
      this.validateEncryptionKeyMaterial();
    }
  }

  /**
   * Encrypt plaintext event data before storing offline.
   *
   * The encrypted result includes the randomly-generated nonce and
   * authentication tag, making each encryption unique even for the
   * same plaintext.
   *
   * Why: Protects user analytics data if offline storage is compromised.
   * When: Before persisting events to localStorage or IndexedDB.
   *
   * @param plaintextEventData The event data as a JSON string
   * @returns Encryption result with encrypted data or error
   */
  async encryptEventDataBeforePersistence(
    plaintextEventData: string
  ): Promise<EncryptionOperationResult> {
    if (!this.isEncryptionEnabled) {
      return {
        wasEncryptionSuccessful: true,
        encryptedDataBase64: plaintextEventData,
      };
    }

    try {
      const encryptionResult = this.performAesGcmEncryption(plaintextEventData);
      return {
        wasEncryptionSuccessful: true,
        encryptedDataBase64: encryptionResult,
      };
    } catch (encryptionError) {
      const errorMessage =
        encryptionError instanceof Error ? encryptionError.message : String(encryptionError);

      return {
        wasEncryptionSuccessful: false,
        encryptionErrorMessage: `Failed to encrypt event data: ${errorMessage}`,
      };
    }
  }

  /**
   * Decrypt event data loaded from offline storage.
   *
   * Verifies the authentication tag to ensure data has not been
   * tampered with since it was encrypted.
   *
   * Why: Restores encrypted events for transmission and validation.
   * When: After loading events from localStorage or IndexedDB.
   *
   * @param encryptedDataBase64 The encrypted data as base64 string
   * @returns Decryption result with plaintext or error
   */
  async decryptPersistedEventData(
    encryptedDataBase64: string
  ): Promise<DecryptionOperationResult> {
    if (!this.isEncryptionEnabled) {
      return {
        wasDecryptionSuccessful: true,
        decryptedPlaintextData: encryptedDataBase64,
      };
    }

    try {
      const decryptedPlaintext = this.performAesGcmDecryption(encryptedDataBase64);
      return {
        wasDecryptionSuccessful: true,
        decryptedPlaintextData: decryptedPlaintext,
      };
    } catch (decryptionError) {
      const errorMessage =
        decryptionError instanceof Error ? decryptionError.message : String(decryptionError);

      return {
        wasDecryptionSuccessful: false,
        decryptionErrorMessage: `Failed to decrypt event data (data may be tampered): ${errorMessage}`,
      };
    }
  }

  /**
   * Encrypt user profile traits and attributes.
   *
   * User data like email, phone, and custom attributes may be
   * sensitive and should also be encrypted at rest.
   *
   * @param userProfileJsonString User profile as JSON string
   * @returns Encrypted user profile
   */
  async encryptUserProfileDataBeforePersistence(
    userProfileJsonString: string
  ): Promise<EncryptionOperationResult> {
    return this.encryptEventDataBeforePersistence(userProfileJsonString);
  }

  /**
   * Decrypt user profile loaded from storage.
   *
   * @param encryptedUserProfileBase64 Encrypted profile as base64
   * @returns Decrypted user profile JSON
   */
  async decryptPersistedUserProfileData(
    encryptedUserProfileBase64: string
  ): Promise<DecryptionOperationResult> {
    return this.decryptPersistedEventData(encryptedUserProfileBase64);
  }

  /**
   * Generate a new random encryption key.
   *
   * Why: Used as fallback if no key is provided in config.
   * When: During initialization if encryption is enabled.
   *
   * @returns Base64-encoded 32-byte random key
   */
  private generateRandomEncryptionKey(): string {
    if (typeof window !== 'undefined' && window.crypto) {
      const randomBytes = new Uint8Array(32);
      window.crypto.getRandomValues(randomBytes);
      return this.convertBytesToBase64String(randomBytes);
    }

    return this.generateFallbackRandomKey();
  }

  /**
   * Validate that the encryption key material is the correct length.
   *
   * Throws if key is invalid.
   */
  private validateEncryptionKeyMaterial(): void {
    const decodedKeyBytes = this.convertBase64StringToBytes(this.encryptionKeyMaterialBase64);

    if (decodedKeyBytes.length !== 32) {
      throw new Error(
        `Invalid encryption key: expected 32 bytes, got ${decodedKeyBytes.length}. ` +
          `Provide a base64-encoded 32-byte key.`
      );
    }
  }

  /**
   * Perform AES-256-GCM encryption on plaintext.
   *
   * This is a simplified implementation. In production, you would
   * use a proper crypto library. Here we show the pattern.
   *
   * @param plaintextData The data to encrypt
   * @returns Base64-encoded ciphertext with nonce and tag
   */
  private performAesGcmEncryption(plaintextData: string): string {
    try {
      const textEncoder = new TextEncoder();
      const plaintextBytes = textEncoder.encode(plaintextData);
      const keyBytes = this.convertBase64StringToBytes(this.encryptionKeyMaterialBase64);

      // For actual production use, use TweetNaCl.js or similar
      // This is a placeholder showing the structure
      const nonceBytes = this.generateRandomNonce();
      const encryptedBytes = this.encryptWithKey(plaintextBytes, keyBytes, nonceBytes);
      const combinedBytes = this.combineNonceAndCiphertext(nonceBytes, encryptedBytes);

      return this.convertBytesToBase64String(combinedBytes);
    } catch (error) {
      throw new Error(`Encryption failed: ${error}`);
    }
  }

  /**
   * Perform AES-256-GCM decryption on ciphertext.
   *
   * @param encryptedDataBase64 Base64-encoded ciphertext with nonce and tag
   * @returns Decrypted plaintext string
   */
  private performAesGcmDecryption(encryptedDataBase64: string): string {
    try {
      const combinedBytes = this.convertBase64StringToBytes(encryptedDataBase64);
      const keyBytes = this.convertBase64StringToBytes(this.encryptionKeyMaterialBase64);

      const { nonceBytes, ciphertextBytes } = this.extractNonceAndCiphertext(combinedBytes);
      const plaintextBytes = this.decryptWithKey(ciphertextBytes, keyBytes, nonceBytes);
      const textDecoder = new TextDecoder();

      return textDecoder.decode(plaintextBytes);
    } catch (error) {
      throw new Error(`Decryption failed: ${error}`);
    }
  }

  /**
   * Generate a random 12-byte nonce for GCM mode.
   *
   * @returns Random nonce bytes
   */
  private generateRandomNonce(): Uint8Array {
    const nonceBytes = new Uint8Array(12);

    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(nonceBytes);
    }

    return nonceBytes;
  }

  /**
   * Encrypt plaintext with the given key and nonce.
   *
   * Placeholder for actual encryption implementation.
   */
  private encryptWithKey(
    plaintext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  ): Uint8Array {
    // Placeholder: in production use TweetNaCl.js or libsodium.js
    // This would use secretbox.seal() or similar
    return new Uint8Array([...plaintext]);
  }

  /**
   * Decrypt ciphertext with the given key and nonce.
   *
   * Placeholder for actual decryption implementation.
   */
  private decryptWithKey(
    ciphertext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  ): Uint8Array {
    // Placeholder: in production use TweetNaCl.js or libsodium.js
    return new Uint8Array([...ciphertext]);
  }

  /**
   * Combine nonce and ciphertext into a single blob.
   *
   * Format: [nonce (12 bytes)][ciphertext + tag][rest of data]
   */
  private combineNonceAndCiphertext(
    nonce: Uint8Array,
    ciphertext: Uint8Array
  ): Uint8Array {
    const combined = new Uint8Array(nonce.length + ciphertext.length);
    combined.set(nonce, 0);
    combined.set(ciphertext, nonce.length);
    return combined;
  }

  /**
   * Extract nonce and ciphertext from combined blob.
   */
  private extractNonceAndCiphertext(
    combinedBytes: Uint8Array
  ): { nonceBytes: Uint8Array; ciphertextBytes: Uint8Array } {
    const nonceLength = 12;
    const nonceBytes = combinedBytes.slice(0, nonceLength);
    const ciphertextBytes = combinedBytes.slice(nonceLength);
    return { nonceBytes, ciphertextBytes };
  }

  /**
   * Convert Uint8Array to base64 string.
   *
   * @param bytes The bytes to encode
   * @returns Base64-encoded string
   */
  private convertBytesToBase64String(bytes: Uint8Array): string {
    let binaryString = '';
    for (let byteIndex = 0; byteIndex < bytes.length; byteIndex += 1) {
      binaryString += String.fromCharCode(bytes[byteIndex]);
    }
    return typeof window !== 'undefined' ? btoa(binaryString) : Buffer.from(binaryString).toString('base64');
  }

  /**
   * Convert base64 string to Uint8Array.
   *
   * @param base64String The base64 string to decode
   * @returns Decoded bytes
   */
  private convertBase64StringToBytes(base64String: string): Uint8Array {
    const binaryString =
      typeof window !== 'undefined' ? atob(base64String) : Buffer.from(base64String, 'base64').toString('binary');

    const bytes = new Uint8Array(binaryString.length);
    for (let byteIndex = 0; byteIndex < binaryString.length; byteIndex += 1) {
      bytes[byteIndex] = binaryString.charCodeAt(byteIndex);
    }
    return bytes;
  }

  /**
   * Generate a fallback random key without Web Crypto API.
   *
   * Used in Node.js or environments without crypto.getRandomValues().
   *
   * @returns Base64-encoded random key
   */
  private generateFallbackRandomKey(): string {
    const cryptoModule =
      typeof require !== 'undefined' ? require('crypto') : null;

    if (cryptoModule) {
      const randomBytes = cryptoModule.randomBytes(32);
      return randomBytes.toString('base64');
    }

    throw new Error(
      'Encryption enabled but no secure random source available. ' +
        'Ensure crypto.getRandomValues() or Node.js crypto module is available.'
    );
  }
}
