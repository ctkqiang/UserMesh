/**
 * Type definitions for UserMesh offline storage and persistence.
 *
 * These types define how analytics events and user data are stored
 * locally when the device is offline or before they are sent to
 * analytics platforms.
 *
 * Why: Storage abstraction allows UserMesh to work with different
 * storage backends (localStorage, IndexedDB, native storage).
 * When: Used by the offline queue system and persistence layer.
 */

/**
 * Represents a stored analytics event with metadata about its storage state.
 *
 * When an event is queued but not yet sent to analytics platforms,
 * it's persisted as a StoredAnalyticsEvent with additional metadata
 * about retry attempts and encryption status.
 */
export interface StoredAnalyticsEvent {
  /**
   * The unique event identifier (matches AnalyticsEventRecord.uniqueEventIdentifier).
   */
  eventIdentifier: string;

  /**
   * The complete event data stored as a JSON string.
   * May be encrypted if encryption is enabled.
   */
  serializedEventData: string;

  /**
   * Whether this event data is currently encrypted.
   * If true, serializedEventData must be decrypted before use.
   */
  isEventDataEncrypted: boolean;

  /**
   * When this event was stored (Unix timestamp milliseconds).
   * Used to identify stale events that should be purged.
   */
  storageTimestampMilliseconds: number;

  /**
   * How many times we've attempted to send this event.
   * Used for exponential backoff and failure detection.
   */
  deliveryAttemptCount: number;

  /**
   * The timestamp of the last delivery attempt.
   * Used to calculate backoff delays.
   */
  lastDeliveryAttemptTimestampMilliseconds?: number;

  /**
   * Error message from the last failed delivery attempt.
   * Useful for debugging transmission failures.
   */
  lastDeliveryErrorMessage?: string;
}

/**
 * Represents metadata about the entire event queue in storage.
 *
 * This metadata helps the SDK understand the state of the queue
 * without having to deserialize all events.
 */
export interface OfflineEventQueueMetadata {
  /**
   * Total number of events currently in the queue.
   */
  totalEventCountInQueue: number;

  /**
   * Total size in bytes of all queued events.
   * Used to determine if queue is getting too large.
   */
  totalQueueSizeInBytes: number;

  /**
   * When the queue was last flushed to analytics platforms.
   */
  lastFlushTimestampMilliseconds: number;

  /**
   * When the queue metadata was last updated.
   */
  metadataLastUpdatedTimestampMilliseconds: number;

  /**
   * Whether the queue has unsent events that are waiting for network.
   */
  hasUnsentEvents: boolean;

  /**
   * Number of events that have exceeded max retry attempts.
   * These should be logged but not sent (to prevent infinite loops).
   */
  abandonedEventCount: number;

  /**
   * The application version string when queue was created.
   * Used to detect version mismatches that might require migration.
   */
  applicationVersionString?: string;
}

/**
 * Result of a storage operation (save, load, delete).
 *
 * Indicates whether the operation succeeded and provides
 * error information if it failed.
 */
export interface StorageOperationResult {
  /**
   * Whether the storage operation completed successfully.
   */
  wasOperationSuccessful: boolean;

  /**
   * Error message if the operation failed.
   * Undefined if operation succeeded.
   */
  operationErrorMessage?: string;

  /**
   * Additional context about the operation.
   * Useful for debugging storage issues.
   */
  operationContextInformation?: Record<string, unknown>;

  /**
   * Data returned by the operation (if applicable).
   * For read operations, contains the retrieved data.
   */
  retrievedDataFromStorage?: unknown;
}

/**
 * Configuration for how events should be stored offline.
 *
 * Allows fine-tuning of storage behavior like encryption,
 * retention, and quota management.
 */
export interface OfflineStorageConfiguration {
  /**
   * Whether to encrypt events before storing them.
   * Recommended for sensitive applications.
   */
  shouldEncryptStoredEvents: boolean;

  /**
   * Encryption key material if encryption is enabled.
   * Must be 32 bytes for AES-256.
   */
  encryptionKeyMaterial?: string;

  /**
   * Maximum number of days to retain events in storage.
   * Events older than this are automatically deleted.
   */
  eventRetentionDaysCount: number;

  /**
   * Maximum queue size in bytes before we stop accepting new events.
   * Prevents storage quota exhaustion on device.
   */
  maximumQueueSizeInBytes: number;

  /**
   * Maximum number of retry attempts for a single event.
   * After this, event is abandoned and not retried.
   */
  maximumRetryAttemptsPerEvent: number;

  /**
   * Base delay in milliseconds for exponential backoff between retries.
   * First retry waits this long, second waits 2x this long, etc.
   */
  retryBackoffBaseDelayMilliseconds: number;

  /**
   * Storage backend to use ('localStorage', 'indexeddb', 'memory').
   * Defaults to best available for platform.
   */
  preferredStorageBackend?: 'localStorage' | 'indexeddb' | 'memory';
}

/**
 * Interface for any storage backend implementation.
 *
 * Allows UserMesh to work with different storage systems
 * (localStorage, IndexedDB, native app storage) through a
 * single unified interface.
 */
export interface StorageBackendInterface {
  /**
   * Initialize the storage backend.
   * Called once during SDK initialization.
   */
  initializeStorageBackend(): Promise<StorageOperationResult>;

  /**
   * Save an event to storage.
   */
  persistEventToStorage(
    storedEvent: StoredAnalyticsEvent
  ): Promise<StorageOperationResult>;

  /**
   * Retrieve all events from storage.
   */
  retrieveAllEventsFromStorage(): Promise<StoredAnalyticsEvent[]>;

  /**
   * Retrieve a specific event by its identifier.
   */
  retrieveEventByIdentifier(
    eventIdentifier: string
  ): Promise<StoredAnalyticsEvent | undefined>;

  /**
   * Delete an event from storage (after successful delivery).
   */
  deleteEventFromStorage(eventIdentifier: string): Promise<StorageOperationResult>;

  /**
   * Delete multiple events by their identifiers.
   */
  deleteMultipleEventsFromStorage(
    eventIdentifiers: string[]
  ): Promise<StorageOperationResult>;

  /**
   * Get metadata about the queue without loading all events.
   */
  retrieveQueueMetadata(): Promise<OfflineEventQueueMetadata>;

  /**
   * Update queue metadata.
   */
  updateQueueMetadata(
    metadata: OfflineEventQueueMetadata
  ): Promise<StorageOperationResult>;

  /**
   * Clear all events and metadata from storage.
   * Used during SDK shutdown or user privacy requests.
   */
  clearAllStorageData(): Promise<StorageOperationResult>;

  /**
   * Get the current size of the queue in bytes.
   */
  calculateCurrentQueueSizeInBytes(): Promise<number>;

  /**
   * Check if a specific storage key exists.
   */
  doesStorageKeyExist(storageKey: string): Promise<boolean>;

  /**
   * Shutdown the storage backend gracefully.
   */
  shutdownStorageBackend(): Promise<StorageOperationResult>;
}
