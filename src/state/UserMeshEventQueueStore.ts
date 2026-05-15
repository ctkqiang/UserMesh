/**
 * UserMesh Event Queue Store
 *
 * Zustand store for managing in-memory event queue state.
 * Holds events waiting to be transmitted to analytics platforms.
 *
 * Why: Zustand provides lightweight, reactive state management for the
 * event queue without the overhead of Redux or Context API.
 *
 * When: Used by UserMeshAnalyticsSdkClient to track queued events,
 * flush batches, and manage retry state.
 */

import { create } from 'zustand';
import type { AnalyticsEventRecord } from '../types/UserMeshEventTypes';

/**
 * Represents a queued event with metadata about its transmission status.
 */
export interface QueuedEventWithMetadata {
  /**
   * The analytics event data.
   */
  eventData: AnalyticsEventRecord;

  /**
   * When this event was queued.
   */
  queuedAtTimestampMilliseconds: number;

  /**
   * How many times we've attempted to transmit this event.
   */
  transmissionAttemptCount: number;

  /**
   * Whether this event is currently being transmitted.
   */
  isCurrentlyBeingTransmitted: boolean;

  /**
   * Error message from last failed transmission (if any).
   */
  lastTransmissionErrorMessage?: string;
}

/**
 * The UserMesh event queue store state.
 */
export interface UserMeshEventQueueStoreState {
  /**
   * Queue of events pending transmission.
   */
  eventQueuePendingTransmission: QueuedEventWithMetadata[];

  /**
   * Number of events currently being transmitted.
   */
  eventCountCurrentlyTransmitting: number;

  /**
   * Timestamp of the last queue flush operation.
   */
  lastQueueFlushTimestampMilliseconds: number;

  /**
   * Whether automatic queue flushing is currently enabled.
   */
  isAutomaticQueueFlushingEnabled: boolean;

  /**
   * Add an event to the queue.
   */
  addEventToQueue(event: AnalyticsEventRecord): void;

  /**
   * Remove an event from the queue (after successful transmission).
   */
  removeEventFromQueue(eventIdentifier: string): void;

  /**
   * Remove multiple events from the queue.
   */
  removeMultipleEventsFromQueue(eventIdentifiers: string[]): void;

  /**
   * Get all queued events.
   */
  getAllQueuedEvents(): QueuedEventWithMetadata[];

  /**
   * Get a specific queued event by its identifier.
   */
  getQueuedEventByIdentifier(eventIdentifier: string): QueuedEventWithMetadata | undefined;

  /**
   * Mark an event as currently being transmitted.
   */
  markEventAsTransmitting(eventIdentifier: string): void;

  /**
   * Mark an event as successfully transmitted.
   */
  markEventAsSuccessfullyTransmitted(eventIdentifier: string): void;

  /**
   * Mark an event as failed transmission and increment retry count.
   */
  markEventAsFailedTransmission(eventIdentifier: string, errorMessage: string): void;

  /**
   * Get the current queue size.
   */
  getCurrentQueueSize(): number;

  /**
   * Clear all events from the queue.
   */
  clearEntireQueue(): void;

  /**
   * Update the last flush timestamp.
   */
  updateLastFlushTimestamp(): void;

  /**
   * Enable or disable automatic queue flushing.
   */
  setAutomaticFlushingEnabled(isEnabled: boolean): void;

  /**
   * Increment the count of transmitting events.
   */
  incrementTransmittingEventCount(): void;

  /**
   * Decrement the count of transmitting events.
   */
  decrementTransmittingEventCount(): void;
}

/**
 * Create the UserMesh event queue store.
 *
 * This store manages the in-memory event queue state. Events are added
 * to this queue when recorded, and removed after successful transmission
 * to analytics platforms.
 *
 * Usage:
 * ```typescript
 * const store = useUserMeshEventQueueStore();
 * store.addEventToQueue(event);
 * const allEvents = store.getAllQueuedEvents();
 * store.removeEventFromQueue(eventId);
 * ```
 */
export const useUserMeshEventQueueStore = create<UserMeshEventQueueStoreState>((set, get) => ({
  eventQueuePendingTransmission: [],
  eventCountCurrentlyTransmitting: 0,
  lastQueueFlushTimestampMilliseconds: Date.now(),
  isAutomaticQueueFlushingEnabled: true,

  addEventToQueue: (event: AnalyticsEventRecord) => {
    set((state) => ({
      eventQueuePendingTransmission: [
        ...state.eventQueuePendingTransmission,
        {
          eventData: event,
          queuedAtTimestampMilliseconds: Date.now(),
          transmissionAttemptCount: 0,
          isCurrentlyBeingTransmitted: false,
        },
      ],
    }));
  },

  removeEventFromQueue: (eventIdentifier: string) => {
    set((state) => ({
      eventQueuePendingTransmission: state.eventQueuePendingTransmission.filter(
        (queuedEvent) => queuedEvent.eventData.uniqueEventIdentifier !== eventIdentifier
      ),
    }));
  },

  removeMultipleEventsFromQueue: (eventIdentifiers: string[]) => {
    const identifierSet = new Set(eventIdentifiers);

    set((state) => ({
      eventQueuePendingTransmission: state.eventQueuePendingTransmission.filter(
        (queuedEvent) => !identifierSet.has(queuedEvent.eventData.uniqueEventIdentifier)
      ),
    }));
  },

  getAllQueuedEvents: () => {
    return get().eventQueuePendingTransmission;
  },

  getQueuedEventByIdentifier: (eventIdentifier: string) => {
    return get().eventQueuePendingTransmission.find(
      (queuedEvent) => queuedEvent.eventData.uniqueEventIdentifier === eventIdentifier
    );
  },

  markEventAsTransmitting: (eventIdentifier: string) => {
    set((state) => ({
      eventQueuePendingTransmission: state.eventQueuePendingTransmission.map((queuedEvent) =>
        queuedEvent.eventData.uniqueEventIdentifier === eventIdentifier
          ? { ...queuedEvent, isCurrentlyBeingTransmitted: true }
          : queuedEvent
      ),
    }));
  },

  markEventAsSuccessfullyTransmitted: (eventIdentifier: string) => {
    set((state) => ({
      eventQueuePendingTransmission: state.eventQueuePendingTransmission.map((queuedEvent) =>
        queuedEvent.eventData.uniqueEventIdentifier === eventIdentifier
          ? {
              ...queuedEvent,
              isCurrentlyBeingTransmitted: false,
              transmissionAttemptCount: queuedEvent.transmissionAttemptCount + 1,
            }
          : queuedEvent
      ),
    }));
  },

  markEventAsFailedTransmission: (eventIdentifier: string, errorMessage: string) => {
    set((state) => ({
      eventQueuePendingTransmission: state.eventQueuePendingTransmission.map((queuedEvent) =>
        queuedEvent.eventData.uniqueEventIdentifier === eventIdentifier
          ? {
              ...queuedEvent,
              isCurrentlyBeingTransmitted: false,
              transmissionAttemptCount: queuedEvent.transmissionAttemptCount + 1,
              lastTransmissionErrorMessage: errorMessage,
            }
          : queuedEvent
      ),
    }));
  },

  getCurrentQueueSize: () => {
    return get().eventQueuePendingTransmission.length;
  },

  clearEntireQueue: () => {
    set({
      eventQueuePendingTransmission: [],
    });
  },

  updateLastFlushTimestamp: () => {
    set({
      lastQueueFlushTimestampMilliseconds: Date.now(),
    });
  },

  setAutomaticFlushingEnabled: (isEnabled: boolean) => {
    set({
      isAutomaticQueueFlushingEnabled: isEnabled,
    });
  },

  incrementTransmittingEventCount: () => {
    set((state) => ({
      eventCountCurrentlyTransmitting: state.eventCountCurrentlyTransmitting + 1,
    }));
  },

  decrementTransmittingEventCount: () => {
    set((state) => ({
      eventCountCurrentlyTransmitting: Math.max(0, state.eventCountCurrentlyTransmitting - 1),
    }));
  },
}));
