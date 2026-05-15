/**
 * UserMesh LocalStorage Adapter
 *
 * Browser localStorage implementation of the StorageBackendInterface.
 * Provides a simple, synchronous key-value store for offline event persistence.
 *
 * Why: localStorage is universally available in browsers and requires no setup.
 * When: Used for applications without IndexedDB support or for smaller event queues.
 *
 * Limitations:
 * - ~5-10 MB quota (varies by browser)
 * - Synchronous operations (blocks rendering)
 * - Lost on browser clear-all-data
 * - Slower for large datasets than IndexedDB
 */

import type {
  StoredAnalyticsEvent,
  OfflineEventQueueMetadata,
  StorageOperationResult,
  StorageBackendInterface,
} from '../types/UserMeshStorageTypes';

/**
 * UserMesh LocalStorage Adapter
 *
 * Implements StorageBackendInterface using browser's window.localStorage.
 *
 * This adapter treats localStorage as a simple key-value store where:
 * - Each event is stored with key format: "usermesh_event_{eventId}"
 * - Queue metadata is stored with key: "usermesh_queue_metadata"
 *
 * Usage:
 * ```typescript
 * const localStorageAdapter = new UserMeshLocalStorageAdapter();
 * await localStorageAdapter.initializeStorageBackend();
 * await localStorageAdapter.persistEventToStorage(event);
 * ```
 */
export class UserMeshLocalStorageAdapter implements StorageBackendInterface {
  /**
   * Prefix for all UserMesh keys in localStorage.
   * Prevents conflicts with other applications.
   */
  private readonly storageKeyPrefix = 'usermesh_offline_queue_';

  /**
   * Key where queue metadata is stored.
   */
  private readonly queueMetadataStorageKey = `${this.storageKeyPrefix}metadata`;

  /**
   * Whether the adapter has been initialized.
   */
  private isAdapterInitialized = false;

  /**
   * Whether localStorage is available in the current environment.
   */
  private isLocalStorageAvailable = false;

  /**
   * Initialize the localStorage adapter.
   *
   * Checks if localStorage is available and accessible.
   * Initializes metadata if not already present.
   *
   * Why: Ensures localStorage is working before using it.
   * When: Called during SDK initialization.
   *
   * @returns Storage operation result
   */
  async initializeStorageBackend(): Promise<StorageOperationResult> {
    try {
      this.isLocalStorageAvailable = this.checkIfLocalStorageIsAvailable();

      if (!this.isLocalStorageAvailable) {
        return {
          wasOperationSuccessful: false,
          operationErrorMessage:
            'localStorage is not available in this environment. ' +
            'Consider using IndexedDB adapter or memory storage for offline persistence.',
        };
      }

      // Initialize metadata if it doesn't exist
      const metadataExists = this.doesStorageKeyExistSynchronous(this.queueMetadataStorageKey);
      if (!metadataExists) {
        const initialMetadata: OfflineEventQueueMetadata = {
          totalEventCountInQueue: 0,
          totalQueueSizeInBytes: 0,
          lastFlushTimestampMilliseconds: Date.now(),
          metadataLastUpdatedTimestampMilliseconds: Date.now(),
          hasUnsentEvents: false,
          abandonedEventCount: 0,
        };

        this.setItemInLocalStorageSynchronous(
          this.queueMetadataStorageKey,
          JSON.stringify(initialMetadata)
        );
      }

      this.isAdapterInitialized = true;

      return {
        wasOperationSuccessful: true,
        operationContextInformation: {
          message: 'localStorage adapter initialized successfully',
          estimatedQuotaBytes: 5 * 1024 * 1024, // ~5 MB typical quota
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        wasOperationSuccessful: false,
        operationErrorMessage: `Failed to initialize localStorage adapter: ${errorMessage}`,
      };
    }
  }

  /**
   * Save an event to localStorage.
   *
   * @param storedEvent The event to persist
   * @returns Storage operation result
   */
  async persistEventToStorage(storedEvent: StoredAnalyticsEvent): Promise<StorageOperationResult> {
    if (!this.isAdapterInitialized) {
      return {
        wasOperationSuccessful: false,
        operationErrorMessage: 'Storage adapter not initialized. Call initializeStorageBackend() first.',
      };
    }

    try {
      const storageKey = this.generateEventStorageKey(storedEvent.eventIdentifier);
      const serializedEvent = JSON.stringify(storedEvent);

      // Check quota before writing
      if (!this.canStoreDataOfSize(serializedEvent.length)) {
        return {
          wasOperationSuccessful: false,
          operationErrorMessage:
            'localStorage quota exceeded. Event not stored. Consider enabling encryption to reduce size.',
        };
      }

      this.setItemInLocalStorageSynchronous(storageKey, serializedEvent);

      return {
        wasOperationSuccessful: true,
        operationContextInformation: {
          eventId: storedEvent.eventIdentifier,
          storageSizeBytes: serializedEvent.length,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        wasOperationSuccessful: false,
        operationErrorMessage: `Failed to persist event to localStorage: ${errorMessage}`,
      };
    }
  }

  /**
   * Retrieve all events from localStorage.
   *
   * @returns Array of stored events
   */
  async retrieveAllEventsFromStorage(): Promise<StoredAnalyticsEvent[]> {
    if (!this.isAdapterInitialized) {
      return [];
    }

    try {
      const allStoredEvents: StoredAnalyticsEvent[] = [];

      if (typeof window === 'undefined' || !window.localStorage) {
        return allStoredEvents;
      }

      for (let itemIndex = 0; itemIndex < window.localStorage.length; itemIndex += 1) {
        const storageKey = window.localStorage.key(itemIndex);

        if (
          storageKey &&
          storageKey.startsWith(this.storageKeyPrefix) &&
          !storageKey.endsWith('_metadata')
        ) {
          try {
            const serializedEvent = window.localStorage.getItem(storageKey);
            if (serializedEvent) {
              const parsedEvent = JSON.parse(serializedEvent) as StoredAnalyticsEvent;
              allStoredEvents.push(parsedEvent);
            }
          } catch {
            // Skip events that fail to parse
            continue;
          }
        }
      }

      return allStoredEvents;
    } catch {
      return [];
    }
  }

  /**
   * Retrieve a specific event by its identifier.
   *
   * @param eventIdentifier The ID of the event to retrieve
   * @returns The stored event or undefined if not found
   */
  async retrieveEventByIdentifier(
    eventIdentifier: string
  ): Promise<StoredAnalyticsEvent | undefined> {
    if (!this.isAdapterInitialized) {
      return undefined;
    }

    try {
      const storageKey = this.generateEventStorageKey(eventIdentifier);
      const serializedEvent = this.getItemFromLocalStorageSynchronous(storageKey);

      if (!serializedEvent) {
        return undefined;
      }

      return JSON.parse(serializedEvent) as StoredAnalyticsEvent;
    } catch {
      return undefined;
    }
  }

  /**
   * Delete an event from storage.
   *
   * @param eventIdentifier The ID of the event to delete
   * @returns Storage operation result
   */
  async deleteEventFromStorage(eventIdentifier: string): Promise<StorageOperationResult> {
    if (!this.isAdapterInitialized) {
      return {
        wasOperationSuccessful: false,
        operationErrorMessage: 'Storage adapter not initialized',
      };
    }

    try {
      const storageKey = this.generateEventStorageKey(eventIdentifier);
      this.removeItemFromLocalStorageSynchronous(storageKey);

      return {
        wasOperationSuccessful: true,
        operationContextInformation: { deletedEventId: eventIdentifier },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        wasOperationSuccessful: false,
        operationErrorMessage: `Failed to delete event from localStorage: ${errorMessage}`,
      };
    }
  }

  /**
   * Delete multiple events by their identifiers.
   *
   * @param eventIdentifiers Array of event IDs to delete
   * @returns Storage operation result
   */
  async deleteMultipleEventsFromStorage(
    eventIdentifiers: string[]
  ): Promise<StorageOperationResult> {
    if (!this.isAdapterInitialized) {
      return {
        wasOperationSuccessful: false,
        operationErrorMessage: 'Storage adapter not initialized',
      };
    }

    try {
      let deletedCount = 0;

      for (const eventIdentifier of eventIdentifiers) {
        const storageKey = this.generateEventStorageKey(eventIdentifier);
        this.removeItemFromLocalStorageSynchronous(storageKey);
        deletedCount += 1;
      }

      return {
        wasOperationSuccessful: true,
        operationContextInformation: { deletedEventCount: deletedCount },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        wasOperationSuccessful: false,
        operationErrorMessage: `Failed to delete multiple events: ${errorMessage}`,
      };
    }
  }

  /**
   * Get queue metadata.
   *
   * @returns Queue metadata
   */
  async retrieveQueueMetadata(): Promise<OfflineEventQueueMetadata> {
    if (!this.isAdapterInitialized) {
      return {
        totalEventCountInQueue: 0,
        totalQueueSizeInBytes: 0,
        lastFlushTimestampMilliseconds: Date.now(),
        metadataLastUpdatedTimestampMilliseconds: Date.now(),
        hasUnsentEvents: false,
        abandonedEventCount: 0,
      };
    }

    try {
      const serializedMetadata = this.getItemFromLocalStorageSynchronous(
        this.queueMetadataStorageKey
      );

      if (!serializedMetadata) {
        return {
          totalEventCountInQueue: 0,
          totalQueueSizeInBytes: 0,
          lastFlushTimestampMilliseconds: Date.now(),
          metadataLastUpdatedTimestampMilliseconds: Date.now(),
          hasUnsentEvents: false,
          abandonedEventCount: 0,
        };
      }

      return JSON.parse(serializedMetadata) as OfflineEventQueueMetadata;
    } catch {
      return {
        totalEventCountInQueue: 0,
        totalQueueSizeInBytes: 0,
        lastFlushTimestampMilliseconds: Date.now(),
        metadataLastUpdatedTimestampMilliseconds: Date.now(),
        hasUnsentEvents: false,
        abandonedEventCount: 0,
      };
    }
  }

  /**
   * Update queue metadata.
   *
   * @param metadata The updated metadata
   * @returns Storage operation result
   */
  async updateQueueMetadata(metadata: OfflineEventQueueMetadata): Promise<StorageOperationResult> {
    if (!this.isAdapterInitialized) {
      return {
        wasOperationSuccessful: false,
        operationErrorMessage: 'Storage adapter not initialized',
      };
    }

    try {
      const serializedMetadata = JSON.stringify(metadata);
      this.setItemInLocalStorageSynchronous(this.queueMetadataStorageKey, serializedMetadata);

      return {
        wasOperationSuccessful: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        wasOperationSuccessful: false,
        operationErrorMessage: `Failed to update queue metadata: ${errorMessage}`,
      };
    }
  }

  /**
   * Clear all UserMesh data from localStorage.
   *
   * @returns Storage operation result
   */
  async clearAllStorageData(): Promise<StorageOperationResult> {
    if (!this.isAdapterInitialized) {
      return {
        wasOperationSuccessful: false,
        operationErrorMessage: 'Storage adapter not initialized',
      };
    }

    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return {
          wasOperationSuccessful: false,
          operationErrorMessage: 'localStorage not available',
        };
      }

      const keysToDelete: string[] = [];

      for (let itemIndex = 0; itemIndex < window.localStorage.length; itemIndex += 1) {
        const storageKey = window.localStorage.key(itemIndex);
        if (storageKey && storageKey.startsWith(this.storageKeyPrefix)) {
          keysToDelete.push(storageKey);
        }
      }

      for (const keyToDelete of keysToDelete) {
        window.localStorage.removeItem(keyToDelete);
      }

      return {
        wasOperationSuccessful: true,
        operationContextInformation: { clearedKeyCount: keysToDelete.length },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        wasOperationSuccessful: false,
        operationErrorMessage: `Failed to clear storage: ${errorMessage}`,
      };
    }
  }

  /**
   * Calculate current queue size in bytes.
   *
   * @returns Total size of all stored events in bytes
   */
  async calculateCurrentQueueSizeInBytes(): Promise<number> {
    if (!this.isAdapterInitialized) {
      return 0;
    }

    try {
      let totalSizeBytes = 0;

      if (typeof window === 'undefined' || !window.localStorage) {
        return totalSizeBytes;
      }

      for (let itemIndex = 0; itemIndex < window.localStorage.length; itemIndex += 1) {
        const storageKey = window.localStorage.key(itemIndex);

        if (
          storageKey &&
          storageKey.startsWith(this.storageKeyPrefix) &&
          !storageKey.endsWith('_metadata')
        ) {
          const storageValue = window.localStorage.getItem(storageKey);
          if (storageValue) {
            totalSizeBytes += storageValue.length;
          }
        }
      }

      return totalSizeBytes;
    } catch {
      return 0;
    }
  }

  /**
   * Check if a storage key exists.
   *
   * @param storageKey The key to check
   * @returns Whether the key exists
   */
  async doesStorageKeyExist(storageKey: string): Promise<boolean> {
    try {
      const value = this.getItemFromLocalStorageSynchronous(storageKey);
      return value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Shutdown the storage adapter gracefully.
   *
   * @returns Storage operation result
   */
  async shutdownStorageBackend(): Promise<StorageOperationResult> {
    this.isAdapterInitialized = false;

    return {
      wasOperationSuccessful: true,
      operationContextInformation: {
        message: 'localStorage adapter shutdown complete',
      },
    };
  }

  /**
   * Generate a storage key for an event based on its identifier.
   *
   * @param eventIdentifier The event ID
   * @returns Full storage key
   */
  private generateEventStorageKey(eventIdentifier: string): string {
    return `${this.storageKeyPrefix}event_${eventIdentifier}`;
  }

  /**
   * Check if localStorage is available and accessible.
   *
   * @returns Whether localStorage is available
   */
  private checkIfLocalStorageIsAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }

      // Try to access localStorage
      const testKey = '__usermesh_storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if we have enough space to store data.
   *
   * @param dataLengthBytes Size of data to store
   * @returns Whether we can store the data
   */
  private canStoreDataOfSize(dataLengthBytes: number): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }

      // Estimate available space (localStorage is usually 5-10 MB)
      const estimatedQuotaBytes = 10 * 1024 * 1024;
      const currentUsageBytes = this.estimateCurrentStorageUsageBytes();

      return currentUsageBytes + dataLengthBytes < estimatedQuotaBytes;
    } catch {
      return false;
    }
  }

  /**
   * Estimate current storage usage in bytes.
   *
   * @returns Approximate current usage in bytes
   */
  private estimateCurrentStorageUsageBytes(): number {
    try {
      let totalBytes = 0;

      if (typeof window === 'undefined' || !window.localStorage) {
        return totalBytes;
      }

      for (let itemIndex = 0; itemIndex < window.localStorage.length; itemIndex += 1) {
        const storageKey = window.localStorage.key(itemIndex);
        const storageValue = window.localStorage.getItem(storageKey || '');

        if (storageKey && storageValue) {
          totalBytes += storageKey.length + storageValue.length;
        }
      }

      return totalBytes;
    } catch {
      return 0;
    }
  }

  /**
   * Safe wrapper around localStorage.getItem.
   *
   * @param key The key to retrieve
   * @returns The value or null if not found
   */
  private getItemFromLocalStorageSynchronous(key: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    return window.localStorage.getItem(key);
  }

  /**
   * Safe wrapper around localStorage.setItem.
   *
   * @param key The key to set
   * @param value The value to store
   */
  private setItemInLocalStorageSynchronous(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  }

  /**
   * Safe wrapper around localStorage.removeItem.
   *
   * @param key The key to remove
   */
  private removeItemFromLocalStorageSynchronous(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  }

  /**
   * Safe check for key existence.
   *
   * @param key The key to check
   * @returns Whether the key exists
   */
  private doesStorageKeyExistSynchronous(key: string): boolean {
    return this.getItemFromLocalStorageSynchronous(key) !== null;
  }
}
