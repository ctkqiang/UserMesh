/**
 * UserMesh Offline Event Queue Storage
 *
 * Manages persistent storage of queued analytics events when the device
 * is offline or before events can be transmitted to analytics platforms.
 *
 * Why: Prevents loss of analytics data when network is unavailable,
 * enabling offline-first applications to capture events and sync when ready.
 *
 * When: Called whenever events need to be queued, retrieved, or flushed.
 * Uses localStorage or IndexedDB as the backend.
 */

import type {
  StoredAnalyticsEvent,
  OfflineEventQueueMetadata,
  StorageOperationResult,
  StorageBackendInterface,
} from '../types/UserMeshStorageTypes';

/**
 * Default configuration values for offline storage.
 */
const DEFAULT_STORAGE_CONFIGURATION = {
  eventRetentionDaysCount: 30,
  maximumQueueSizeInBytes: 10 * 1024 * 1024, // 10 MB
  maximumRetryAttemptsPerEvent: 5,
  retryBackoffBaseDelayMilliseconds: 1000,
};

/**
 * UserMesh Offline Event Queue Storage
 *
 * Provides persistent queue storage for analytics events with automatic
 * cleanup, retry management, and encryption support.
 *
 * The storage system handles:
 * - Persisting events to localStorage or IndexedDB
 * - Managing queue size and storage quotas
 * - Tracking retry attempts and delivery failures
 * - Automatic cleanup of old or failed events
 * - Metadata tracking for queue health
 *
 * Usage:
 * ```typescript
 * const queueStorage = new UserMeshOfflineEventQueueStorage({
 *   preferredStorageBackend: 'indexeddb',
 *   shouldEncryptStoredEvents: true
 * });
 *
 * await queueStorage.initializeStorageBackend();
 * await queueStorage.persistEventToStorage(event);
 *
 * const events = await queueStorage.retrieveAllEventsFromStorage();
 * await queueStorage.deleteEventFromStorage(eventId);
 * ```
 */
export class UserMeshOfflineEventQueueStorage {
  /**
   * The underlying storage backend implementation.
   * Can be localStorage adapter or IndexedDB adapter.
   */
  private storageBackendImplementation: StorageBackendInterface;

  /**
   * Storage configuration (retention, quotas, retry limits).
   */
  private storageConfigurationSettings: {
    eventRetentionDaysCount: number;
    maximumQueueSizeInBytes: number;
    maximumRetryAttemptsPerEvent: number;
    retryBackoffBaseDelayMilliseconds: number;
    shouldEncryptStoredEvents: boolean;
  };

  /**
   * Storage key prefix to namespace UserMesh data in localStorage/IndexedDB.
   * Prevents conflicts with other applications using the same storage.
   */
  private readonly storageKeyNamespacePrefix = 'usermesh_offline_queue_';

  /**
   * Constructor for offline event queue storage.
   *
   * @param backendImplementation The storage backend to use (localStorage or IndexedDB)
   * @param configurationSettings Storage configuration (retention, quotas, etc.)
   */
  constructor(
    backendImplementation: StorageBackendInterface,
    configurationSettings?: {
      eventRetentionDaysCount?: number;
      maximumQueueSizeInBytes?: number;
      maximumRetryAttemptsPerEvent?: number;
      retryBackoffBaseDelayMilliseconds?: number;
      shouldEncryptStoredEvents?: boolean;
    }
  ) {
    this.storageBackendImplementation = backendImplementation;
    this.storageConfigurationSettings = {
      eventRetentionDaysCount:
        configurationSettings?.eventRetentionDaysCount ||
        DEFAULT_STORAGE_CONFIGURATION.eventRetentionDaysCount,
      maximumQueueSizeInBytes:
        configurationSettings?.maximumQueueSizeInBytes ||
        DEFAULT_STORAGE_CONFIGURATION.maximumQueueSizeInBytes,
      maximumRetryAttemptsPerEvent:
        configurationSettings?.maximumRetryAttemptsPerEvent ||
        DEFAULT_STORAGE_CONFIGURATION.maximumRetryAttemptsPerEvent,
      retryBackoffBaseDelayMilliseconds:
        configurationSettings?.retryBackoffBaseDelayMilliseconds ||
        DEFAULT_STORAGE_CONFIGURATION.retryBackoffBaseDelayMilliseconds,
      shouldEncryptStoredEvents: configurationSettings?.shouldEncryptStoredEvents || false,
    };
  }

  /**
   * Initialize the storage backend.
   *
   * Called once during SDK initialization to set up the storage system.
   * Also performs cleanup of expired events.
   *
   * @returns Storage operation result
   */
  async initializeStorageBackendAndCleanupExpiredData(): Promise<StorageOperationResult> {
    const initializationResult =
      await this.storageBackendImplementation.initializeStorageBackend();

    if (initializationResult.wasOperationSuccessful) {
      // Clean up any expired events from previous sessions
      await this.deleteExpiredEventsBasedOnRetentionPolicy();
    }

    return initializationResult;
  }

  /**
   * Queue an event for storage.
   *
   * Stores the event with retry metadata and checks queue size limits.
   *
   * Why: Saves analytics events to survive page reloads or network outages.
   * When: After event validation but before transmission attempt.
   *
   * @param eventToStore The event to persist
   * @returns Storage operation result
   */
  async queueEventForStorage(eventToStore: StoredAnalyticsEvent): Promise<StorageOperationResult> {
    // Check if adding this event would exceed queue size limit
    const currentQueueSizeBytes = await this.storageBackendImplementation.calculateCurrentQueueSizeInBytes();
    const estimatedEventSizeBytes = JSON.stringify(eventToStore).length;

    if (currentQueueSizeBytes + estimatedEventSizeBytes > this.storageConfigurationSettings.maximumQueueSizeInBytes) {
      return {
        wasOperationSuccessful: false,
        operationErrorMessage:
          `Queue storage limit exceeded (${this.storageConfigurationSettings.maximumQueueSizeInBytes} bytes). ` +
          `Consider increasing maximumQueueSizeInBytes or reducing event frequency.`,
      };
    }

    const storageResult = await this.storageBackendImplementation.persistEventToStorage(eventToStore);

    if (storageResult.wasOperationSuccessful) {
      // Update queue metadata to reflect the new event
      await this.updateQueueMetadataAfterNewEvent();
    }

    return storageResult;
  }

  /**
   * Retrieve all queued events.
   *
   * Loads all events from storage for batch transmission to analytics platforms.
   *
   * @returns Array of stored events
   */
  async retrieveAllQueuedEvents(): Promise<StoredAnalyticsEvent[]> {
    return this.storageBackendImplementation.retrieveAllEventsFromStorage();
  }

  /**
   * Retrieve events ready for transmission.
   *
   * Returns only events that have not exceeded max retry attempts
   * and are not waiting for backoff delay.
   *
   * @returns Array of events ready to send
   */
  async retrieveEventsReadyForTransmission(): Promise<StoredAnalyticsEvent[]> {
    const allEvents = await this.retrieveAllQueuedEvents();
    const currentTimeMilliseconds = Date.now();

    const readyEvents = allEvents.filter((storedEvent) => {
      // Don't retry events that exceeded max attempts
      if (
        storedEvent.deliveryAttemptCount >=
        this.storageConfigurationSettings.maximumRetryAttemptsPerEvent
      ) {
        return false;
      }

      // Check if event is still within backoff delay
      if (storedEvent.lastDeliveryAttemptTimestampMilliseconds) {
        const backoffDelayMilliseconds = this.calculateExponentialBackoffDelayMilliseconds(
          storedEvent.deliveryAttemptCount
        );
        const timeElapsedSinceLastAttemptMilliseconds =
          currentTimeMilliseconds - storedEvent.lastDeliveryAttemptTimestampMilliseconds;

        if (timeElapsedSinceLastAttemptMilliseconds < backoffDelayMilliseconds) {
          return false;
        }
      }

      return true;
    });

    return readyEvents;
  }

  /**
   * Mark an event as successfully delivered and remove it from storage.
   *
   * Called after an event has been successfully transmitted to an analytics platform.
   *
   * @param eventIdentifier The ID of the event that was delivered
   * @returns Storage operation result
   */
  async markEventAsDeliveredAndRemoveFromStorage(
    eventIdentifier: string
  ): Promise<StorageOperationResult> {
    const deleteResult = await this.storageBackendImplementation.deleteEventFromStorage(
      eventIdentifier
    );

    if (deleteResult.wasOperationSuccessful) {
      await this.updateQueueMetadataAfterEventRemoval();
    }

    return deleteResult;
  }

  /**
   * Mark multiple events as delivered and remove them from storage.
   *
   * @param eventIdentifiersToRemove Array of event IDs to remove
   * @returns Storage operation result
   */
  async markMultipleEventsAsDeliveredAndRemoveFromStorage(
    eventIdentifiersToRemove: string[]
  ): Promise<StorageOperationResult> {
    const deleteResult = await this.storageBackendImplementation.deleteMultipleEventsFromStorage(
      eventIdentifiersToRemove
    );

    if (deleteResult.wasOperationSuccessful) {
      await this.updateQueueMetadataAfterEventRemoval();
    }

    return deleteResult;
  }

  /**
   * Update an event's retry information after a failed delivery attempt.
   *
   * Increments the attempt count and updates the last attempt timestamp and error.
   *
   * @param eventIdentifier Event to update
   * @param lastDeliveryErrorMessage Error from the failed attempt
   * @returns Updated event or undefined if not found
   */
  async updateEventRetryMetadataAfterFailedDeliveryAttempt(
    eventIdentifier: string,
    lastDeliveryErrorMessage: string
  ): Promise<StoredAnalyticsEvent | undefined> {
    const eventToUpdate = await this.storageBackendImplementation.retrieveEventByIdentifier(
      eventIdentifier
    );

    if (!eventToUpdate) {
      return undefined;
    }

    eventToUpdate.deliveryAttemptCount += 1;
    eventToUpdate.lastDeliveryAttemptTimestampMilliseconds = Date.now();
    eventToUpdate.lastDeliveryErrorMessage = lastDeliveryErrorMessage;

    await this.storageBackendImplementation.persistEventToStorage(eventToUpdate);

    return eventToUpdate;
  }

  /**
   * Get queue metadata without loading all events.
   *
   * Useful for determining queue health and size without the overhead
   * of deserializing all events.
   *
   * @returns Queue metadata
   */
  async getQueueMetadata(): Promise<OfflineEventQueueMetadata> {
    return this.storageBackendImplementation.retrieveQueueMetadata();
  }

  /**
   * Clear all events from storage.
   *
   * Used during SDK shutdown or when user requests data deletion.
   *
   * @returns Storage operation result
   */
  async clearAllQueuedEvents(): Promise<StorageOperationResult> {
    return this.storageBackendImplementation.clearAllStorageData();
  }

  /**
   * Shutdown the storage backend gracefully.
   *
   * Called during SDK cleanup to close connections and free resources.
   *
   * @returns Storage operation result
   */
  async shutdownStorageBackend(): Promise<StorageOperationResult> {
    return this.storageBackendImplementation.shutdownStorageBackend();
  }

  /**
   * Delete events older than the configured retention period.
   *
   * Why: Prevents storage quota exhaustion and cleans up stale events.
   * When: Called during initialization and periodically during operation.
   */
  private async deleteExpiredEventsBasedOnRetentionPolicy(): Promise<void> {
    const retentionMilliseconds =
      this.storageConfigurationSettings.eventRetentionDaysCount * 24 * 60 * 60 * 1000;
    const currentTimeMilliseconds = Date.now();

    const allEvents = await this.retrieveAllQueuedEvents();
    const eventIdentifiersToDelete: string[] = [];

    for (const storedEvent of allEvents) {
      const eventAgeMilliseconds = currentTimeMilliseconds - storedEvent.storageTimestampMilliseconds;

      if (eventAgeMilliseconds > retentionMilliseconds) {
        eventIdentifiersToDelete.push(storedEvent.eventIdentifier);
      }
    }

    if (eventIdentifiersToDelete.length > 0) {
      await this.markMultipleEventsAsDeliveredAndRemoveFromStorage(eventIdentifiersToDelete);
    }
  }

  /**
   * Calculate exponential backoff delay for retry attempts.
   *
   * Uses formula: baseDelay * (2 ^ attemptNumber)
   * Prevents hammering failed endpoints with repeated requests.
   *
   * @param attemptCountSoFar Number of retry attempts already made
   * @returns Milliseconds to wait before next attempt
   */
  private calculateExponentialBackoffDelayMilliseconds(attemptCountSoFar: number): number {
    const baseDelayMilliseconds =
      this.storageConfigurationSettings.retryBackoffBaseDelayMilliseconds;
    const exponentialMultiplier = Math.pow(2, attemptCountSoFar);
    const maxBackoffMilliseconds = 60 * 60 * 1000; // Max 1 hour between retries

    const calculatedBackoffMilliseconds = baseDelayMilliseconds * exponentialMultiplier;
    return Math.min(calculatedBackoffMilliseconds, maxBackoffMilliseconds);
  }

  /**
   * Update queue metadata after a new event is added.
   */
  private async updateQueueMetadataAfterNewEvent(): Promise<void> {
    const allEvents = await this.retrieveAllQueuedEvents();
    const metadata: OfflineEventQueueMetadata = {
      totalEventCountInQueue: allEvents.length,
      totalQueueSizeInBytes: await this.storageBackendImplementation.calculateCurrentQueueSizeInBytes(),
      lastFlushTimestampMilliseconds: Date.now(),
      metadataLastUpdatedTimestampMilliseconds: Date.now(),
      hasUnsentEvents: allEvents.length > 0,
      abandonedEventCount: allEvents.filter(
        (e) =>
          e.deliveryAttemptCount >=
          this.storageConfigurationSettings.maximumRetryAttemptsPerEvent
      ).length,
    };

    await this.storageBackendImplementation.updateQueueMetadata(metadata);
  }

  /**
   * Update queue metadata after events are removed.
   */
  private async updateQueueMetadataAfterEventRemoval(): Promise<void> {
    await this.updateQueueMetadataAfterNewEvent();
  }
}
