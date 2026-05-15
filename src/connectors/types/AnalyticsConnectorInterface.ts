/**
 * Analytics Connector Interface
 *
 * All analytics platform integrations (GA4, PostHog, Mixpanel, Clarity, Custom)
 * must implement this interface. This ensures a consistent contract for how
 * UserMesh communicates with different analytics backends.
 *
 * Why this exists: Different analytics platforms have different APIs, authentication
 * methods, and data formats. This interface abstracts those differences so the SDK
 * doesn't need to know about platform-specific implementation details.
 *
 * When to implement: Every time you add support for a new analytics platform.
 *
 * How it works: The UserMesh SDK Client instantiates the appropriate connectors
 * based on the configuration, then calls these methods to transmit events and
 * user identification data.
 */

import type {
  AnalyticsEventRecord,
  EventBatch,
  UserIdentificationProfile,
} from '../../types/UserMeshEventTypes';

/**
 * Result of a connector operation (send event, identify user, etc).
 * Includes success status and optional error details for debugging.
 */
export interface ConnectorOperationResult {
  /**
   * Whether the operation succeeded.
   * True means the platform accepted the data.
   * False means there was an error (network, validation, etc).
   */
  wasOperationSuccessful: boolean;

  /**
   * Human-readable status message describing the result.
   * Examples: "Event batch sent successfully (5 events)",
   * "Failed to send batch: Connection timeout",
   * "User identified with 12 custom traits"
   */
  operationStatusMessage: string;

  /**
   * If the operation failed, this contains the error details.
   * Undefined if wasOperationSuccessful is true.
   *
   * Used for:
   * - Deciding if the SDK should retry this batch
   * - Logging for debugging
   * - Metrics tracking (how many failures per platform)
   */
  underlyingErrorIfAny?: Error;

  /**
   * Timestamp when this operation completed.
   * Used for monitoring and debugging.
   */
  operationCompletionTimestampMilliseconds: number;

  /**
   * Platform-specific metadata that may be useful for debugging.
   * For example:
   * - GA4: {"batchId": "123abc", "eventCount": 5}
   * - PostHog: {"requestId": "req_123", "queuedEvents": 42}
   * - Custom endpoint: {"statusCode": 202, "xRequestId": "x-123"}
   */
  platformSpecificMetadata?: Record<string, unknown>;
}

/**
 * Base interface that all analytics connectors must implement.
 *
 * Each connector wraps a specific analytics platform's API and translates
 * UserMesh's universal event format into that platform's expected format.
 */
export interface AnalyticsConnectorInterface {
  /**
   * Initialize the connector for this analytics platform.
   *
   * This is called once during SDK initialization. Use it to:
   * - Load platform SDKs (if needed)
   * - Validate platform credentials
   * - Set up any platform-specific state or listeners
   *
   * Why separate from constructor: Initialization may be async (loading SDKs,
   * validating credentials over the network, etc).
   *
   * When: Called during UserMeshAnalyticsSdkClient.initializeUserMeshAnalyticsSdk()
   *
   * @throws Error if initialization fails
   */
  initializeAnalyticsConnector(): Promise<void>;

  /**
   * Send a batch of events to this analytics platform.
   *
   * The batch may contain 1-N events. This method should:
   * 1. Transform each event from UserMesh format to the platform's format
   * 2. Transmit the transformed events to the platform
   * 3. Handle any platform-specific validation or constraints
   *
   * Why a batch: Sending one event at a time creates network overhead.
   * Batching is more efficient. Most platforms support batch endpoints.
   *
   * When: Called whenever the SDK needs to flush queued events.
   *
   * @param eventBatch - Batch object containing events and metadata
   * @returns Operation result indicating success/failure and any error details
   *
   * Important: This should NOT throw exceptions. Instead, return
   * wasOperationSuccessful=false with error details in underlyingErrorIfAny.
   * The SDK uses the return value to decide retry behavior.
   */
  transmitEventBatchToAnalyticsPlatform(eventBatch: EventBatch): Promise<ConnectorOperationResult>;

  /**
   * Identify a user on this analytics platform.
   *
   * Called when the user authenticates or their profile is updated.
   * Sends the user's ID and traits to the platform so they can be
   * associated with all future events from this user.
   *
   * Typical usage (varies by platform):
   * - GA4: Sets user_id and user properties
   * - PostHog: Calls identify() with distinct_id and properties
   * - Mixpanel: Calls identify() with user_id and sets properties
   * - Clarity: Sets user ID in session
   *
   * When: Called after identifyCurrentUser() or updateUserTraits() in the SDK.
   *
   * @param userProfile - The user's profile with ID and traits
   * @returns Operation result indicating success/failure
   *
   * Important: This should NOT throw exceptions. Return result with
   * wasOperationSuccessful=false if identification fails.
   */
  identifyUserOnAnalyticsPlatform(
    userProfile: UserIdentificationProfile
  ): Promise<ConnectorOperationResult>;

  /**
   * Track a single page view event on this platform.
   *
   * Some analytics platforms have special handling for page views
   * (GA4's "page_view", PostHog's "$pageview", etc).
   *
   * This is called by the SDK's trackPageView() method.
   * Most of the time, transmitEventBatchToAnalyticsPlatform handles events,
   * but page views may have special treatment on some platforms.
   *
   * When: Called during SDK's trackPageView() method.
   *
   * @param pageUrl - The URL of the page that was viewed
   * @param pageTitle - Optional title of the page
   * @param additionalPageProperties - Optional custom properties for this page view
   * @returns Operation result
   */
  trackPageViewEventOnAnalyticsPlatform(
    pageUrl: string,
    pageTitle?: string,
    additionalPageProperties?: Record<string, unknown>
  ): Promise<ConnectorOperationResult>;

  /**
   * Check if this connector is currently connected and ready to send data.
   *
   * Used by the SDK to determine if this platform is available.
   * For example, if the network is offline, this might return false.
   *
   * When: Called before transmitting events to decide whether to queue
   * locally instead of sending immediately.
   *
   * @returns true if the connector is connected and ready to send, false otherwise
   */
  isConnectorCurrentlyReady(): Promise<boolean>;

  /**
   * Gracefully shut down this connector.
   *
   * Called during SDK cleanup (on logout, page unload, destroy).
   * Use this to:
   * - Send any remaining buffered events
   * - Close platform SDKs cleanly
   * - Clean up event listeners
   * - Flush any pending timers
   *
   * When: Called during UserMeshAnalyticsSdkClient.destroyUserMeshSdkAndCleanup()
   *
   * Important: This should be fast and not block for long periods.
   * The page may be unloading, so you only have a few seconds.
   */
  shutdownAnalyticsConnector(): Promise<void>;

  /**
   * Get the platform name that this connector handles.
   *
   * Used for logging, debugging, and configuration validation.
   *
   * Should return values like:
   * - "google_analytics_4"
   * - "posthog"
   * - "mixpanel"
   * - "clarity"
   * - "custom_endpoint"
   *
   * When: Called internally by the SDK for logging and platform identification.
   *
   * @returns The unique name of this analytics platform
   */
  getPlatformName(): string;
}
